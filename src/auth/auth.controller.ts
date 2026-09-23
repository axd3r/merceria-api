import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { AuthUser, Public, Roles } from './auth.decorators';
import {
  ChangePasswordDto,
  CreateUserDto,
  LoginDto,
  ResetPasswordDto,
  UpdateUserDto,
} from './auth.dto';
type AuthRequest = Request & { user: AuthUser; authToken: string };

@ApiTags('Auth')
@ApiBearerAuth()
@Roles('ADMIN', 'STAFF')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.auth.login(
      dto.email,
      dto.password,
      req.ip ?? req.socket.remoteAddress ?? 'unknown',
    );
  }
  @Get('me') me(@Req() req: AuthRequest) {
    return req.user;
  }
  @Post('logout')
  @HttpCode(200)
  logout(@Req() req: AuthRequest) {
    return this.auth.logout(req.authToken);
  }
  @Post('change-password')
  @HttpCode(200)
  changePassword(@Req() req: AuthRequest, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(req.user.id, dto);
  }
}
@ApiTags('Users')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('users')
export class UsersController {
  constructor(private readonly auth: AuthService) {}
  @Post() create(@Body() dto: CreateUserDto) {
    return this.auth.createUser(dto);
  }
  @Get() list() {
    return this.auth.listUsers();
  }
  @Patch(':id') update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: AuthRequest,
  ) {
    return this.auth.updateUser(id, dto, req.user.id);
  }
  @Post(':id/reset-password')
  @HttpCode(200)
  reset(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(id, dto.newPassword);
  }
}
