import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { hashPassword } from '../src/auth/password.util';

// Estas pruebas escriben fixtures y solo se ejecutan sobre una base local de pruebas explícita.
const databaseTests = process.env.RUN_DATABASE_E2E === 'true' ? describe : describe.skip;

databaseTests('Roles and vehicle transfers with PostgreSQL', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantId: string;
  let vehicleId: string;
  let sellerId: string;
  let buyerId: string;
  let foreignClientId: string;
  const credentials: Record<string, { email: string; password: string }> = {};
  const tokens: Record<string, string> = {};

  beforeAll(async () => {
    const database = new URL(process.env.DATABASE_URL ?? '');
    if (!['127.0.0.1', 'localhost'].includes(database.hostname) || !database.pathname.endsWith('_test')) {
      throw new Error('RUN_DATABASE_E2E requires an explicitly named local *_test database.');
    }
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    const suffix = randomUUID().slice(0, 8);
    const tenant = await prisma.tenant.create({ data: { name: `Prueba transferencia ${suffix}`, subscriptionPlan: 'pro' } });
    tenantId = tenant.id;
    for (const role of ['owner', 'employee', 'superadmin']) {
      credentials[role] = { email: `${role}-${suffix}@example.test`, password: role === 'employee' ? '1234' : 'PruebaRoles123!' };
      await prisma.user.create({ data: { tenantId, role, name: `Prueba ${role}`, email: credentials[role].email, passwordHash: hashPassword(credentials[role].password) } });
    }
    for (const role of ['seller', 'buyer']) {
      credentials[role] = { email: `${role}-${suffix}@example.test`, password: 'PruebaCliente123!' };
      const client = await prisma.client.create({ data: { tenantId, name: `Prueba ${role}`, email: credentials[role].email } });
      await prisma.clientPortalAccount.create({ data: { clientId: client.id, passwordHash: hashPassword(credentials[role].password) } });
      if (role === 'seller') sellerId = client.id;
      else buyerId = client.id;
    }
    const foreignTenant = await prisma.tenant.create({ data: { name: `Otro taller ${suffix}`, subscriptionPlan: 'pro' } });
    foreignClientId = (await prisma.client.create({ data: { tenantId: foreignTenant.id, name: 'Cliente de otro taller' } })).id;
    const vehicle = await prisma.vehicle.create({ data: { tenantId, clientId: sellerId, plate: `TEST${suffix}`, brand: 'Ford', model: 'Fiesta', year: 2018 } });
    vehicleId = vehicle.id;
    const appointment = await prisma.appointment.create({ data: { tenantId, vehicleId, date: new Date('2026-10-06'), time: '10:00', reason: 'Service previo a venta', status: 'completed' } });
    const order = await prisma.workOrder.create({ data: { tenantId, vehicleId, appointmentId: appointment.id, status: 'finished', diagnostic: 'Mantenimiento completo', laborCost: 100, totalCost: 180, recommendedNextRevisionDate: new Date('2027-01-06'), recommendedNextRevisionNote: 'Control preventivo' } });
    const item = await prisma.inventoryItem.create({ data: { tenantId, name: 'Filtro', price: 80, stockQuantity: 5 } });
    await prisma.workOrderPart.create({ data: { workOrderId: order.id, itemId: item.id, quantity: 1, unitPrice: 80, internalCost: 40 } });
    await prisma.clientUpdate.create({ data: { workOrderId: order.id, title: 'Service terminado', message: 'Filtro reemplazado' } });
    for (const role of ['owner', 'employee', 'superadmin', 'seller', 'buyer']) {
      const path = ['seller', 'buyer'].includes(role) ? '/auth/client/login' : '/auth/login';
      const result = await request(app.getHttpServer()).post(path).send(credentials[role]).expect(201);
      tokens[role] = result.body.token;
      expect(tokens[role]).toBeTruthy();
    }
    await request(app.getHttpServer()).post(`/client-portal/vehicles/${vehicleId}/profile`).auth(tokens.seller, { type: 'bearer' }).send({ alias: 'Auto anterior', color: 'Azul', notes: 'Notas del vendedor', insuranceProvider: 'Seguro anterior', policyNumber: 'POLIZA-TEST' }).expect(201);
  }, 30000);

  afterAll(async () => { if (app) await app.close(); });

  it('allows each operational role to load its own screens and denies finance/session access to employees', async () => {
    for (const role of ['owner', 'employee']) {
      for (const path of ['/dashboard/summary', '/clients', '/appointments/board', '/work-orders', '/inventory/items', '/staff/mechanics']) {
        await request(app.getHttpServer()).get(path).auth(tokens[role], { type: 'bearer' }).expect(200);
      }
    }
    await request(app.getHttpServer()).get('/finances/summary').auth(tokens.owner, { type: 'bearer' }).expect(200);
    await request(app.getHttpServer()).get('/auth/owner/account-status').auth(tokens.owner, { type: 'bearer' }).expect(200);
    await request(app.getHttpServer()).get('/finances/summary').auth(tokens.employee, { type: 'bearer' }).expect(403);
    await request(app.getHttpServer()).get('/sessions').auth(tokens.employee, { type: 'bearer' }).expect(403);
    await request(app.getHttpServer()).get('/auth/superadmin/tenants').auth(tokens.superadmin, { type: 'bearer' }).expect(200);
    await request(app.getHttpServer()).get('/auth/superadmin/tenants').auth(tokens.owner, { type: 'bearer' }).expect(403);
    await request(app.getHttpServer()).get('/client-portal/me').auth(tokens.seller, { type: 'bearer' }).expect(200);
    await request(app.getHttpServer()).get('/work-orders').auth(tokens.seller, { type: 'bearer' }).expect(401);
  });

  it('rejects transfers by employee, superadmin and client without changing ownership', async () => {
    for (const [role, status] of [['employee', 403], ['superadmin', 403], ['seller', 401]] as const) {
      await request(app.getHttpServer()).post(`/vehicles/${vehicleId}/transfer`).auth(tokens[role], { type: 'bearer' }).send({ clientId: buyerId, expectedClientId: sellerId }).expect(status);
    }
    expect((await prisma.vehicle.findUniqueOrThrow({ where: { id: vehicleId } })).clientId).toBe(sellerId);
  });

  it('rejects another workshop, same client, stale ownership and invalid input', async () => {
    for (const [clientId, expectedClientId, status] of [[foreignClientId, sellerId, 404], [sellerId, sellerId, 400], [buyerId, buyerId, 409]] as const) {
      await request(app.getHttpServer()).post(`/vehicles/${vehicleId}/transfer`).auth(tokens.owner, { type: 'bearer' }).send({ clientId, expectedClientId }).expect(status);
    }
    await request(app.getHttpServer()).post(`/vehicles/${vehicleId}/transfer`).auth(tokens.owner, { type: 'bearer' }).send({ clientId: buyerId }).expect(400);
    expect(await prisma.vehicleOwnershipTransfer.count({ where: { vehicleId } })).toBe(0);
  });

  it('preserves all service history, archives the old profile and moves portal access to the buyer', async () => {
    const before = await request(app.getHttpServer()).get(`/vehicles/${vehicleId}/history`).auth(tokens.owner, { type: 'bearer' }).expect(200);
    const result = await request(app.getHttpServer()).post(`/vehicles/${vehicleId}/transfer`).auth(tokens.owner, { type: 'bearer' }).send({ clientId: buyerId, expectedClientId: sellerId, note: 'Venta dentro del mismo taller' }).expect(201);
    expect(result.body.vehicleId).toBe(vehicleId);
    expect(result.body.client.id).toBe(buyerId);
    const after = await request(app.getHttpServer()).get(`/vehicles/${vehicleId}/history`).auth(tokens.owner, { type: 'bearer' }).expect(200);
    expect(after.body.workOrders).toEqual(before.body.workOrders);
    expect(after.body.client.id).toBe(buyerId);
    expect(after.body.profile).toEqual(expect.objectContaining({ alias: null, color: 'Azul', notes: null, insuranceProvider: null, policyNumber: null }));
    expect(after.body.ownershipTransfers[0]).toEqual(expect.objectContaining({ fromClientName: 'Prueba seller', toClientName: 'Prueba buyer', performedByName: 'Prueba owner', previousProfile: expect.objectContaining({ notes: 'Notas del vendedor', policyNumber: 'POLIZA-TEST' }) }));
    const oldPortal = await request(app.getHttpServer()).get('/client-portal/me').auth(tokens.seller, { type: 'bearer' }).expect(200);
    expect(oldPortal.body.vehicles).toHaveLength(0);
    await request(app.getHttpServer()).get(`/vehicles/${vehicleId}/history`).auth(tokens.seller, { type: 'bearer' }).expect(404);
    const newPortal = await request(app.getHttpServer()).get('/client-portal/me').auth(tokens.buyer, { type: 'bearer' }).expect(200);
    expect(newPortal.body.vehicles[0].workOrders).toEqual(before.body.workOrders);
    expect(newPortal.body.vehicles[0].ownershipTransfers).toBeUndefined();
    expect(newPortal.body.vehicles[0].profile.policyNumber).toBeNull();
    await request(app.getHttpServer()).get(`/vehicles/${vehicleId}/history`).auth(tokens.buyer, { type: 'bearer' }).expect(200);
  });
});
