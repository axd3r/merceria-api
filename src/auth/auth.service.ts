import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { hashPassword, verifyPassword, DUMMY_HASH } from './password';
import { AuthUser } from './auth.decorators';
import { ChangePasswordDto, CreateUserDto, UpdateUserDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(private readonly db: DataSource) {}
  digest(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  async limit(key: string, maximum: number) {
    const [bucket] = await this.db.query(
      `INSERT INTO auth_limits (key, attempts, expires_at)
      VALUES ($1, 1, NOW() + INTERVAL '15 minutes') ON CONFLICT (key) DO UPDATE SET
      attempts = CASE WHEN auth_limits.expires_at <= NOW() THEN 1 ELSE auth_limits.attempts + 1 END,
      expires_at = CASE WHEN auth_limits.expires_at <= NOW() THEN NOW() + INTERVAL '15 minutes' ELSE auth_limits.expires_at END
      RETURNING attempts`,
      [this.digest(key)],
    );
    if (bucket.attempts > maximum)
      throw new HttpException(
        'Too many attempts. Try again in 15 minutes.',
        429,
      );
  }

  async login(email: string, password: string, ip: string) {
    await this.limit(`ip:${ip}`, 60);
    await this.limit(`email:${email}`, 10);
    const [user] = await this.db.query(
      'SELECT * FROM auth_users WHERE email = $1',
      [email],
    );
    const valid = await verifyPassword(
      password,
      user?.password_hash ?? DUMMY_HASH,
    );
    if (!user || !valid || !user.active)
      throw new UnauthorizedException('Invalid email or password');
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
    // Lock serializes login with password resets/deactivation.
    await this.db.transaction(async (manager) => {
      const [current] = await manager.query(
        'SELECT * FROM auth_users WHERE id = $1 FOR UPDATE',
        [user.id],
      );
      if (!current.active || current.password_hash !== user.password_hash)
        throw new UnauthorizedException('Invalid email or password');
      await manager.query(
        'INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES ($1,$2,$3)',
        [this.digest(token), user.id, expiresAt],
      );
    });
    await this.db.query('DELETE FROM auth_sessions WHERE expires_at <= NOW()');
    await this.db.query(
      'DELETE FROM auth_limits WHERE expires_at <= NOW() OR key = $1',
      [this.digest(`email:${email}`)],
    );
    return {
      accessToken: token,
      tokenType: 'Bearer',
      expiresAt,
      user: this.safe(user),
    };
  }

  safe(user: AuthUser): AuthUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      active: user.active,
    };
  }
  async authenticate(token: string): Promise<AuthUser> {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new UnauthorizedException();
    const [user] = await this.db.query(
      `SELECT u.id, u.email, u.name, u.role, u.active FROM auth_sessions s
      JOIN auth_users u ON u.id = s.user_id WHERE s.token_hash = $1 AND s.expires_at > NOW() AND u.active = true`,
      [this.digest(token)],
    );
    if (!user) throw new UnauthorizedException('Session expired or invalid');
    return this.safe(user);
  }
  async logout(token: string) {
    await this.db.query('DELETE FROM auth_sessions WHERE token_hash = $1', [
      this.digest(token),
    ]);
    return { message: 'Signed out' };
  }
  async changePassword(id: string, dto: ChangePasswordDto) {
    await this.limit(`password:${id}`, 10);
    const encoded = await hashPassword(dto.newPassword);
    await this.db.transaction(async (manager) => {
      const [user] = await manager.query(
        'SELECT * FROM auth_users WHERE id = $1 FOR UPDATE',
        [id],
      );
      if (
        !user ||
        !(await verifyPassword(dto.currentPassword, user.password_hash))
      )
        throw new UnauthorizedException('Invalid current password');
      await manager.query(
        'UPDATE auth_users SET password_hash = $1 WHERE id = $2',
        [encoded, id],
      );
      await manager.query('DELETE FROM auth_sessions WHERE user_id = $1', [id]);
    });
    return { message: 'Password changed. Sign in again.' };
  }
  async createUser(dto: CreateUserDto) {
    const passwordHash = await hashPassword(dto.password);
    try {
      const [user] = await this.db.query(
        `INSERT INTO auth_users (id,email,name,role,password_hash)
        VALUES ($1,$2,$3,$4,$5) RETURNING id,email,name,role,active`,
        [randomUUID(), dto.email, dto.name.trim(), dto.role, passwordHash],
      );
      return user;
    } catch (error) {
      if (error.code === '23505')
        throw new ConflictException('Email already registered');
      throw error;
    }
  }
  listUsers() {
    return this.db.query(
      'SELECT id,email,name,role,active,created_at FROM auth_users ORDER BY created_at',
    );
  }
  async updateUser(id: string, dto: UpdateUserDto, actorId: string) {
    if (id === actorId)
      throw new BadRequestException(
        'Use another administrator to change your own permissions',
      );
    return this.db.transaction(async (manager) => {
      // Serialize admin changes so two concurrent requests cannot remove the last admin.
      await manager.query('LOCK TABLE auth_users IN SHARE ROW EXCLUSIVE MODE');
      const [user] = await manager.query(
        'SELECT * FROM auth_users WHERE id = $1',
        [id],
      );
      if (!user) throw new NotFoundException('User not found');
      const role = dto.role ?? user.role,
        active = dto.active ?? user.active;
      if (
        user.role === 'ADMIN' &&
        user.active &&
        (role !== 'ADMIN' || !active)
      ) {
        const [{ count }] = await manager.query(
          "SELECT COUNT(*)::int AS count FROM auth_users WHERE role = 'ADMIN' AND active = true",
        );
        if (count <= 1)
          throw new BadRequestException(
            'At least one active administrator is required',
          );
      }
      const [updated] = await manager.query(
        'UPDATE auth_users SET role=$1, active=$2 WHERE id=$3 RETURNING id,email,name,role,active',
        [role, active, id],
      );
      await manager.query('DELETE FROM auth_sessions WHERE user_id=$1', [id]);
      return updated;
    });
  }
  async resetPassword(id: string, password: string) {
    const encoded = await hashPassword(password);
    await this.db.transaction(async (manager) => {
      const [user] = await manager.query(
        'SELECT id FROM auth_users WHERE id=$1 FOR UPDATE',
        [id],
      );
      if (!user) throw new NotFoundException('User not found');
      await manager.query(
        'UPDATE auth_users SET password_hash=$1 WHERE id=$2',
        [encoded, id],
      );
      await manager.query('DELETE FROM auth_sessions WHERE user_id=$1', [id]);
    });
    return { message: 'Password reset. Previous sessions revoked.' };
  }
}
