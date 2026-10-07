# Verificación de roles y transferencia de vehículos — 6 de octubre de 2026

## Entorno

Se usaron cuentas ficticias y PostgreSQL local en `127.0.0.1:55432`, base `81cc_role_transfer_test`. La configuración habitual de `backend/.env` y su base en el puerto 5433 no se modificaron. Las migraciones se aplicaron únicamente en la base de prueba. No se publicó ni se desplegó este trabajo.

## Sesiones comprobadas en el navegador

| Rol | Resultado observado |
| --- | --- |
| Dueño | Login, dashboard, finanzas, equipo, cuenta, sesiones, directorio e historial cargaron. Se transfirió TA1800CD de María a Andrea desde el formulario. La pantalla mostró éxito, nuevo titular, auditoría y la misma orden, repuestos, avances y revisión. |
| Empleado | Login, dashboard, tablero y órdenes cargaron. Se abrió una orden y se guardó un diagnóstico; el listado reflejó el cambio. El menú no ofrece las funciones exclusivas del dueño. |
| Superadministrador | Login redirigió al panel de plataforma. Se cargaron talleres, contratos, planes, métricas y usuarios. Se abrió el laboratorio y se volvió al panel. No se cambiaron contratos ni permisos. |
| Cliente anterior | Login en el portal mostró el auto, reparación e historial. Después de transferirlo, actualizar el portal dejó de mostrar ese auto. |
| Cliente comprador | Login con el comprador creado por las pruebas de integración mostró el vehículo recibido, historial previo, actualización del taller y color conservado, con ficha personal limpia. |

No se observaron errores de consola en las pestañas de estas pruebas. Se verificó visualmente la versión de escritorio. El control de tamaño del navegador no aplicó el ancho de 390 px solicitado durante esta comprobación, por lo que no se da por validada la nueva ventana en móvil.

El login rechazaba al empleado de demostración por tener una contraseña existente de cuatro caracteres. Se corrigió el requisito de ingreso para aceptar contraseñas existentes no vacías. El alta y restablecimiento mantienen su longitud mínima de seis caracteres.

## Uso de la transferencia

1. Iniciar sesión como dueño del taller.
2. Abrir **Directorio** y seleccionar la patente del vehículo.
3. Pulsar **Transferir a otro cliente**.
4. Elegir un cliente ya registrado en el mismo taller, agregar una nota opcional y confirmar.

La operación cambia el titular del mismo vehículo: no crea una copia ni cambia su identificador. Conserva órdenes, turnos, repuestos, revisiones y avances. Registra titular anterior y nuevo, usuario responsable, fecha y nota. El anterior cliente pierde acceso en el portal; el nuevo lo obtiene mediante su cuenta de cliente.

La ficha personal anterior (alias, notas, seguro y póliza) se archiva para el dueño y se limpia para el nuevo cliente. El color se conserva. La ficha archivada no se expone al nuevo cliente ni al empleado.

La API admite la operación solo al dueño, dentro de su taller. Rechaza otro taller, el titular actual como destino, entradas incompletas y confirmaciones con un titular desactualizado. El cambio de titular, la auditoría y el archivo de ficha se guardan en una transacción.

## Validación automatizada

- Backend: compilación y 16 tests unitarios aprobados.
- Integración con PostgreSQL: 5 pruebas aprobadas, incluida la de salud y cuatro pruebas de roles/transferencia. Se inicia sesión realmente contra la API con dueño, empleado, superadministrador y ambos clientes.
- Se compara el historial completo antes/después, se comprueban ficha archivada y acceso del comprador, y se rechaza acceso del vendedor después del cambio.
- Frontend: lint y build aprobados; build incluye la verificación TypeScript.

La suite adicional está en `backend/test/roles-transfer.e2e-spec.ts`. Por defecto se omite; exige `RUN_DATABASE_E2E=true` y una URL PostgreSQL local cuyo nombre de base termine en `_test`. Crea fixtures nuevos por ejecución, que permanecen exclusivamente en esa base de prueba.

Para ejecutarla desde `backend`, usando el PostgreSQL de prueba ya iniciado:

```powershell
$env:DATABASE_URL = 'postgresql://postgres@127.0.0.1:55432/81cc_role_transfer_test'
$env:DIRECT_URL = $env:DATABASE_URL
$env:RUN_DATABASE_E2E = 'true'
npm run test:e2e -- --runInBand
```

## Incorporación al entorno habitual

Antes de iniciar el backend actualizado sobre otra base, generar el cliente Prisma y aplicar las migraciones mediante `npx prisma generate` y `npx prisma migrate deploy`. Las migraciones nuevas son `20261006000000_vehicle_ownership_transfers` y `20261006000100_archive_transfer_profile`. En Windows, detener el backend antes de regenerar Prisma para liberar su DLL.

Este recorrido comprueba los flujos descritos; no certifica todas las variantes del producto. Los pendientes de correo, verificación de identidad, revocación de sesión, entrega y límites de planes del informe `REVISION-CODIGO.md` siguen pendientes. No se probaron proveedores externos de Google/correo ni operaciones de producción.
