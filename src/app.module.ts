import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CustomersModule } from './customers/customers.module';
import { AddressesModule } from './addresses/addresses.module';
import { CategoriesModule } from './categories/categories.module';
import { UnitsModule } from './units/units.module';
import { ProductUnitsModule } from './product-units/product-units.module';
import { ProductsModule } from './products/products.module';
import { InventoryModule } from './inventory/inventory.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { PurchasesModule } from './purchases/purchases.module';
import { PurchaseItemsModule } from './purchase-items/purchase-items.module';
import { InventoryMovementsModule } from './inventory-movements/inventory-movements.module';
import { QuotesModule } from './quotes/quotes.module';
import { QuoteItemsModule } from './quote-items/quote-items.module';
import { OrdersModule } from './orders/orders.module';
import { OrderItemsModule } from './order-items/order-items.module';
import { PaymentsModule } from './payments/payments.module';
import { ServiceProvidersModule } from './service-providers/service-providers.module';
import { ProductionsModule } from './productions/productions.module';
import { ProductionTasksModule } from './production-tasks/production-tasks.module';
import { ProductionMaterialsModule } from './production-materials/production-materials.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],

      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: Number(configService.get<string>('DB_PORT') ?? 5432),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),

        autoLoadEntities: true,

        synchronize: configService.get<string>('DB_SYNCHRONIZE') === 'true',
      }),
    }),

    CustomersModule,

    AddressesModule,

    CategoriesModule,

    UnitsModule,

    ProductUnitsModule,

    ProductsModule,

    InventoryModule,

    SuppliersModule,

    PurchasesModule,

    PurchaseItemsModule,

    InventoryMovementsModule,

    QuotesModule,

    QuoteItemsModule,

    OrdersModule,

    OrderItemsModule,

    PaymentsModule,

    ServiceProvidersModule,

    ProductionsModule,

    ProductionTasksModule,

    ProductionMaterialsModule,
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
