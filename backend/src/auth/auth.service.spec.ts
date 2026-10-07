import { hashPassword, verifyPassword } from './password.util';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { SessionUser } from './auth.types';

describe('password helpers', () => {
  it('hashes and validates a password', () => {
    const hash = hashPassword('admin123');

    expect(verifyPassword('admin123', hash)).toBe(true);
    expect(verifyPassword('wrong-password', hash)).toBe(false);
  });
});

describe('AuthService access regressions', () => {
  it('does not let public registration overwrite an existing portal password', async () => {
    const prisma = {
      tenant: { findFirst: jest.fn().mockResolvedValue({ id: 'tenant' }) },
      $queryRaw: jest
        .fn()
        .mockResolvedValue([
          { id: 'client', tenantId: 'tenant', passwordHash: 'existing-hash' },
        ]),
      $executeRaw: jest.fn(),
      client: { create: jest.fn() },
    };
    const service = new AuthService(prisma as unknown as PrismaService);
    await expect(
      service.registerClient({
        name: 'Ana',
        email: 'ana@example.com',
        password: 'newpassword',
        plate: 'AB123CD',
        brand: 'Fiat',
        model: 'Uno',
      }),
    ).rejects.toThrow('ya tiene acceso');
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
    expect(prisma.client.create).not.toHaveBeenCalled();
  });

  it('does not let owners create platform administrator invitations', async () => {
    const viewer: SessionUser = {
      id: 'owner',
      name: 'Dueño',
      email: 'owner@example.com',
      role: 'owner',
      avatar: 'D',
      audience: 'staff',
      tenantId: 'tenant',
    };
    const service = new AuthService({} as PrismaService);
    await expect(
      service.createStaffInvite(viewer, {
        name: 'Ana',
        email: 'ana@example.com',
        role: 'superadmin',
      }),
    ).rejects.toThrow('Solo podés invitar empleados');
  });
});
