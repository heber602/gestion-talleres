import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MaxLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class TransferVehicleDto {
  @IsString()
  @IsNotEmpty({ message: 'Seleccioná el nuevo cliente titular' })
  clientId!: string;

  @IsString()
  @IsNotEmpty()
  expectedClientId!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000, { message: 'La nota no puede superar los 1000 caracteres' })
  note?: string;
}

export class VehicleDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'La patente es obligatoria' })
  plate!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'La marca es obligatoria' })
  brand!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'El modelo es obligatorio' })
  model!: string;

  @IsOptional()
  @IsInt()
  @Min(1886)
  @Max(2100)
  year?: number;
}

export class IntakeDto extends VehicleDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'El nombre del cliente es obligatorio' })
  clientName!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  phone?: string;

  @IsOptional()
  @Transform(trim)
  @IsEmail({}, { message: 'El email no es válido' })
  email?: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'El motivo del turno es obligatorio' })
  reason!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La fecha debe tener formato AAAA-MM-DD',
  })
  @IsDateString(
    { strict: true },
    { message: 'La fecha del turno no es válida' },
  )
  date!: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'La hora debe tener formato HH:mm',
  })
  time!: string;
}

export class MoveBoardItemDto {
  @IsString()
  @IsNotEmpty()
  itemId!: string;

  @IsIn(['agendados', 'diagnostico', 'reparacion', 'listos'])
  sourceColumn!: 'agendados' | 'diagnostico' | 'reparacion' | 'listos';

  @IsIn(['diagnostico', 'reparacion', 'listos'])
  targetColumn!: 'diagnostico' | 'reparacion' | 'listos';
}

export class InventoryItemDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  sku?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  stockQuantity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minAlert?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;
}

export class WorkOrderPartDto {
  @IsString()
  @IsNotEmpty()
  itemId!: string;

  @IsInt()
  @Min(1, { message: 'La cantidad debe ser un entero mayor que cero' })
  quantity!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsNumber()
  @Min(0)
  internalCost!: number;

  @IsOptional()
  @IsBoolean()
  providedByClient?: boolean;
}

export class UpdateWorkOrderDto {
  @IsOptional()
  @IsString()
  diagnostic?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  laborCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalCost?: number;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  recommendedNextRevisionDate?: string | null;

  @IsOptional()
  @IsString()
  recommendedNextRevisionNote?: string | null;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  mechanicId?: string | null;

  @IsOptional()
  @IsString()
  clientUpdateTitle?: string;

  @IsOptional()
  @IsString()
  clientUpdateMessage?: string;
}
