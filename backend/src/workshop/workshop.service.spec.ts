import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { WorkshopService } from './workshop.service';
import { PrismaService } from '../prisma/prisma.service';
import { SessionUser } from '../auth/auth.types';

const owner: SessionUser = {
  id: 'owner',
  name: 'Dueño',
  email: 'owner@example.com',
  avatar: 'D',
  role: 'owner',
  audience: 'staff',
  tenantId: 'taller',
};

describe('WorkshopService regressions', () => {
  it('rejects stale board moves without updating the appointment', async () => {
    const tx = {
      workOrder: { findFirst: jest.fn().mockResolvedValue({ id: 'order', appointmentId: 'appointment' }), updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      appointment: { update: jest.fn() },
    };
    const prisma = { $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<void>) => callback(tx)) };
    await expect(new WorkshopService(prisma as unknown as PrismaService).moveBoardItem(owner, { itemId: 'order', sourceColumn: 'diagnostico', targetColumn: 'reparacion' })).rejects.toThrow('cambió de etapa');
    expect(tx.appointment.update).not.toHaveBeenCalled();
  });

  it('rejects intake that would change the owner of an existing plate', async () => {
    const tx = {
      vehicle: { findUnique: jest.fn().mockResolvedValue({ id: 'vehicle', client: { name: 'Ana', email: 'ana@example.com' } }) },
      client: { create: jest.fn() },
      appointment: { create: jest.fn() },
    };
    const prisma = { $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<void>) => callback(tx)) };
    await expect(new WorkshopService(prisma as unknown as PrismaService).createIntake(owner, { clientName: 'Otra persona', plate: 'AB123CD', brand: 'Fiat', model: 'Uno', reason: 'Revisión', date: '2026-10-06', time: '09:30' })).rejects.toThrow('otro cliente');
    expect(tx.client.create).not.toHaveBeenCalled();
    expect(tx.appointment.create).not.toHaveBeenCalled();
  });
  it('counts today appointments, active orders and distinct workshop vehicles separately', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-07T01:00:00Z'));
    try {
      const prisma = {
        appointment: {
          count: jest.fn().mockResolvedValue(2),
          findMany: jest.fn().mockResolvedValue([]),
        },
        workOrder: { count: jest.fn().mockResolvedValue(4) },
        vehicle: { count: jest.fn().mockResolvedValue(3) },
      };
      const service = new WorkshopService(prisma as unknown as PrismaService);
      expect((await service.getDashboardSummary(owner)).stats).toEqual({
        appointmentsToday: 2,
        activeOrders: 4,
        vehiclesInWorkshop: 3,
      });
      expect(prisma.appointment.count).toHaveBeenCalledWith({
        where: {
          tenantId: 'taller',
          date: new Date('2026-10-06T00:00:00Z'),
          status: { not: 'cancelled' },
        },
      });
      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'pending',
            workOrder: null,
            date: { gte: new Date('2026-10-06T00:00:00Z') },
          }),
        }),
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it('rejects employee finance access before querying data', async () => {
    const service = new WorkshopService({} as PrismaService);
    await expect(
      service.getFinanceSummary({ ...owner, role: 'employee' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('does not create a part when stock cannot be reserved', async () => {
    const tx = {
      workOrderPart: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
      inventoryItem: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    };
    const prisma = {
      workOrder: { findFirst: jest.fn().mockResolvedValue({ id: 'order' }) },
      inventoryItem: { findFirst: jest.fn().mockResolvedValue({ id: 'item' }) },
      $transaction: jest.fn(
        async (callback: (client: typeof tx) => Promise<void>) => callback(tx),
      ),
    };
    const service = new WorkshopService(prisma as unknown as PrismaService);
    await expect(
      service.addPartToWorkOrder(owner, 'order', {
        itemId: 'item',
        quantity: 2,
        unitPrice: 20,
        internalCost: 10,
      }),
    ).rejects.toThrow('Stock insuficiente');
    expect(tx.workOrderPart.create).not.toHaveBeenCalled();
    expect(tx.inventoryItem.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ stockQuantity: { gte: 2 } }),
      }),
    );
  });

  it('preserves existing part pricing and source', async () => {
    const tx = {
      workOrderPart: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            quantity: 1,
            unitPrice: 20,
            internalCost: 10,
            providedByClient: false,
          }),
      },
      inventoryItem: { updateMany: jest.fn() },
    };
    const prisma = {
      workOrder: { findFirst: jest.fn().mockResolvedValue({ id: 'order' }) },
      inventoryItem: { findFirst: jest.fn().mockResolvedValue({ id: 'item' }) },
      $transaction: jest.fn(
        async (callback: (client: typeof tx) => Promise<void>) => callback(tx),
      ),
    };
    await expect(
      new WorkshopService(
        prisma as unknown as PrismaService,
      ).addPartToWorkOrder(owner, 'order', {
        itemId: 'item',
        quantity: 1,
        unitPrice: 20,
        internalCost: 10,
        providedByClient: true,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(tx.inventoryItem.updateMany).not.toHaveBeenCalled();
  });

  it('rejects incomplete client updates before modifying an order', async () => {
    const prisma = {
      workOrder: {
        findFirst: jest.fn().mockResolvedValue({ id: 'order' }),
        update: jest.fn(),
      },
    };
    await expect(
      new WorkshopService(prisma as unknown as PrismaService).updateWorkOrder(
        owner,
        'order',
        { clientUpdateTitle: 'Avance' },
      ),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.workOrder.update).not.toHaveBeenCalled();
  });
});
