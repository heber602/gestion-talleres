# Revisión de código y frontend — 6 de octubre de 2026

**Actualización posterior:** se comprobó el ingreso con todos los roles en un PostgreSQL local separado y se implementó la transferencia de vehículos. El recorrido, las pruebas y el alcance actualizado están en [VERIFICACION-ROLES.md](VERIFICACION-ROLES.md). Las limitaciones de sesiones autenticadas y migraciones que aparecen abajo describen la primera revisión.

## Alcance y límites

Revisión estructural del repositorio, contratos entre Next.js y NestJS, autenticación, permisos, agenda, órdenes, inventario, clientes, portal, finanzas, planes, configuración de arranque y código Java anterior. Se ejecutaron análisis estáticos y compilaciones del frontend/backend activos. Se inspeccionaron en navegador el login y el registro, incluida la disposición móvil de 390 px y la validación de campos obligatorios.

Las pantallas autenticadas se revisaron en código y mediante pruebas de regresión de servicios; no se recorrieron con una sesión conectada a una base real. No se ejecutaron migraciones, no se modificaron datos de producción y no se desplegaron los cambios. Las pruebas con mocks no sustituyen una prueba de integración con PostgreSQL ni una auditoría de seguridad exhaustiva.

## Problemas corregidos

| Área | Problema encontrado | Resultado |
| --- | --- | --- |
| Permisos | Un dueño podía invitar un `superadmin` de plataforma como “Soporte avanzado”. | Solo se admiten empleados; se rechazan también invitaciones antiguas con otros roles. |
| Portal | El registro público podía sobrescribir contraseñas de cuentas existentes del mismo email. | Se rechaza el registro cuando ya existe una cuenta de portal. Se bloquea también la reasignación de una patente de otro cliente. |
| Google | El retorno guardaba un token sin actualizar AuthContext; el estado OAuth no estaba vinculado al navegador. | Se verifica el token y se hidrata la sesión; el estado aleatorio se comprueba contra una cookie HttpOnly y se exige email verificado por Google. |
| Login | Desmarcar “Recordarme” borraba el token necesario para consultar la API. | Se usa sessionStorage para esa sesión y localStorage para sesiones recordadas. Ambas variantes funcionan en la selección de taller. |
| Login | La redirección dependía de un email específico en lugar del rol real. | Se usa el rol devuelto por el servidor. |
| Recuperación | La interfaz prometía enviar un correo, pero no hay implementación de envío. | Se elimina la promesa; en producción se informa que el servicio no está disponible. El enlace de desarrollo sigue disponible. |
| Sesión | Un fallo transitorio de red borraba la sesión; la carga inicial dejaba una pantalla vacía. | Se conserva el token ante fallos de red, se muestra un estado de carga y se permite reintentar. En el portal también se conservan los tokens ante errores transitorios. |
| Dashboard | “Turnos de hoy” contaba toda la agenda; los próximos turnos incluían los antiguos. | Se aplica la fecha de Buenos Aires, se filtran turnos futuros pendientes y se muestra su fecha. |
| Dashboard | “Vehículos en taller” era otro contador de órdenes. | Se cuentan vehículos distintos con órdenes activas o listas para entregar. Los indicadores no muestran cero mientras faltan datos. |
| Fechas | Las fechas de calendario a medianoche UTC se mostraban un día antes en Argentina. | Los turnos y revisiones usan un formateador de fechas de calendario, separado de los instantes de actividad. |
| Ingreso | El formulario de clientes no validaba campos requeridos ni email. | Se usa un formulario con validación nativa y DTOs en la API; ingreso y turno se guardan en una transacción. |
| Clientes | La “última orden” se tomaba únicamente del primer vehículo. | Se calcula la fecha más reciente entre todos los vehículos del cliente. Se bloquean ingresos que cambiarían el titular de una patente existente. |
| Tablero | Cambios de etapa podían dejar turno y orden desincronizados. | Se guardan en una transacción; se validan transiciones y se rechazan movimientos sobre etapas que cambiaron. Se ocultan turnos cancelados. |
| Inventario | Se permitían valores negativos/fraccionarios y descuentos con stock insuficiente. | Se validan datos y se reserva stock de forma condicional dentro de una transacción. |
| Repuestos | Agregar otra unidad podía cambiar precio, costo u origen de todas las unidades anteriores. | Se rechazan mezclas incompatibles y se incrementa la cantidad sin perder incrementos simultáneos. |
| Órdenes | Borrar el diagnóstico no lo borraba en el servidor; una actualización incompleta al cliente se descartaba silenciosamente. | Se envía el diagnóstico vacío y se exige título y mensaje juntos. |
| Finanzas | Se presentaban presupuestos como ingresos reales y costos estimados como ganancia neta. | Se explica el cálculo y se usan etiquetas de presupuesto/margen estimado; el gráfico incluye costos. La API exige rol de dueño. |
| Prioridad | El margen bajo convertía órdenes nuevas o sin presupuesto en “urgentes”. | Se utiliza el mismo criterio de motivo/diagnóstico empleado por el tablero. Sigue siendo una inferencia, no una prioridad elegida manualmente. |
| Paneles | Los errores de guardado quedaban detrás del panel y la navegación móvil podía tapar acciones. | Se muestran errores dentro del panel y se eleva su capa sobre el menú móvil. Se ajusta el desplazamiento de órdenes en pantallas pequeñas. |
| Navegación | No había cierre de sesión móvil; el superadmin no podía abrir `/sesiones`. | Se agrega cierre móvil y se permite la ruta con acceso de retorno al panel de plataforma. |
| Historial | Se mostraban estados técnicos y se ocultaba una revisión si solo tenía fecha. | Se muestran etiquetas comprensibles y la fecha de revisión aunque no tenga nota. |
| Sesiones | Las sesiones vencidas aparecían activas; la API permitía consultar el registro a empleados. | Se considera la expiración y se limita el registro a dueños/superadmin. La tabla permite desplazamiento horizontal. |
| Login móvil | La presentación completa aparecía antes del formulario. | El formulario aparece primero. |
| Textos | Había referencias a SQL, a Taller 2R, facturación automática, datos demo sin identificar y un testimonio sin respaldo en el código. | Se corrigen textos y marca, se identifican los datos ilustrativos y se elimina el testimonio. |
| Arranque | Backend y frontend usaban por defecto el puerto 3001. | Backend 3000 y frontend 3001; README corregido. |
| Límites de solicitudes | Los decoradores usaban `default` mientras el límite se llamaba `global`; 20 solicitudes/minuto interferían con la operación del tablero. | Se alinea el nombre y se mantienen límites estrictos de login/recuperación con un límite general de 120. |
| Producción | `start:prod` ejecutaba `db push --accept-data-loss`. Se creaban cuentas demo si la base estaba vacía. | Se utilizan migraciones y el seed demo en producción requiere `SEED_DEMO_DATA=true`. |
| Pruebas | La prueba HTTP todavía esperaba “Hello World!” y cargaba módulos con acceso a la base. | Se verifica el contrato real de salud y se aísla la prueba para no sembrar datos. |

## Pendientes detectados

1. **Alta prioridad: verificar identidad en el portal.** El registro todavía no demuestra la propiedad del email antes de vincular clientes sin cuenta. Además, el historial se agrupa entre talleres por email. Bloquear la sobrescritura de contraseñas corrige un ataque concreto, pero hace falta verificación por correo o invitación validada para cerrar todo el flujo. Revisar también cuentas `superadmin` que pudieron crearse con invitaciones anteriores; los cambios no revocan cuentas ya existentes.
2. **Recuperación de acceso.** Falta conectar un proveedor de correo y gestionar entrega, caducidad y revocación de sesiones al restablecer la contraseña. Actualmente la recuperación pública en producción informa indisponibilidad.
3. **Cierre de sesión real.** El frontend elimina el token, pero no hay endpoint que revoque la sesión en el servidor. El registro puede seguir mostrando esa sesión activa hasta que expire.
4. **Planes y capacidad.** Se calculan cupos de usuarios/órdenes, pero no se aplican al crear invitaciones ni al ingresar órdenes. La restricción de acceso distingue pruebas gratuitas, pero no bloquea automáticamente contratos pagos vencidos. Necesita definirse y aplicarse una política consistente.
5. **Entrega de vehículos.** El tablero termina en “Listos para entregar” y no tiene una acción de entrega que retire el vehículo. No se añadió un estado nuevo sin definir su efecto en historial, agenda y métricas.
6. **Datos auxiliares y migraciones.** Varias tablas administrativas y perfiles se crean/alteran durante solicitudes. Parte del modelo sigue en SQL manual fuera del esquema Prisma. Conviene migrarlo a un esquema y migraciones consistentes.
7. **Operaciones de varias escrituras.** El alta de dueño/cliente, aceptación de invitación y actualización de orden con mensaje aún requieren ampliar la cobertura transaccional y probar concurrencia con PostgreSQL real.
8. **Idiomas.** El selector traduce login, menú y dashboard; otras páginas mantienen textos en español. La interfaz debe completar las traducciones o explicar su alcance.
9. **Carga y recuperación de errores.** Aún hay listados que comienzan vacíos mientras cargan y no ofrecen reintento. Finanzas puede mantener cifras del período anterior si la nueva consulta falla. La navegación entre historiales también necesita cancelar respuestas anteriores para evitar datos desactualizados.
10. **Finanzas reales.** No hay registro de pagos ni cálculo de costos laborales reales. El 45% de mano de obra es una estimación fija; los importes se agrupan por creación de la orden. La zona horaria de los períodos financieros aún depende del servidor.
11. **Java anterior incompleto.** `UserService.java`, `WorkshopService.java`, varios controladores/repositorios y un servicio duplicado están vacíos. El test de AssignedWorkshop está dentro de `src/main` y le falta importar AssignedWorkshopId. La aplicación Spring está en un subpaquete que no escanea los demás componentes por defecto, y properties está en `src/resources` en lugar de `src/main/resources`. No se ejecutó Maven: esta parte no es el backend que consume Next.js y necesita decidirse si se mantiene o archiva.

## Validación realizada

- Frontend: `npx tsc --noEmit`, `npm run lint` y `npm run build` pasaron. Build generó todas las rutas.
- Backend: `npm run build` y `npm test -- --runInBand` pasaron: 5 suites, 16 pruebas.
- HTTP de salud: `npm run test:e2e -- --runInBand` pasó: 1 prueba. Esta prueba no cubre autenticación ni PostgreSQL.
- Navegador local: login, registro, validación obligatoria y disposición móvil; se confirmó que el login queda visible antes de la presentación.
- `git diff --check` sin errores de espacios. Git muestra avisos de conversión LF/CRLF propios de Windows.

Pruebas de regresión agregadas para fecha de Buenos Aires, métricas distintas, permisos financieros, escalamiento de roles, sobrescritura de contraseñas, estado OAuth, datos inválidos, stock insuficiente, mezcla de repuestos, titular de patente, movimientos desactualizados y mensajes incompletos.
