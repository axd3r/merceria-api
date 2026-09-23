import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DataSource } from 'typeorm';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/setup-app';
import { AuthService } from '../src/auth/auth.service';
import { businessDay } from '../src/common/order-workflow';

jest.setTimeout(60000);
describe('First release with PostgreSQL', () => {
  let app: NestExpressApplication, db: DataSource, auth: AuthService;
  let adminToken: string, staffToken: string, adminId: string, staffId: string;
  const password = 'Release-testing-password-2026';
  const today = () => businessDay(new Date());
  const api = () => request(app.getHttpServer());
  const post = (url: string, body = {}, token = adminToken) =>
    api().post(url).auth(token, { type: 'bearer' }).send(body);
  const get = (url: string, token = adminToken) =>
    api().get(url).auth(token, { type: 'bearer' });
  const patch = (url: string, body: object, token = adminToken) =>
    api().patch(url).auth(token, { type: 'bearer' }).send(body);
  async function login(email: string, pass = password) {
    return (
      await api()
        .post('/auth/login')
        .send({ email, password: pass })
        .expect(200)
    ).body.accessToken;
  }
  async function order(price = 100) {
    const c = await post('/customers', {
      firstName: 'Cliente',
      lastName: 'Prueba',
      phone: '999999999',
    }).expect(201);
    return (
      await post('/orders', {
        customerId: c.body.id,
        orderDate: today(),
        agreedPrice: price,
      }).expect(201)
    ).body;
  }
  async function production(orderId: string) {
    const p = await post('/productions', { orderId }).expect(201);
    const provider = await post('/service-providers', {
      name: 'Bordador',
      type: 'EMBROIDERER',
    }).expect(201);
    const task = await post('/production-tasks', {
      productionId: p.body.id,
      serviceProviderId: provider.body.id,
      description: 'Bordado',
      quantity: 5,
      unitCost: 8,
    }).expect(201);
    return { p: p.body, task: task.body };
  }
  const payment = (id: string, amount: number) =>
    post('/payments', {
      orderId: id,
      amount,
      paymentDate: today(),
      method: 'CASH',
    });

  beforeAll(async () => {
    if (
      !process.env.DB_NAME?.endsWith('_test') ||
      process.env.ALLOW_TEST_RESET !== 'true'
    ) {
      throw new Error(
        'Use a separate *_test database with ALLOW_TEST_RESET=true. Tests reset its data.',
      );
    }
    process.env.DB_SYNCHRONIZE = 'false';
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication<NestExpressApplication>({
      bodyParser: false,
    });
    setupApp(app);
    await app.init();
    db = app.get(DataSource);
    auth = app.get(AuthService);
    const tables = await db.query(
      "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> 'schema_migrations'",
    );
    await db.query(
      'TRUNCATE ' +
        tables
          .map(
            (r: { tablename: string }) =>
              '"' + r.tablename.replace(/"/g, '""') + '"',
          )
          .join(',') +
        ' CASCADE',
    );
    const admin = await auth.createUser({
      email: 'admin@example.com',
      password,
      name: 'Admin',
      role: 'ADMIN',
    });
    adminId = admin.id;
    adminToken = await login('admin@example.com');
    const staff = await post('/users', {
      email: 'staff@example.com',
      password,
      name: 'Trabajador',
      role: 'STAFF',
    }).expect(201);
    staffId = staff.body.id;
    staffToken = await login('staff@example.com');
  });
  afterAll(async () => {
    if (app) await app.close();
  });

  it('protects every business route by default and exposes only health/login', async () => {
    await api().get('/health').expect(200);
    const spec = (await api().get('/docs-json').expect(200)).body;
    for (const [path, operations] of Object.entries(spec.paths)) {
      if (path === '/health' || path === '/auth/login') continue;
      for (const method of Object.keys(operations as object).filter((m) =>
        ['get', 'post', 'patch', 'delete'].includes(m),
      )) {
        const url = path.replace(
          /\{[^}]+\}/g,
          '00000000-0000-4000-8000-000000000000',
        );
        await api()[method](url).expect(401);
      }
    }
    await get('/orders', 'forged-token').expect(401);
    await api().post('/auth/register').send({}).expect(404);
  });
  it('enforces admin/staff permissions and never returns password hashes', async () => {
    await get('/users', staffToken).expect(403);
    await post(
      '/users',
      { email: 'intruder@example.com', password, name: 'No', role: 'ADMIN' },
      staffToken,
    ).expect(403);
    await post(
      '/inventory',
      { productUnitId: '00000000-0000-4000-8000-000000000000', quantity: 1 },
      staffToken,
    ).expect(403);
    await api()
      .delete('/orders/00000000-0000-4000-8000-000000000000')
      .auth(staffToken, { type: 'bearer' })
      .expect(403);
    await get('/customers', staffToken).expect(200);
    await post(
      '/customers',
      { firstName: 'Nuevo', lastName: 'Cliente', phone: '999999999' },
      staffToken,
    ).expect(201);
    const users = await get('/users').expect(200);
    expect(JSON.stringify(users.body)).not.toMatch(/password_hash|scrypt/);
    await patch('/users/' + adminId, { active: false }).expect(400);
    const sessions = await db.query('SELECT token_hash FROM auth_sessions');
    expect(
      sessions.every(
        (s: { token_hash: string }) =>
          s.token_hash.length === 64 && s.token_hash !== adminToken,
      ),
    ).toBe(true);
    await post('/users', {
      email: 'short@example.com',
      password: 'short',
      name: 'No',
      role: 'STAFF',
    }).expect(400);
  });
  it('rejects bad credentials, expires sessions, logs out and revokes disabled users', async () => {
    await api()
      .post('/auth/login')
      .send({ email: 'admin@example.com', password: 'bad' })
      .expect(401);
    let token = await login('staff@example.com');
    await post('/auth/logout', {}, token).expect(200);
    await get('/auth/me', token).expect(401);
    token = await login('staff@example.com');
    await db.query(
      "UPDATE auth_sessions SET expires_at=NOW()-INTERVAL '1 second' WHERE token_hash=$1",
      [auth.digest(token)],
    );
    await get('/auth/me', token).expect(401);
    await patch('/users/' + staffId, { active: false }).expect(200);
    await get('/auth/me', staffToken).expect(401);
    await api()
      .post('/auth/login')
      .send({ email: 'staff@example.com', password })
      .expect(401);
    await patch('/users/' + staffId, { active: true }).expect(200);
    staffToken = await login('staff@example.com');
  });
  it('changes passwords with current password verification and revokes old sessions', async () => {
    const next = 'Changed-password-2026';
    await post(
      '/auth/change-password',
      { currentPassword: 'wrong', newPassword: next },
      staffToken,
    ).expect(401);
    await post(
      '/auth/change-password',
      { currentPassword: password, newPassword: next },
      staffToken,
    ).expect(200);
    await get('/auth/me', staffToken).expect(401);
    await api()
      .post('/auth/login')
      .send({ email: 'staff@example.com', password })
      .expect(401);
    const fresh = await login('staff@example.com', next);
    await post('/users/' + staffId + '/reset-password', {
      newPassword: password,
    }).expect(200);
    await get('/auth/me', fresh).expect(401);
    staffToken = await login('staff@example.com');
  });
  it('cancels same-day unpaid plans and prevents restarting their production', async () => {
    const o = await order();
    const { p, task } = await production(o.id);
    await post('/orders/' + o.id + '/cancel', {}, staffToken).expect(201);
    expect((await get('/productions/' + p.id)).body.status).toBe('CANCELLED');
    expect((await get('/production-tasks/' + task.id)).body.status).toBe(
      'CANCELLED',
    );
    await post('/productions/' + p.id + '/start').expect(400);
    await post('/production-materials', {
      productionId: p.id,
      description: 'Hilo',
      quantity: 1,
      unitCost: 3,
    }).expect(400);
  });
  it('rejects yesterday, edited order dates and advances, including alternate cancellation/deletion routes', async () => {
    const old = await order();
    await db.query(
      "UPDATE orders SET created_at=created_at-INTERVAL '1 day' WHERE id=$1",
      [old.id],
    );
    await post('/orders/' + old.id + '/cancel').expect(400);
    await api()
      .delete('/orders/' + old.id)
      .auth(adminToken, { type: 'bearer' })
      .expect(400);
    const paid = await order();
    const { p } = await production(paid.id);
    await post('/orders/' + paid.id + '/confirm').expect(201);
    await payment(paid.id, 1).expect(201);
    await post('/orders/' + paid.id + '/cancel').expect(400);
    await post('/productions/' + p.id + '/cancel').expect(400);
    await api()
      .delete('/productions/' + p.id)
      .auth(adminToken, { type: 'bearer' })
      .expect(400);
  });
  it('blocks cancellation after production starts even if the order stays pending', async () => {
    const o = await order();
    const { p } = await production(o.id);
    await post('/productions/' + p.id + '/start').expect(201);
    await post('/orders/' + o.id + '/cancel').expect(400);
    await post('/productions/' + p.id + '/cancel').expect(400);
  });
  it('serializes concurrent payment/cancellation so both cannot succeed', async () => {
    const o = await order();
    await post('/orders/' + o.id + '/confirm').expect(201);
    const responses = await Promise.all([
      post('/orders/' + o.id + '/cancel'),
      payment(o.id, 10),
    ]);
    expect(responses.map((r) => r.status).sort()).toEqual([201, 400]);
  });
  it('serializes production start/cancellation', async () => {
    const o = await order();
    const { p } = await production(o.id);
    const responses = await Promise.all([
      post('/orders/' + o.id + '/cancel'),
      post('/productions/' + p.id + '/start'),
    ]);
    expect(responses.map((r) => r.status).sort()).toEqual([201, 400]);
  });
  it('runs price, advance, materials, tasks, costs, balance and delivery without order items', async () => {
    const o = await order(100);
    expect(o.items).toEqual([]);
    const { p, task } = await production(o.id);
    await post('/orders/' + o.id + '/confirm').expect(201);
    await payment(o.id, 30).expect(201);
    expect((await get('/orders/' + o.id + '/balance')).body.remaining).toBe(70);
    await post('/orders/' + o.id + '/start').expect(201);
    await post('/orders/' + o.id + '/ready').expect(400);
    await post('/production-materials', {
      productionId: p.id,
      description: 'Cinta',
      quantity: 5,
      unitCost: 1.5,
    }).expect(201);
    await post('/production-materials', {
      productionId: p.id,
      description: 'Hilo',
      quantity: 1,
      unitCost: 3,
    }).expect(201);
    await post('/productions/' + p.id + '/start').expect(201);
    await post('/productions/' + p.id + '/complete').expect(400);
    await post('/production-tasks/' + task.id + '/start').expect(201);
    await post('/production-tasks/' + task.id + '/complete').expect(201);
    await post('/productions/' + p.id + '/complete').expect(201);
    expect((await get('/orders/' + o.id)).body.status).toBe('READY');
    expect((await get('/productions/' + p.id + '/costs')).body.totalCost).toBe(
      50.5,
    );
    await post('/orders/' + o.id + '/deliver').expect(400);
    await payment(o.id, 71).expect(400);
    await payment(o.id, 70).expect(201);
    expect(
      (await post('/orders/' + o.id + '/deliver').expect(201)).body.status,
    ).toBe('DELIVERED');
    await post('/orders/' + o.id + '/cancel').expect(400);
  });
  it('limits login attempts without disclosing whether the email exists', async () => {
    for (let i = 0; i < 10; i++)
      await api()
        .post('/auth/login')
        .send({ email: 'unknown@example.com', password: 'bad' })
        .expect(401);
    await api()
      .post('/auth/login')
      .send({ email: 'unknown@example.com', password: 'bad' })
      .expect(429);
  });
});
