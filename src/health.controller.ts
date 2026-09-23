import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Public } from './auth/auth.decorators';
@Controller('health')
export class HealthController {
  constructor(private readonly db: DataSource) {}
  @Public()
  @Get()
  async health() {
    try {
      await this.db.query('SELECT 1');
      return { status: 'ok' };
    } catch {
      throw new ServiceUnavailableException('Service unavailable');
    }
  }
}
