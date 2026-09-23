# Mercería API

Backend para clientes, cotizaciones, pedidos, cobros, producción, materiales, compras e inventario. Construido con NestJS, TypeORM y PostgreSQL. Incluye autenticación y permisos `ADMIN` / `STAFF`.

Esta primera versión es una API: los formularios y pantallas se construyen en un frontend independiente. Swagger permite probar las operaciones mientras se desarrolla ese frontend.

## Contenido

- [Instalación sin Docker](#instalación-sin-docker)
- [Instalación con Docker](#instalación-con-docker)
- [Acceso y permisos](#acceso-y-permisos)
- [Convenciones para los formularios](#convenciones-para-los-formularios)
- [Recorrido completo: un encargo sin ítems](#recorrido-completo-un-encargo-sin-ítems)
- [Clientes y direcciones](#clientes-y-direcciones)
- [Catálogo y unidades](#catálogo-y-unidades)
- [Cotizaciones y pedidos con ítems](#cotizaciones-y-pedidos-con-ítems)
- [Producción, tareas y materiales](#producción-tareas-y-materiales)
- [Pagos y entrega](#pagos-y-entrega)
- [Compras e inventario](#compras-e-inventario)
- [Cancelaciones](#cancelaciones)
- [Referencia de rutas](#referencia-de-rutas)
- [Integración con el frontend](#integración-con-el-frontend)
- [Mantenimiento y publicación](#mantenimiento-y-publicación)

## Instalación sin Docker

### 1. Requisitos

- Node.js 20 o superior, según `package.json`.
- pnpm 10.28.0.
- PostgreSQL instalado y ejecutándose; cliente `psql` y `pg_dump` para administración y respaldos.
- Git para clonar/subir el proyecto.

Docker es opcional. No necesitas ejecutarlo para seguir esta guía. Ejecuta los comandos desde la raíz del proyecto, salvo cuando se indique lo contrario.

```bash
npm install -g pnpm@10.28.0
pnpm install --frozen-lockfile
```

### 2. Crear la base de datos

Para una instalación nueva, entra a PostgreSQL con una cuenta administradora. En Linux con autenticación local puedes usar:

```bash
sudo -u postgres psql
```

Ejecuta lo siguiente cambiando la contraseña del ejemplo:

```sql
CREATE USER merceria WITH PASSWORD 'REEMPLAZA_POR_UNA_CLAVE_PRIVADA';
CREATE DATABASE merceria OWNER merceria;
```

Sal de `psql` con `\q`. Si ya tienes una base con datos del negocio, usa esa conexión y respáldala antes de migrar; no vuelvas a crearla.

### 3. Configurar el entorno

Copia `.env.example` a `.env` **solo si `.env` todavía no existe**:

```bash
cp -n .env.example .env
```

Edita `.env`. Ejemplo para una instalación local con frontend en Vite:

```dotenv
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=merceria
DB_PASSWORD=REEMPLAZA_POR_LA_CLAVE_DE_POSTGRES
DB_NAME=merceria
DB_SYNCHRONIZE=false
NODE_ENV=development
HOST=127.0.0.1
PORT=3000
BUSINESS_TIMEZONE=America/Lima
CORS_ORIGINS=http://localhost:5173
TRUST_PROXY=0
ENABLE_SWAGGER=false
```

| Variable | Uso |
| --- | --- |
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` | Conexión a PostgreSQL. |
| `DB_SYNCHRONIZE` | Mantener `false`; usar migraciones. En producción la sincronización está desactivada. |
| `NODE_ENV` | `development` local; `production` en el servidor. |
| `HOST`, `PORT` | Interfaz y puerto de la API; por defecto `127.0.0.1:3000`. |
| `BUSINESS_TIMEZONE` | Zona horaria para reglas de cancelación. |
| `CORS_ORIGINS` | Orígenes exactos del frontend, separados por comas y sin barra final. Vacío no habilita acceso entre orígenes. |
| `TRUST_PROXY` | `1` solamente detrás de un único proxy de confianza y sin acceso directo público a la API. |
| `ENABLE_SWAGGER` | En desarrollo Swagger está habilitado; en producción requiere `true`. |
| `DOMAIN` | Solo lo usa la configuración opcional de Docker/Caddy. No se necesita localmente. |

`http://localhost:5173` y `http://127.0.0.1:5173` son orígenes distintos. Incluye el que realmente utilice el navegador. Reinicia el backend si cambias el entorno.

### 4. Compilar y aplicar migraciones

```bash
pnpm build
pnpm db:migrate
```

Las migraciones crean las tablas en una base vacía y aplican cambios pendientes en una existente. No crean el servidor PostgreSQL ni la base de datos. El usuario de conexión necesita permisos para crear el esquema y la extensión `uuid-ossp` usada por la migración inicial.

Conserva `scripts/migrations/` en Git: permite reproducir la estructura de la base en otra computadora o servidor. Las migraciones no dependen de Docker. No edites una migración ya aplicada; su checksum se comprueba. Los cambios posteriores deben añadirse en nuevas migraciones.

### 5. Crear el primer administrador

Después de compilar y migrar:

```bash
ADMIN_EMAIL=admin@tu-negocio.com pnpm auth:create-admin
```

El script genera una contraseña y la guarda en `.local/admin-credentials.txt`, un archivo privado excluido de Git. Usa esas credenciales para entrar y después cambia la contraseña. No existe una contraseña predeterminada.

El script no reemplaza un administrador existente ni sobrescribe el archivo de credenciales. Si ya existe un administrador, inicia sesión con esa cuenta y crea las siguientes mediante `POST /users`. También admite `ADMIN_NAME`, `ADMIN_PASSWORD` y `ADMIN_CREDENTIALS_FILE`; no guardes contraseñas reales en comandos compartidos ni en el repositorio.

### 6. Arrancar y comprobar

```bash
pnpm start:dev
```

- API: `http://localhost:3000` (sin prefijo `/api`).
- Estado del servicio: `GET http://localhost:3000/health`.
- Swagger: `http://localhost:3000/docs`.
- OpenAPI: `http://localhost:3000/docs-json` cuando Swagger está habilitado.

La ruta `/docs` la genera NestJS en ejecución: no necesita una carpeta `docs/` en el repositorio.

## Instalación con Docker

Esta alternativa usa los archivos `Dockerfile`, `compose.yaml` y `Caddyfile` incluidos. Levanta PostgreSQL 16, la API con Node.js 24 y Caddy como proxy HTTPS. No necesitas instalar Node.js, pnpm ni PostgreSQL en el servidor anfitrión.

El Compose incluido está preparado para un **servidor con dominio**, no para abrir directamente `localhost:3000`. Solo publica los puertos 80 y 443 del proxy; PostgreSQL y la API quedan en la red interna. Para desarrollo local sin dominio, puedes seguir la instalación sin Docker de arriba.

### 1. Preparar el servidor

- Instala Docker Engine y el complemento Docker Compose siguiendo la documentación de Docker para tu sistema operativo.
- Comprueba que el servicio Docker está funcionando y tu usuario puede utilizarlo.
- Copia o clona el repositorio en el servidor y entra en su carpeta.
- Apunta el DNS del dominio de la API (por ejemplo `api.tu-negocio.com`) a ese servidor. Si publicas un registro IPv6, también debe apuntar correctamente.
- Permite las conexiones entrantes a los puertos 80 y 443; deben estar libres para Caddy.

Comprueba la instalación:

```bash
docker --version
docker compose version
```

### 2. Configurar .env

Copia la plantilla solo si todavía no tienes `.env`:

```bash
cp -n .env.example .env
```

Edita al menos estas variables; reemplaza todos los valores de ejemplo:

```dotenv
DB_PASSWORD=REEMPLAZA_POR_UNA_CLAVE_LARGA_Y_PRIVADA
DOMAIN=api.tu-negocio.com
CORS_ORIGINS=https://tu-frontend.com
```

`DOMAIN` es el nombre del dominio, sin `https://` ni rutas. `CORS_ORIGINS` contiene el origen real del frontend; puedes dejarlo vacío mientras no exista frontend o separar varios orígenes por comas.

Compose fija internamente `DB_HOST=db`, usuario/base `merceria`, modo producción, puerto 3000, zona horaria `America/Lima`, sincronización desactivada y confianza en un proxy. Esos valores no se toman de sus equivalentes en `.env`. Swagger está desactivado explícitamente en este Compose: cambiar únicamente `ENABLE_SWAGGER` en `.env` no lo habilita.

### 3. Construir e iniciar

```bash
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 api proxy
```

Docker descarga las imágenes y construye el backend. PostgreSQL crea la base en su primer arranque. La API espera a que PostgreSQL esté disponible y ejecuta las migraciones antes de iniciar. No necesitas ejecutar `pnpm build` ni `pnpm db:migrate` en el servidor anfitrión para este flujo.

Caddy gestiona HTTPS para el dominio configurado. Comprueba `https://api.tu-negocio.com/health` usando tu dominio real. Si no responde, revisa DNS, puertos y los logs del proxy/API. `/docs` no estará disponible con la configuración de producción incluida.

### 4. Crear el primer administrador

En una terminal Linux/macOS, desde la raíz del repositorio:

```bash
mkdir -p .local
chmod 700 .local
docker compose run --rm --user "$(id -u):$(id -g)" \
  -v "$PWD/.local:/credentials" \
  -e ADMIN_EMAIL=admin@tu-negocio.com \
  -e ADMIN_CREDENTIALS_FILE=/credentials/admin-credentials.txt \
  api node scripts/create-admin.cjs
```

Reemplaza el correo antes de ejecutar. El comando no pregunta los datos de forma interactiva. Genera la contraseña y la guarda en `.local/admin-credentials.txt` **del servidor anfitrión**, gracias al directorio montado; así no se pierde cuando termina el contenedor temporal. No compartas ni subas ese archivo.

Si muestra `An administrator already exists`, ya existe un ADMIN activo en esa base: usa esa cuenta y crea otros usuarios mediante `POST /users` autenticado. No elimines al administrador para repetir la instalación.

Usa el frontend o un cliente HTTP para `POST https://api.tu-negocio.com/auth/login`, con email y contraseña como se explica en [Acceso y permisos](#acceso-y-permisos). Cambia la contraseña inicial después de entrar.

### 5. Datos persistentes y comandos habituales

| Comando | Efecto |
| --- | --- |
| `docker compose ps` | Consultar estado de los servicios. |
| `docker compose logs --tail=100 api` | Revisar el arranque/migraciones de la API. |
| `docker compose logs --tail=100 db proxy` | Revisar PostgreSQL y HTTPS. |
| `docker compose stop` | Detener servicios conservando contenedores y volúmenes. |
| `docker compose start` | Volver a iniciar servicios detenidos. |
| `docker compose down` | Quitar contenedores/red, conservando los volúmenes nombrados. |
| `docker compose up -d --build` | Construir y levantar la versión del código presente. |

PostgreSQL persiste en `postgres_data`; Caddy usa `caddy_data` y `caddy_config`. **No uses `docker compose down -v` si necesitas conservar los datos**, porque elimina esos volúmenes. Mantén el mismo nombre de proyecto Compose/directorio en las actualizaciones para reutilizar los mismos volúmenes.

Esta base Docker es independiente de tu PostgreSQL local: no importa automáticamente tus clientes, pedidos ni usuarios existentes. Cambiar `DB_PASSWORD` en `.env` tampoco cambia la contraseña de un usuario de PostgreSQL que ya existe en el volumen; esa rotación debe coordinarse con la base.

### 6. Respaldar y actualizar

Para respaldar la base del contenedor, ejecuta desde el servidor anfitrión:

```bash
mkdir -p .local/backups
chmod 700 .local/backups
(umask 077; docker compose exec -T db pg_dump -U merceria -d merceria -Fc > ".local/backups/merceria-$(date +%Y%m%d-%H%M%S).dump")
```

Comprueba que el comando termine sin error y conserva una copia fuera del servidor. No uses `pnpm db:backup` dentro de la imagen de la API: esa imagen no incluye `pg_dump`; el comando anterior utiliza el de PostgreSQL.

Antes de actualizar, realiza el respaldo; después trae el nuevo código y ejecuta `docker compose up -d --build`. Revisa logs y `/health`. Las migraciones pendientes se ejecutan al arrancar la API. El contenedor de producción ejecuta archivos compilados: editar el código en el anfitrión no cambia la API hasta reconstruirla.

Para comprobar un respaldo sin tocar la base activa, crea una base separada (el nombre de ejemplo debe estar libre) y restaura el archivo elegido:

```bash
docker compose exec -T db createdb -U merceria merceria_recuperacion
docker compose exec -T db pg_restore -U merceria --no-owner -d merceria_recuperacion < RUTA_AL_RESPALDO.dump
```

No restaura sobre `merceria` ni cambia la base que usa la API. Una migración de datos desde otra instalación debe planificarse por separado, con respaldo y verificación, antes de ponerla en servicio.

## Acceso y permisos

### Entrar desde Swagger

1. Abre `/docs` y busca `POST /auth/login`.
2. Pulsa **Try it out**, escribe email y contraseña, y ejecuta.
3. Copia `accessToken` de la respuesta.
4. Pulsa **Authorize** y pega únicamente el token.
5. Ejecuta las operaciones autorizadas para tu cuenta.

Cuerpo de login (sustituye los valores):

```json
{
  "email": "admin@tu-negocio.com",
  "password": "TU_CONTRASENA_REAL"
}
```

La sesión dura 8 horas. El token es opaco y aleatorio, **no un JWT**; el frontend no debe intentar decodificarlo. Usa `GET /auth/me` para consultar la cuenta actual. Envía el token en cada petición protegida:

```http
Authorization: Bearer TOKEN_DE_LA_SESION
```

`POST /auth/logout` cierra la sesión actual. Para cambiar tu contraseña, envía a `POST /auth/change-password`:

```json
{
  "currentPassword": "TU_CONTRASENA_ACTUAL",
  "newPassword": "UNA_NUEVA_CLAVE_PRIVADA"
}
```

La contraseña nueva debe tener entre 12 y 128 caracteres. El cambio cierra todas las sesiones de la cuenta; vuelve a iniciar sesión. El login limita intentos por IP y cuenta. No hay registro público ni endpoint de renovación del token.

### Roles

| Acción | ADMIN | STAFF |
| --- | --- | --- |
| Consultar datos comerciales | Sí | Sí |
| Crear/editar clientes y direcciones | Sí | Sí |
| Operar cotizaciones, pedidos y registrar pagos | Sí | Sí |
| Operar producción, tareas y materiales | Sí | Sí |
| Modificar catálogo, proveedores, compras e inventario | Sí | No |
| Eliminar registros donde existe DELETE | Sí, sujeto a reglas | No |
| Administrar usuarios | Sí | No |

Los permisos no evitan las validaciones del negocio: un administrador tampoco puede cancelar un pedido con adelanto.

### Formulario de usuarios (ADMIN)

Crear con `POST /users`:

```json
{
  "name": "Operador de ventas",
  "email": "operador@example.com",
  "password": "CAMBIAR_POR_CLAVE_PRIVADA",
  "role": "STAFF"
}
```

Todos los campos son obligatorios: nombre no vacío hasta 100 caracteres, email válido hasta 254, contraseña de 12–128 y rol `ADMIN` o `STAFF`.

- `GET /users`: listar cuentas.
- `PATCH /users/:id`: enviar `role`, `active` o ambos; no sirve para editar nombre/email.
- `POST /users/:id/reset-password`: enviar `newPassword` (12–128 caracteres).
- Cambiar permisos, desactivar o restablecer contraseña revoca sesiones.
- No puedes cambiar tu propio rol/estado ni dejar el sistema sin administrador activo.

## Convenciones para los formularios

- Enviar `Content-Type: application/json` en cuerpos JSON.
- Los campos `...Id` son UUID de registros existentes. Mostrar un selector con nombres y enviar su ID; no pedir al trabajador que escriba UUID.
- En los ejemplos, `CLIENTE_ID`, `PEDIDO_ID`, etc. son marcadores: reemplázalos por el `id` devuelto por la API. No son UUID válidos por sí mismos.
- Fechas comerciales: usar `YYYY-MM-DD`. Reemplazar las fechas de ejemplo por las del trabajo real.
- Cantidades y dinero se envían como números (`5`, `8.5`), no texto (`"5"`). Booleanos como `true`/`false`.
- Para la interfaz usar hasta 4 decimales en cantidades y 2 en importes. Cantidades de líneas: mínimo `0.0001`; costos/precios unitarios: mínimo `0`.
- `discount` es un importe, no un porcentaje.
- Omitir campos opcionales vacíos. No enviar `""` en UUID, fechas o números; no usar `null` salvo donde se indica expresamente.
- No enviar `id`, relaciones completas, `subtotal`, `total`, `createdAt` o `updatedAt` al crear/editar. El servidor calcula esos datos y rechaza propiedades desconocidas.
- PATCH envía solo los campos editables que cambiaron, no el objeto completo de un GET.
- Los decimales de PostgreSQL pueden regresar como texto (`"40.00"`). Convertir para presentación y formatear dinero; el servidor es la autoridad para totales y saldo.
- Las acciones de estado son POST específicos (`/confirm`, `/start`, etc.) sin campos de formulario. No inventar un PATCH de `status`.
- Listados comerciales devuelven arrays; esta versión no ofrece paginación ni filtros generales por query.

## Recorrido completo: un encargo sin ítems

Ejemplo: cinco bandas con precio acordado de S/100, adelanto S/30, bordado S/40 y materiales S/10.50. **No requiere agregar ítems al pedido ni a la producción.**

### 1. Registrar al cliente

`POST /customers`:

```json
{
  "firstName": "Ana",
  "lastName": "Perez",
  "phone": "999999999"
}
```

Guarda el `id` como `CLIENTE_ID`.

### 2. Registrar el pedido con su precio de venta

`POST /orders`:

```json
{
  "customerId": "CLIENTE_ID",
  "orderDate": "2026-09-23",
  "agreedPrice": 100,
  "notes": "Cinco bandas personalizadas"
}
```

Guarda el `id` como `PEDIDO_ID`. El pedido comienza en `PENDING`. Confírmalo con `POST /orders/PEDIDO_ID/confirm`.

`agreedPrice` es el precio que se cobra al cliente antes de descuentos; no es el costo de producir. No se combina con cotización ni ítems en ese pedido.

### 3. Registrar el adelanto

`POST /payments`:

```json
{
  "orderId": "PEDIDO_ID",
  "paymentDate": "2026-09-23",
  "method": "YAPE",
  "amount": 30,
  "reference": "Operacion de ejemplo"
}
```

El saldo será S/70. Desde que existe un pago ya no se permite cancelar.

### 4. Preparar producción y tarea

Un administrador registra primero al bordador mediante `POST /service-providers` (o selecciona uno existente):

```json
{
  "name": "Bordador de ejemplo",
  "type": "EMBROIDERER",
  "phone": "999999999"
}
```

Guarda su ID como `PRESTADOR_ID`. Crea la producción en `POST /productions`:

```json
{
  "orderId": "PEDIDO_ID",
  "notes": "Produccion de cinco bandas"
}
```

Guarda `PRODUCCION_ID`. Agrega la tarea en `POST /production-tasks`:

```json
{
  "productionId": "PRODUCCION_ID",
  "serviceProviderId": "PRESTADOR_ID",
  "description": "Bordado de cinco bandas",
  "quantity": 5,
  "unitCost": 8
}
```

Guarda `TAREA_ID`. El subtotal de la tarea es S/40. Registra todas las tareas antes de iniciar la producción.

### 5. Iniciar y registrar materiales

Ejecuta `POST /productions/PRODUCCION_ID/start` antes de comprometer recursos comprando materiales o contratando el trabajo. Así queda registrado el inicio y se bloquea la cancelación.

Agrega materiales con `POST /production-materials`:

```json
{
  "productionId": "PRODUCCION_ID",
  "description": "Tela y cinta para las bandas",
  "quantity": 1,
  "unitCost": 10.5
}
```

No se exige un producto del catálogo ni registrar si el material o trabajo fue pagado.

### 6. Completar el trabajo

Ejecuta en este orden:

1. `POST /production-tasks/TAREA_ID/start`.
2. `POST /production-tasks/TAREA_ID/complete`.
3. Cuando todas las tareas estén completas, `POST /productions/PRODUCCION_ID/complete`.

La tarea y la producción quedan `COMPLETED`; el pedido pasa a `READY`. Completar la última tarea por sí solo no cierra la producción: se usa el botón/acción **Completar producción**.

Consulta `GET /productions/PRODUCCION_ID/costs`: costo de tareas S/40, materiales S/10.50, costo total S/50.50. El precio de venta sigue siendo S/100.

### 7. Cobrar el saldo y entregar

Consulta `GET /orders/PEDIDO_ID/balance`. Registra otro pago por S/70:

```json
{
  "orderId": "PEDIDO_ID",
  "paymentDate": "2026-09-23",
  "method": "CASH",
  "amount": 70
}
```

Finalmente ejecuta `POST /orders/PEDIDO_ID/deliver`. El pedido queda `DELIVERED`. No permite entregar si falta pagar o completar producción.

## Clientes y direcciones

### Cliente — POST /customers

| Campo | Obligatorio | Cómo llenarlo |
| --- | --- | --- |
| `firstName` | Sí | Nombres, 2–100 caracteres. |
| `lastName` | Sí | Apellidos, 2–100. |
| `phone` | Sí | Texto, 7–20; conserva prefijos y ceros. |
| `email` | No | Email válido, hasta 150. |

`PATCH /customers/:id` admite esos campos de forma parcial.

### Dirección — POST /customers/:customerId/addresses

| Campo | Obligatorio | Cómo llenarlo |
| --- | --- | --- |
| `type` | Sí | Etiqueta libre, por ejemplo `DELIVERY`, hasta 50. |
| `recipient` | Sí | Quien recibe, 2–150. |
| `phone` | Sí | 7–20 caracteres. |
| `department`, `province`, `district` | Sí | Texto no vacío, hasta 100 cada uno. |
| `address` | Sí | Dirección, hasta 255. |
| `reference` | No | Referencia para ubicarla, hasta 255. |

El cliente se indica en la URL, no en el cuerpo. Para listar sus direcciones: `GET /customers/:customerId/addresses`. Para consultar/editar/eliminar una: `/addresses/:id`. El pedido actual no recibe `addressId`; no agregues ese campo al payload.

## Catálogo y unidades

Estas altas/ediciones son de ADMIN. STAFF puede consultar para llenar selectores.

| Formulario / POST | Campos obligatorios | Opcionales |
| --- | --- | --- |
| `/categories` | `name` (2–100) | `description` (hasta 255) |
| `/units` | `name` (2–50), `abbreviation` (1–10), `type` | Ninguno |
| `/products` | `categoryId`, `name` (2–150), `slug` (2–180, único) | `description` (500), `brand` (100), `status` (20; por defecto `ACTIVE`) |
| `/product-units` | `productId`, `unitId`, `conversionFactor`, `price`, `trackStock`, `isPurchaseUnit`, `isSaleUnit` | Ninguno |

Tipos de unidad: `COUNT` (conteo), `LENGTH` (longitud), `WEIGHT` (peso), `PACKAGE` (paquete). Ejemplo de unidad:

```json
{
  "name": "Metro",
  "abbreviation": "m",
  "type": "LENGTH"
}
```

Una presentación relaciona producto y unidad. Ejemplo para `POST /product-units`:

```json
{
  "productId": "PRODUCTO_ID",
  "unitId": "UNIDAD_ID",
  "conversionFactor": 1,
  "price": 4.5,
  "trackStock": true,
  "isPurchaseUnit": true,
  "isSaleUnit": true
}
```

`conversionFactor` es como mínimo `0.0001`; `price` no puede ser negativo. Los tres booleanos son obligatorios. El inventario se lleva por `productUnitId`: los movimientos actuales usan la cantidad de esa presentación y no convierten automáticamente stock de rollos a metros por el factor.

## Cotizaciones y pedidos con ítems

Este flujo es opcional. Para encargos simples se puede usar directamente `agreedPrice` como en el recorrido anterior.

### Cotización

`POST /quotes` recibe:

| Campo | Obligatorio | Cómo llenarlo |
| --- | --- | --- |
| `customerId` | Sí | Cliente seleccionado. |
| `quoteDate` | Sí | Fecha de cotización. |
| `validUntil` | No | Fecha de validez, no anterior a `quoteDate`. |
| `notes` | No | Hasta 500 caracteres. |

Comienza en `DRAFT`. Agrega sus líneas con `POST /quote-items`:

```json
{
  "quoteId": "COTIZACION_ID",
  "itemType": "CUSTOM",
  "description": "Cinco bandas personalizadas",
  "quantity": 5,
  "unitPrice": 20
}
```

Para vender catálogo usa `itemType: "PRODUCT"` y agrega `productUnitId` de una presentación con `isSaleUnit: true`. Para `CUSTOM`, no envíes `productUnitId`.

- Cada línea exige descripción no vacía (hasta 255), cantidad positiva y precio unitario no negativo.
- Edita líneas con PATCH enviando `description`, `quantity` o `unitPrice`; no permite cambiar su padre ni producto por ese PATCH.
- La cotización y sus líneas se editan mientras está en `DRAFT`.
- `PATCH /quotes/:id` admite datos de cabecera y `discount`; el descuento no puede superar el subtotal.
- `POST /quotes/:id/send`: requiere líneas y total positivo; pasa de `DRAFT` a `SENT`. **Cambia el estado; no envía correo ni WhatsApp.**
- Desde `SENT`, usa `/accept`, `/reject` o `/expire`.
- `/cancel` permite cancelar `DRAFT` o `SENT`. `/expire` es una acción explícita; no hay vencimiento automático programado.

### Convertir cotización aceptada a pedido

`POST /orders`:

```json
{
  "customerId": "CLIENTE_ID",
  "orderDate": "2026-09-23",
  "quoteId": "COTIZACION_ID"
}
```

La cotización debe estar `ACCEPTED`, tener líneas y pertenecer al mismo cliente. La API copia líneas y totales. No se puede generar otro pedido para la misma cotización ni enviar `agreedPrice` junto con `quoteId`.

### Pedido con líneas, sin cotización

Crea el pedido con `customerId`, `orderDate` y opcionalmente `notes`, omitiendo `agreedPrice` y `quoteId`. Después usa `POST /order-items` con los mismos campos de una línea de cotización, reemplazando `quoteId` por `orderId`.

El pedido admite líneas mientras está `PENDING`. Un pedido con `agreedPrice` no admite líneas. `PATCH /orders/:id` permite `orderDate`, `notes`, `discount` y `agreedPrice` según esas reglas; habitualmente solo en `PENDING`.

`agreedPrice` debe ser mayor que cero, como mínimo `0.01`, máximo `9999999999.99`, con hasta 2 decimales. El total es precio acordado menos descuento. Para pedidos antiguos sin ítems/cotización, sin precio ni pagos y subtotal cero, se permite asignarlo una sola vez también en `CONFIRMED`, `IN_PROGRESS` o `READY`: envía únicamente `agreedPrice` en ese PATCH.

### Estados del pedido

| Acción POST /orders/:id/... | Estado inicial | Resultado / requisito |
| --- | --- | --- |
| `confirm` | `PENDING` | `CONFIRMED`; requiere líneas o precio acordado y total positivo. |
| `start` | `CONFIRMED` | `IN_PROGRESS`; descuenta stock de líneas PRODUCT con seguimiento. |
| `ready` | `IN_PROGRESS` | `READY`; exige producciones vinculadas completas, si existen. |
| `deliver` | `READY` | `DELIVERED`; total positivo, saldo cero y producciones completas. |
| `cancel` | `PENDING` / `CONFIRMED` | `CANCELLED`, sujeto a las reglas de cancelación. |

Para una venta sin producción: confirmar → iniciar → marcar listo → cobrar saldo → entregar. Si tiene productos con stock, debe haber existencias suficientes al iniciar. El inicio de la producción no sustituye `/orders/:id/start` para descontar esas líneas. La finalización de producción puede marcar el pedido `READY` directamente, pero rechaza saltarse el inicio de un pedido con líneas que requieren stock.

## Producción, tareas y materiales

### Producción — POST /productions

Solo requiere `orderId`; `notes` es opcional (texto no vacío de hasta 500). **No recibe ítems.** Se permite una producción por pedido; no se crea para pedidos `READY`, `DELIVERED` o `CANCELLED`.

- Editar notas mientras está `PENDING`. No se puede cambiar de pedido.
- `/start`: requiere `PENDING` y al menos una tarea; pasa a `IN_PROGRESS` y registra `startedAt`.
- `/complete`: requiere producción iniciada y todas sus tareas `COMPLETED`; registra `completedAt` y pone el pedido `READY`.
- Repetir `/complete` sobre una producción completada permite sincronizar un pedido que quedó pendiente, si cumple las validaciones; no vuelve a registrar la fecha de finalización.
- `/cancel`: cancela el **pedido completo** bajo las reglas de cancelación, no solo esa producción.

### Prestador — POST /service-providers (ADMIN)

| Campo | Obligatorio | Cómo llenarlo |
| --- | --- | --- |
| `name` | Sí | Nombre no vacío, hasta 150. |
| `type` | Sí | `EMBROIDERER`, `SEAMSTRESS` u `OTHER`. |
| `phone` | No | Hasta 30. |
| `notes` | No | Hasta 500. |

### Tarea — POST /production-tasks

| Campo | Obligatorio | Cómo llenarlo |
| --- | --- | --- |
| `productionId` | Sí | Producción seleccionada. |
| `serviceProviderId` | Sí | Bordador/costurero/prestador seleccionado. |
| `description` | Sí | Trabajo a realizar, no vacío, hasta 255. |
| `quantity` | Sí | Cantidad, mínimo `0.0001`. |
| `unitCost` | Sí | Costo por unidad, mínimo `0`. |

El subtotal se calcula como cantidad × costo unitario. Crear/editar tareas únicamente con producción `PENDING`. PATCH admite descripción, cantidad y costo.

Con producción `IN_PROGRESS`, inicia cada tarea (`/production-tasks/:id/start`) y luego complétala (`/production-tasks/:id/complete`). No exige registrar pagos al prestador.

Cancelar una tarea solo se permite si ella y la producción están `PENDING`. Una tarea `CANCELLED` conserva su costo registrado y **bloquea completar la producción**, porque se exige que todas estén `COMPLETED`. Resuelve esa planificación antes de iniciar; un ADMIN puede eliminar la tarea mientras la producción sigue pendiente. No hay acción para reabrir tareas canceladas.

### Material — POST /production-materials

| Campo | Obligatorio | Cómo llenarlo |
| --- | --- | --- |
| `productionId` | Sí | Producción seleccionada. |
| `description` | Sí | Material utilizado, no vacío, hasta 255. |
| `quantity` | Sí | Mínimo `0.0001`, hasta 4 decimales. |
| `unitCost` | Sí | Costo no negativo, hasta 2 decimales. |
| `productUnitId` | No | Vinculación a catálogo si existe; se puede omitir. |

Se pueden registrar/editar materiales con producción `PENDING` o `IN_PROGRESS`, siempre que el pedido no esté cancelado ni entregado. PATCH admite descripción, cantidad, costo y producto opcional; `productUnitId: null` quita la vinculación al catálogo. No cambia de producción.

Los materiales registran costos; **no descuentan inventario**, aunque tengan `productUnitId`. Tampoco exigen registrar si se pagaron. No es obligatorio agregar materiales para completar producción.

### Consulta de costos

`GET /productions/:id/costs` devuelve `productionId`, `status`, `tasksCount`, `materialsCount`, `tasksCost`, `materialsCost` y `totalCost`. Suma subtotales de tareas (incluidas las canceladas) y materiales. No modifica precio de venta ni saldo del cliente.

## Pagos y entrega

### Pago — POST /payments

| Campo | Obligatorio | Cómo llenarlo |
| --- | --- | --- |
| `orderId` | Sí | Pedido seleccionado. |
| `paymentDate` | Sí | Fecha del cobro. |
| `method` | Sí | `CASH` o `YAPE`. |
| `amount` | Sí | Mínimo `0.01`, hasta 2 decimales, sin superar el saldo. |
| `reference` | No | Número de operación/referencia, hasta 100. |
| `notes` | No | Hasta 500. |

Se puede cobrar un pedido confirmado o posterior, excepto cancelado. No se cobra mientras está `PENDING`. No hay endpoints para editar/eliminar pagos ni un flujo de devoluciones en esta versión. Comprueba importe, método y pedido antes de guardar.

`GET /orders/:id/balance` devuelve `orderId`, `total`, `paid` y `remaining`. Refresca esa consulta después de cobrar. Para entregar usa `POST /orders/:id/deliver`; el servidor valida saldo, total y producción.

## Compras e inventario

Este módulo registra compras de mercadería y stock. Los costos de materiales de producción se registran por separado: no se genera una compra automáticamente al agregar un material.

### Proveedor — POST /suppliers (ADMIN)

`name` obligatorio, no vacío, hasta 150. Opcionales: `phone` (20), `email` válido (150), `address` (255), `notes` (500). Es el proveedor de mercadería; los bordadores/costureros se registran en `service-providers`.

### Compra y líneas (ADMIN)

1. `POST /purchases` con `supplierId`, `purchaseDate` y opcional `notes` (hasta 500). Omite `status` para crearla `PENDING`.
2. Agrega líneas en `POST /purchase-items`:

```json
{
  "purchaseId": "COMPRA_ID",
  "productUnitId": "PRESENTACION_ID",
  "quantity": 10,
  "unitCost": 3
}
```

3. La presentación debe tener `isPurchaseUnit: true`. Cantidad mínima `0.0001`; costo no negativo. Se calcula el subtotal.
4. Edita cabecera/líneas mientras la compra está `PENDING`. PATCH de cabecera admite proveedor, fecha y notas, no estado.
5. Ejecuta `POST /purchases/:id/complete`: requiere al menos una línea, marca `COMPLETED` y suma existencias para presentaciones con `trackStock: true`, creando inventario si hace falta y movimientos `IN` con razón `PURCHASE`.

No crees una compra con `status: "COMPLETED"` desde el formulario: el movimiento de stock lo realiza la acción `/complete`. No existe ruta de cancelación de compras en esta versión. Solo se elimina una compra pendiente.

### Inventario (ADMIN)

Crear inventario inicial: `POST /inventory` con `productUnitId` y `quantity` (mínimo `0`). La presentación debe llevar stock y no tener otro registro de inventario. El stock inicial no genera por sí mismo un movimiento histórico.

`PATCH /inventory/:id` permite modificarlo directamente; cambiar `quantity` reemplaza la existencia y no crea movimiento. Para dejar historial de entradas/salidas/ajustes usa `POST /inventory-movements`:

```json
{
  "inventoryId": "INVENTARIO_ID",
  "type": "IN",
  "quantity": 10,
  "reason": "Ingreso inicial verificado"
}
```

| Campo | Regla |
| --- | --- |
| `inventoryId` | Obligatorio, UUID del inventario. |
| `type` | `IN` suma; `OUT` resta; `ADJUSTMENT` reemplaza la cantidad existente. |
| `quantity` | Obligatoria, mínimo `0.0001`. En ADJUSTMENT es el saldo final, no la diferencia. |
| `reason` | Obligatorio, texto no vacío hasta 100. |
| `referenceId` | Opcional, UUID de referencia. |

OUT rechaza stock insuficiente. Un movimiento ADJUSTMENT actualmente no acepta cero; PATCH de inventario sí admite cero, sin historial de movimiento. Los movimientos solo se crean/consultan: no tienen PATCH/DELETE.

## Cancelaciones

Solo se cancela un pedido cuando se cumplen **todas** estas condiciones:

1. Está `PENDING` o `CONFIRMED`.
2. Es el mismo día calendario de su creación real (`createdAt`) y de `orderDate`, según `BUSINESS_TIMEZONE` (por defecto Lima).
3. No tiene ningún pago, ni siquiera un adelanto.
4. No se inició ninguna producción ni trabajo.

Cambiar `orderDate` no permite cancelar un pedido creado otro día. El inicio de producción deja constancia de que se comprometieron materiales/trabajo: regístralo antes de comprarlos o contratarlos, pues el sistema no puede detectar acuerdos fuera de la API.

`POST /orders/:id/cancel` cancela también producción y tareas pendientes vinculadas. `POST /productions/:id/cancel` realiza esa misma cancelación del pedido completo; la pantalla debe explicarlo antes de ejecutar. No se puede reiniciar una producción cancelada. Eliminar registros no permite evadir estas restricciones.

## Referencia de rutas

Todas requieren Bearer salvo `POST /auth/login` y `GET /health`; Swagger es accesible cuando está habilitado.

Para los recursos de esta tabla, CRUD significa: `POST /recurso`, `GET /recurso`, `GET /recurso/:id`, `PATCH /recurso/:id`, `DELETE /recurso/:id`. DELETE siempre es de ADMIN y puede estar restringido por estado o relaciones existentes.

| Recurso | Rutas CRUD | Operaciones adicionales |
| --- | --- | --- |
| `customers` | Sí | Direcciones anidadas descritas abajo. |
| `categories`, `units`, `products`, `product-units` | Sí | Escrituras solo ADMIN. |
| `suppliers`, `service-providers` | Sí | Escrituras solo ADMIN. |
| `quotes` | Sí | POST `:id/send`, `accept`, `reject`, `cancel`, `expire`. |
| `quote-items`, `order-items` | Sí | Editar campos permitidos según estado del padre. |
| `orders` | Sí | GET `:id/balance`; POST `:id/confirm`, `start`, `ready`, `deliver`, `cancel`. |
| `productions` | Sí | GET `:id/costs`; POST `:id/start`, `complete`, `cancel`. |
| `production-tasks` | Sí | POST `:id/start`, `complete`, `cancel`. |
| `production-materials` | Sí | Costos; sin cambios automáticos de inventario. |
| `purchases` | Sí | POST `:id/complete`; escrituras ADMIN. |
| `purchase-items`, `inventory` | Sí | Escrituras ADMIN. |
| `payments` | Solo POST y ambos GET | Sin PATCH/DELETE. |
| `inventory-movements` | Solo POST y ambos GET | Crear solo ADMIN; sin PATCH/DELETE. |

Rutas especiales:

- Direcciones: POST/GET `/customers/:customerId/addresses`; GET/PATCH/DELETE `/addresses/:id`.
- Auth: POST `/auth/login`, GET `/auth/me`, POST `/auth/logout`, POST `/auth/change-password`.
- Usuarios (ADMIN): POST/GET `/users`, PATCH `/users/:id`, POST `/users/:id/reset-password`. No hay GET individual ni DELETE de usuarios.

Los DELETE no son equivalentes a cancelar: cotizaciones se borran en borrador, pedidos/producciones/compras tienen restricciones de pendiente y negocio. Para conservar historial utiliza las acciones de estado donde correspondan.

## Integración con el frontend

### Pantallas para una primera versión sencilla

1. Inicio de sesión.
2. Clientes y sus direcciones.
3. Pedidos: cliente, fecha, descripción en notas y precio acordado; detalle con pagos/saldo y producción.
4. Producción: lista de tareas, materiales, costos y botones para iniciar/completar.
5. Administración: catálogo, prestadores, proveedores, compras/inventario y usuarios.
6. Cotizaciones y pedidos con líneas cuando se necesite esa modalidad.

No pidas ítems para el encargo con precio acordado. Para un material basta descripción, cantidad y costo; catálogo opcional. No agregues campos de pago a prestadores/materiales porque la API no los implementa.

### Ejemplo mínimo de cliente HTTP

Este ejemplo conserva el token en memoria: recargar la página requiere iniciar sesión nuevamente. Configura `API_URL` por entorno en el frontend y añade su origen a `CORS_ORIGINS` del backend.

```js
const API_URL = 'http://localhost:3000';
let accessToken = null;

async function api(path, { method = 'GET', body } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const raw = await response.text();
  let data;
  try { data = raw ? JSON.parse(raw) : null; }
  catch { data = { message: raw }; }
  if (!response.ok) {
    if (response.status === 401) accessToken = null;
    const message = Array.isArray(data?.message)
      ? data.message.join('\n')
      : data?.message || `Error HTTP ${response.status}`;
    throw Object.assign(new Error(message), { status: response.status });
  }
  return data;
}

async function login(email, password) {
  const session = await api('/auth/login', {
    method: 'POST', body: { email, password },
  });
  accessToken = session.accessToken;
  return api('/auth/me');
}

async function createOrder(customerId, orderDate, priceInput, notes) {
  const agreedPrice = Number(priceInput);
  if (!String(priceInput).trim() || !Number.isFinite(agreedPrice) || agreedPrice <= 0) {
    throw new Error('Ingresa un precio mayor que cero');
  }
  return api('/orders', {
    method: 'POST',
    body: { customerId, orderDate, agreedPrice, ...(notes ? { notes } : {}) },
  });
}
```

Presenta los errores cerca del formulario y conserva los datos escritos. Después de acciones como completar, cobrar o cancelar, vuelve a consultar el pedido/producción y su saldo para actualizar los estados visibles.

Deshabilita el botón mientras se envía la petición para evitar duplicados. No reintentes automáticamente altas o cobros tras un error de red: consulta primero si se guardaron. No hay claves de idempotencia generales implementadas.

### Errores habituales

| Respuesta/síntoma | Qué revisar |
| --- | --- |
| `400` | Campos desconocidos, UUID inválido, números como texto, fecha, estado o regla del negocio. Leer `message` (puede ser array). |
| `401` | Credenciales incorrectas o sesión vencida/revocada. Volver a iniciar sesión. |
| `403` | Cuenta sin permiso. Ocultar/deshabilitar acciones por rol, sin sustituir la validación del backend. |
| `404` | ID inexistente o ruta incorrecta. |
| `409` | Conflicto/duplicado según el recurso. |
| `429` | Demasiados intentos de autenticación. Esperar; no repetir automáticamente. |
| Error CORS en navegador | Revisar origen exacto, puerto y reinicio tras cambiar `.env`. |
| Error de conexión a PostgreSQL | Comprobar servicio, `DB_*`, contraseña y existencia de la base. |
| Tablas inexistentes | Ejecutar migraciones con la conexión correcta. |
| Error al entregar | Revisar READY, total positivo, saldo cero y producción completa. |
| Producción no completa | Todas las tareas deben estar COMPLETED; incluso una cancelada impide completar. |

Los cuerpos JSON tienen un límite de 32 KB. No hay subida de archivos en estos formularios.

## Mantenimiento y publicación

### Ejecutar en modo producción sin Docker

Configura `.env` con `NODE_ENV=production`, `DB_SYNCHRONIZE=false`, conexión real y origen del frontend. Después:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm db:migrate
pnpm start:prod
```

`start:prod` ejecuta el código compilado; **no cambia `NODE_ENV` por sí solo**. En producción Swagger queda apagado salvo que habilites `ENABLE_SWAGGER=true`.

Para un servidor público configura HTTPS y un supervisor de procesos del servidor para mantener Node activo/reiniciarlo. Con proxy local, la API puede seguir escuchando en `127.0.0.1`. Configura `TRUST_PROXY=1` solo con la topología de un proxy de confianza. Subir el repositorio no publica ni ejecuta la API automáticamente.

Los archivos Docker/Compose/Caddy existentes son una alternativa opcional de despliegue; no intervienen en los pasos de instalación directa de esta guía.

### Actualizar una instalación con datos

1. Respaldar la base con `pnpm db:backup` usando la conexión actual.
2. Traer la versión nueva conservando `.env` privado.
3. Ejecutar `pnpm install --frozen-lockfile` y `pnpm build`.
4. Aplicar `pnpm db:migrate`.
5. Reiniciar el proceso y comprobar `/health` y el inicio de sesión.

### Respaldos

```bash
pnpm db:backup
```

Requiere `pg_dump` y guarda un archivo privado en `.local/backups/`. Guarda una copia fuera de la máquina y programa respaldos según el uso del negocio; este comando no instala una programación automática.

Para comprobar recuperación, crea una **base nueva** y restaura ahí, no sobre la base activa:

```bash
createdb -h localhost -U merceria merceria_recuperacion
pg_restore -h localhost -U merceria --no-owner -d merceria_recuperacion RUTA_AL_RESPALDO.dump
```

El rol debe poder crear esa base o un administrador debe crearla y asignársela. Los respaldos contienen datos privados y hashes de credenciales: no van al repositorio.

### Comprobaciones de código

```bash
pnpm build
pnpm test --runInBand
```

`pnpm test:release` usa PostgreSQL real y **vacía la base de pruebas**. Nunca lo ejecutes con la base del negocio. Configura todas las variables `DB_*` para una base separada cuyo nombre termine en `_test`, aplica migraciones y habilita explícitamente el reinicio:

```bash
# Solo después de apuntar DB_* a la base exclusiva de pruebas.
pnpm db:migrate
ALLOW_TEST_RESET=true pnpm test:release
```

Incluye autenticación/permisos y recorridos de pedido, pago, costos y entrega. Más detalles técnicos del conjunto de pruebas en `test/RELEASE-TESTS.md`.

### Qué subir al repositorio

Incluye código fuente, `scripts/` con sus migraciones, pruebas, `package.json`, `pnpm-lock.yaml`, configuraciones, `.env.example` y este README. Las migraciones son necesarias aunque no uses Docker.

No subas `.env`, credenciales, `.local/`, respaldos, `node_modules/` ni `dist/`. Están excluidos por las reglas correspondientes de `.gitignore`; comprueba los archivos antes de confirmar:

```bash
git status --short
git diff --check
git diff -- README.md
```

Esta guía centraliza el uso del backend y la referencia de formularios. Swagger complementa la consulta interactiva de los contratos disponibles.
