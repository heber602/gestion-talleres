import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { IntakeDto, WorkOrderPartDto } from './workshop.dto';
import { StaffInviteBody } from '../auth/auth.dto';

describe('Request validation regressions', () => {
  const intake = {
    clientName: 'Ana',
    plate: 'AB123CD',
    brand: 'Fiat',
    model: 'Uno',
    reason: 'Revisión',
    date: '2026-10-06',
    time: '09:30',
  };

  it('accepts valid calendar dates and rejects impossible dates', async () => {
    expect(await validate(plainToInstance(IntakeDto, intake))).toHaveLength(0);
    expect(
      (
        await validate(
          plainToInstance(IntakeDto, { ...intake, date: '2026-02-30' }),
        )
      ).map((error) => error.property),
    ).toContain('date');
  });

  it('rejects whitespace-only intake fields and invalid time', async () => {
    const errors = await validate(
      plainToInstance(IntakeDto, { ...intake, plate: '  ', time: '25:80' }),
    );
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['plate', 'time']),
    );
  });

  it('rejects fractional quantities, negative costs and string booleans', async () => {
    const errors = await validate(
      plainToInstance(WorkOrderPartDto, {
        itemId: 'item',
        quantity: 1.5,
        unitPrice: -1,
        internalCost: 0,
        providedByClient: 'false',
      }),
    );
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['quantity', 'unitPrice', 'providedByClient']),
    );
  });

  it('rejects platform administrator invitations from workshop owners', async () => {
    const errors = await validate(
      plainToInstance(StaffInviteBody, {
        name: 'Ana',
        email: 'ana@example.com',
        role: 'superadmin',
      }),
    );
    expect(errors.map((error) => error.property)).toContain('role');
  });
});
