const { PrismaClient } = require('../backend/node_modules/@prisma/client');
const { hashPassword } = require('../backend/dist/auth/password.util');

async function bootstrapAdmin() {
  const prisma = new PrismaClient();
  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(8162001)`;
      if (await tx.user.findFirst({ where: { role: 'superadmin' } })) return;
      const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
      const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length < 16) {
        throw new Error('Configure BOOTSTRAP_ADMIN_EMAIL y BOOTSTRAP_ADMIN_PASSWORD (mínimo 16 caracteres) para el primer despliegue.');
      }
      if (await tx.user.findFirst({ where: { email } })) throw new Error('El correo inicial ya pertenece a otro usuario. No se modificaron sus permisos.');
      const tenant = await tx.tenant.create({ data: { name: 'Administración 81cc', subscriptionPlan: 'enterprise' } });
      await tx.user.create({ data: { tenantId: tenant.id, name: 'Administrador 81cc', email, role: 'superadmin', passwordHash: hashPassword(password) } });
      console.log('Primer superadministrador creado. La contraseña no se imprime en los logs.');
    });
  } finally { await prisma.$disconnect(); }
}
module.exports = { bootstrapAdmin };
if (require.main === module) bootstrapAdmin().catch((error) => { console.error(error.message); process.exitCode = 1; });
