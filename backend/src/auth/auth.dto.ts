import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { VehicleDto } from '../workshop/workshop.dto';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class EmailDto {
  @Transform(trim)
  @IsEmail({}, { message: 'El correo no es válido' })
  email!: string;
}

export class LoginBody extends EmailDto {
  @IsString()
  @MinLength(1)
  password!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  tenantId?: string;
}

export class OwnerRegistrationBody extends EmailDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  workshopName!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

export class ClientRegistrationBody extends VehicleDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  name!: string;

  @Transform(trim)
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

export class StaffInviteBody extends EmailDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsIn(['employee'])
  role!: 'employee';
}

export class AcceptInviteBody {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

export class ResetPasswordBody extends AcceptInviteBody {}
