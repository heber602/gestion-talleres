# Competencia y estrategia comercial de 81cc

Relevamiento: 6 de octubre de 2026. Foco inicial: talleres independientes de Argentina, de 1 a 5 personas. Las características son declaraciones públicas de los proveedores, no pruebas de sus aplicaciones. Precios publicados, sujetos a cambios; no se homogeneizaron impuestos, límites ni promociones. No se cambiaron precios ni planes de 81cc.

## Precios publicados

| Competidor | Precio mensual publicado | Alcance/condición relevante | Fuente |
| --- | --- | --- | --- |
| TallerTrack | ARS 18.000 / 35.000 / 80.000 | Entrada: 1 usuario y 10 vehículos; intermedio: 3 usuarios y 30 vehículos. La página no aclara en el texto consultado si el límite de vehículos es mensual o total. Anuncia WhatsApp automático, QR e IA; no se verificó su funcionamiento. | https://www.tallertrack.com.ar/ |
| Mecaris | ARS 28.000 base; finanzas +8.000 | Órdenes, clientes, vehículos, presupuestos y roles. Declara no cobrar por usuario ni por cantidad de órdenes. 14 días de prueba; producto en beta. | https://mecaris.ar/ |
| Vehix | ARS 40.000 / 70.000 / 90.000 | Base: administrador + mecánico; Profesional: usuarios ilimitados y ARCA. En Base/Starter la facturación ARCA es un adicional. 7 días de prueba. | https://vehix.com.ar/ |
| TallerOS | ARS 45.000 / 55.000 / 65.000 | Base PRO: usuarios y presupuestos ilimitados, stock; 55.000 suma turnos online; 65.000 suma facturador ARCA. 21 días de prueba. | https://talleros.ar/precios |
| TallerPro | ARS 50.000 / 75.000 / 145.000 | 3 / 6 / usuarios ilimitados respectivamente. Control agrega stock, cuenta corriente y fotos. Total agrega facturación y cobranzas. Precios sin IVA y ajuste mensual por IPC. | https://tallerpro.com.ar/ |
| Pits | ARS 69.300 / 142.000 / 212.000 | Tarifas referenciales regulares; anuncia 50% de descuento los primeros 3 meses. Límites de usuarios/sucursales por plan; app del cliente. | https://www.pitsx.com/ |
| Taller Alpha | USD 50 / 70 / 99 | 1 / 5 / usuarios ilimitados. Declara impuestos incluidos; módulos adicionales se cobran aparte. Referencia internacional, sin conversión a pesos. | https://talleralpha.com/precios/ |

Lectura: hay competencia económica y competencia con funciones mucho más amplias. Precio bajo, portal, historial y tablero por sí solos no constituyen una ventaja exclusiva. Vehix también publica reasignación de vehículos. La oportunidad de 81cc es hacer el flujo cotidiano más fácil para un segmento concreto y mantener una operación económica.

## Oferta propuesta, pendiente de validar

- **81cc Taller:** ARS 24.900 por mes por taller, hasta 5 usuarios, sin cobrar por historial ni por cliente. Incluir agenda, órdenes, stock básico, portal, transferencia e historial. Proponer órdenes sin cupo mensual, sujeto a dimensionar capacidad y publicar límites de almacenamiento/adjuntos claros. Esto es una propuesta comercial, no un cambio implementado.
- **Lanzamiento:** ARS 19.900 por mes durante 6 meses para los primeros 20 talleres. Informar desde el alta el precio posterior. Validar costos antes de comprometer la oferta.
- **Prueba:** 21 días sin tarjeta, demo con datos ficticios y ayuda breve para cargar la primera orden. A futuro, lectura/exportación cuando termina la prueba, sin borrar el historial.
- **Plan avanzado futuro:** alrededor de ARS 39.900, solo cuando existan valor y funciones adicionales comprobables: cobros/saldos, fotos y aprobación de presupuestos. ARCA o mensajería automática pueden ser adicionales con costos definidos. No vender funciones todavía inexistentes.

ARS 24.900 está aproximadamente 11% por debajo del base Mecaris y 45% por debajo del PRO base TallerOS. No es más barato que toda la competencia: TallerTrack publica una entrada a ARS 18.000 con límites distintos. La comparación no implica igualdad funcional.

La interfaz actual de 81cc muestra precios 29/79/149 con `$` sin precisar moneda. Antes de cobrar, definir y mostrar moneda, impuestos, período, precio posterior a promociones y política de actualización. No convertir automáticamente esos importes a la nueva propuesta.

## Cómo mejorar con inversión contenida

1. **Ingreso rápido desde celular.** Reducir campos iniciales a patente, cliente y motivo. Completar detalles después. Medir con talleres reales si una persona nueva logra ingresar una orden en menos de 2 minutos; es un objetivo, no un resultado comprobado.
2. **Presupuesto comprensible y aprobable.** Documento con logo, repuestos, mano de obra, total, vigencia y aprobación registrada. Es desarrollo pendiente. Aporta trazabilidad frente a conversaciones dispersas.
3. **Seguimiento sencillo.** Mejorar el portal existente; añadir acceso por enlace seguro y mensajes preparados para compartir. El historial y la transferencia ya están implementados, pero no son exclusivos.
4. **Entrega y cobro.** Incorporar entrega real del vehículo, pagos parciales y saldo. Hoy las finanzas son presupuestos/márgenes estimados; no afirmar que constituyen caja o utilidad real.
5. **Salida fácil.** Importación CSV con plantilla, exportación y guía breve. Hacer el cambio desde papel/Excel sencillo reduce el costo de incorporación y soporte.

Antes de cobrar: cerrar verificación de identidad, recuperación por correo, revocación de sesiones, respaldo/restauración y aplicación de planes; probar los flujos críticos en producción controlada. Estos puntos provienen de la revisión del repositorio.

## Cómo controlar el costo de servir a cada taller

- Mantener Next.js/NestJS/PostgreSQL y el enfoque multi-tenant. Compartir infraestructura con aislamiento por taller; no crear una base/servidor por cliente por defecto.
- Elegir inicialmente un producto web adaptable al celular; posponer apps nativas, contabilidad completa, multisucursal avanzado e IA ilimitada.
- Empezar con WhatsApp preparado y enviado por una persona; no presentarlo como envío automático. La automatización oficial debe dimensionarse y cobrarse según su consumo.
- Usar correo transaccional para invitaciones/verificación/recuperación. Resend publica un nivel gratuito de 3.000 correos mensuales y 100 diarios, compartido por la cuenta, no por taller: https://resend.com/docs/knowledge-base/account-quotas-and-limits . Es una referencia inicial, no capacidad ilimitada.
- Definir tamaños y cupos de fotos, compresión, almacenamiento externo y retención; incluir backups fuera del servidor principal.
- Ofrecer soporte en horario claro, videos cortos y alta guiada estándar. Evitar soporte 24/7 y desarrollo a medida incluidos en el precio económico.
- Medir infraestructura, correo, almacenamiento, comisiones de cobro y minutos de soporte por taller. Los salarios/tiempo del fundador también son costos.

Modelo para validar precio:

`Talleres necesarios = redondear hacia arriba(costos fijos / (precio neto − costo variable por taller))`

Ejemplo exclusivamente hipotético: costos fijos ARS 200.000/mes, precio neto ARS 24.900 y variable ARS 5.000 por taller → 11 talleres para cubrir esos costos. Con 20 talleres: ARS 498.000 de ingreso menos ARS 100.000 variables y ARS 200.000 fijos = ARS 198.000 antes de cualquier costo/impuesto no incluido. No es una estimación de rentabilidad real de 81cc. Usar precio neto de impuestos y costos efectivos; la promoción reduce el margen.

## Validación comercial inicial

Seleccionar 5 talleres del mismo segmento y observar su uso real. Medir tiempo de alta, tiempo de ingreso, órdenes por semana, consultas de clientes, minutos de soporte, permanencia y voluntad de pagar ARS 24.900. Probar el mensaje: **“Tu taller ordenado y tus clientes informados, sin complicarte el día.”**

Prioridad de desarrollo: cerrar confianza/acceso y entrega → ingreso rápido → presupuesto y compartir → exportación y cobros. ARCA, automatizaciones pagas y funcionalidades avanzadas se justifican con demanda comprobada. No iniciar una guerra de precios ni prometer ser superior en todo.
