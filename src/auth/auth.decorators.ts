import { SetMetadata } from '@nestjs/common';
export type Role = 'ADMIN' | 'STAFF';
export const Public = () => SetMetadata('public', true);
export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
}
