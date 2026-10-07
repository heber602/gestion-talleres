# Acceso remoto de prueba en Render

El blueprint `render.yaml` crea un servicio con Next.js y NestJS y una base PostgreSQL nueva. El frontend publica `/api` sobre el mismo dominio HTTPS; el backend escucha únicamente en loopback.

## Activación

1. Iniciar sesión en https://dashboard.render.com y crear un Blueprint desde este repositorio, seleccionando la rama `codex/deploy-remote`.
2. Revisar que ambos recursos indiquen el plan gratuito antes de crear el entorno.
3. Esperar a que termine el despliegue y abrir la URL HTTPS que Render asigna al servicio.
4. Ingresar con `herber.superadmin@81cc.app`. La contraseña se genera en Render: consultar `BOOTSTRAP_ADMIN_PASSWORD` en las variables del servicio. No es la contraseña local.

El primer arranque crea únicamente el superadmin. Los siguientes arranques no cambian su contraseña. No se cargan cuentas demo ni se copia la base local. Los despliegues automáticos están desactivados.

## Google

Configurar `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en el servicio. En Google Cloud, registrar el origen HTTPS del servicio y el callback `https://DOMINIO-DEL-SERVICIO/api/auth/google/callback`. Puede fijarse explícitamente con `GOOGLE_REDIRECT_URI`. El inicio con Google requiere estas credenciales; el despliegue por sí solo no lo habilita.

## Límites del entorno gratuito

La base PostgreSQL gratuita de Render vence a los 30 días y no incluye copias automáticas. El servicio web puede suspenderse por inactividad, por lo que el primer acceso puede tardar. Este entorno sirve para una prueba remota; antes de almacenar datos reales, elegir una base persistente con respaldos.

Referencia: https://render.com/docs/free
