# Mercería API

Backend NestJS + TypeORM + PostgreSQL. Flujo actual: **Production + ProductionTask + ProductionMaterial**, con pedido READY al completar producción.

## Ejecutar localmente

Requisitos: Node.js 20 o superior, pnpm y PostgreSQL local.

```bash
pnpm install --frozen-lockfile
# Solo si no existe .env:
cp -n .env.example .env
pnpm start:dev
```

Configura en `.env` DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD y DB_NAME con los datos de tu PostgreSQL. La base debe existir. Tu `.env` existente se conserva.

Swagger: http://localhost:3000/docs. Puerto configurable mediante PORT.

`DB_SYNCHRONIZE` es `false` por defecto: arrancar no modifica el esquema existente. Para una base de desarrollo NUEVA y vacía, usa `DB_SYNCHRONIZE=true` durante el primer arranque para crear las tablas y vuelve a `false` después. No borres la base que usaste en las pruebas.

```bash
pnpm build
pnpm start:prod
pnpm exec jest --runInBand src/productions/productions.service.spec.ts
```

## Punto de continuidad

- `Order` es el pedido del cliente. Sus ítems describen lo vendido.
- `Production` agrupa el trabajo de fabricación y se relaciona con un pedido mediante `orderId`, como en el chat original.
- `ProductionTask` representa un trabajo encargado a un proveedor (por ejemplo, bordado), con cantidad y costo.
- Crear producción no exige ítems ni un ítem CUSTOM. Permite pedidos PENDING como en las pruebas previas; rechaza CANCELLED y DELIVERED y una segunda producción del mismo pedido.
- Una producción necesita al menos una tarea para comenzar y todas COMPLETED para terminar.
- Finalizar producción deja el pedido en READY dentro de la misma transacción. No exige ítems. Si el pedido incluye productos con stock controlado, primero debe iniciarse con el flujo de Orders para registrar la salida de venta. No se descuentan materiales automáticamente.
- ProductionMaterial permite registrar descripción, cantidad y costo con productUnitId opcional. Se puede crear, editar o eliminar mientras la producción está PENDING o IN_PROGRESS; queda bloqueado en COMPLETED o CANCELLED.
- No se exige pedido CONFIRMED para crear producción. Completar no entrega el pedido ni cobra pagos: esos pasos siguen separados.

## Repetir la prueba en Swagger

Utiliza un pedido que todavía no tenga producción. Si necesitas uno nuevo, crea primero un cliente (`POST /customers`) y después un pedido (`POST /orders`) con su `customerId` y `orderDate` en formato `YYYY-MM-DD`. Para esta prueba de producción no necesitas agregar ítems al pedido.

1. `POST /service-providers`: `{"name":"Bordador de prueba","type":"EMBROIDERER"}`. Guarda su `id`.
2. `POST /productions`: `{"orderId":"ID_PEDIDO","notes":"Producción de prueba para 5 bandas"}`. Guarda el `id` de producción.
3. Intenta `POST /productions/ID_PRODUCCION/start`: debe responder 400 porque no tiene tareas.
4. `POST /production-tasks`:

```json
{
  "productionId": "ID_PRODUCCION",
  "serviceProviderId": "ID_PROVEEDOR",
  "description": "Bordado de 5 bandas",
  "quantity": 5,
  "unitCost": 8
}
```

5. `POST /productions/ID_PRODUCCION/start`.
6. `POST /production-tasks/ID_TAREA/start`.
7. Intenta completar la producción: debe responder 400 mientras haya tareas sin terminar.
8. `POST /production-tasks/ID_TAREA/complete`.
9. `POST /productions/ID_PRODUCCION/complete`.
10. `GET /productions/ID_PRODUCCION`: producción y tarea COMPLETED; subtotal de la tarea S/ 40.

El pedido queda READY al completar producción. Para una producción antigua COMPLETED cuyo pedido siga pendiente, puedes repetir POST /productions/ID/complete: conserva completedAt y sincroniza el pedido. No se ejecuta una actualización masiva de pedidos antiguos ni se revierten movimientos históricos. Un pedido cancelado o entregado no se modifica.

## Materiales

Para actualizar una base existente, con `.env` configurado:

```bash
pnpm db:materials
```

El script agrega `description` y permite `product_unit_id` nulo sin eliminar datos. Los materiales antiguos conservan su descripción nula; las altas nuevas requieren descripción. No es necesario activar DB_SYNCHRONIZE.

En Swagger, `POST /production-materials`:

```json
{
  "productionId": "UUID_DE_PRODUCCION_PENDIENTE_O_EN_PROCESO",
  "description": "Hilo y materiales menores",
  "quantity": 1,
  "unitCost": 3
}
```

Para un material del catálogo, agrega `productUnitId`. El servidor calcula `subtotal = quantity × unitCost` redondeado a dos decimales. No envíes subtotal. Materiales y tareas registran costos; no sustituyen el precio de venta del pedido.

`PATCH /production-materials/ID` permite cambiar descripción, cantidad, costo y producto. `productUnitId: null` desvincula el catálogo. `GET /productions/ID` incluye los materiales. No es obligatorio tener materiales para iniciar o completar una producción.

## Resumen de costos

`GET /productions/ID/costs` devuelve `productionId`, `status`, `tasksCount`, `materialsCount`, `tasksCost`, `materialsCost` y `totalCost`.

Ejemplo: una tarea de bordado S/ 40 y dos materiales de S/ 7.50 y S/ 3 producen `tasksCost: 40`, `materialsCost: 10.5`, `totalCost: 50.5`.

Se suman los subtotales guardados de cada registro, en céntimos, sin guardar un total duplicado ni modificar datos. Una producción sin tareas o materiales devuelve cero. Los materiales sin producto de catálogo también cuentan. Incluye todos los costos registrados, incluso tareas canceladas: cancelar una tarea no acredita que su costo haya sido reembolsado o eliminado. Es un resumen de costos registrados, no de pagos realizados, precio de venta o utilidad. Mientras la producción esté abierta, el resumen cambia al editar sus tareas o materiales.

## Precio acordado para pedidos sin ítems

Actualización incremental de una base existente: `pnpm db:order-price`. Agrega `orders.agreed_price` nullable y conserva precios y registros anteriores.

Al crear un pedido con `POST /orders`, puedes enviar:

```json
{
  "customerId": "UUID_CLIENTE",
  "orderDate": "2026-09-21",
  "agreedPrice": 100
}
```

También puedes usar `PATCH /orders/ID` con `{"agreedPrice":100}` mientras esté PENDING. `agreedPrice` es el precio de venta antes de descuento: subtotal = agreedPrice y total = subtotal - discount. Debe ser positivo, con máximo dos decimales. No se combina con cotización ni ítems; los pedidos con ítems conservan sus cálculos anteriores. No se calculan precios de venta a partir de costos de producción.

Para pedidos antiguos sin ítems/cotización que están CONFIRMED, IN_PROGRESS o READY, con subtotal cero y sin pagos, se permite asignar el precio una primera vez enviando exclusivamente `agreedPrice`. Después queda bloqueado. No se modifican automáticamente precios históricos.

Recorrido de prueba: crear pedido con precio → confirmar → registrar adelanto → completar producción → consultar saldo → cobrar saldo → entregar. Ejemplo: precio S/100, adelanto S/30, saldo S/70. Se usa el módulo Payments existente. No se puede entregar con total cero o saldo pendiente, ni marcar listo/entregar cuando una producción asociada no está COMPLETED. Crear producción sigue sin exigir ítems.

Prueba de integración: `python3 test/manual/agreed-price.py`, exclusivamente con una API de pruebas en `localhost:3301` conectada a una base separada; crea registros ficticios. Verifica el recorrido de cobro, producción, entrega, precio inicial de pedidos antiguos, descuentos y pedidos con ítems.
