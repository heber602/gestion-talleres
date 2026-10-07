import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { WorkshopService } from './workshop.service';
import {
  IntakeDto,
  VehicleDto,
  MoveBoardItemDto,
  InventoryItemDto,
  WorkOrderPartDto,
  UpdateWorkOrderDto,
  TransferVehicleDto,
} from './workshop.dto';

@Controller()
export class WorkshopController {
  constructor(
    private readonly authService: AuthService,
    private readonly workshopService: WorkshopService,
  ) {}

  @Get('dashboard/summary')
  async dashboard(@Headers('authorization') authorization: string | undefined) {
    const user = await this.authService.requireSession(authorization, 'staff');
    return this.workshopService.getDashboardSummary(user);
  }

  @Get('clients')
  async clients(
    @Headers('authorization') authorization: string | undefined,
    @Query('search') search?: string,
  ) {
    const user = await this.authService.requireSession(authorization, 'staff');
    return this.workshopService.listClients(user, search);
  }

  @Post('clients/intake')
  async intake(
    @Headers('authorization') authorization: string | undefined,
    @Body()
    body: IntakeDto,
  ) {
    const user = await this.authService.requireSession(authorization, 'staff');
    return this.workshopService.createIntake(user, body!);
  }

  @Get('vehicles/:vehicleId/history')
  async vehicleHistory(
    @Headers('authorization') authorization: string | undefined,
    @Param('vehicleId') vehicleId?: string,
  ) {
    const user = await this.authService.requireSession(authorization);
    return this.workshopService.getVehicleHistory(user, vehicleId!);
  }

  @Get('sessions')
  async sessions(@Headers('authorization') authorization: string | undefined) {
    const user = await this.authService.requireSession(authorization, 'staff');
    return this.authService.listSessions(user);
  }

  @Post('vehicles/:vehicleId/transfer')
  async transferVehicle(
    @Headers('authorization') authorization: string | undefined,
    @Param('vehicleId') vehicleId: string,
    @Body() body: TransferVehicleDto,
  ) {
    const user = await this.authService.requireSession(authorization, 'staff');
    return this.workshopService.transferVehicle(user, vehicleId, body);
  }

  @Get('client-portal/me')
  async clientPortal(
    @Headers('authorization') authorization: string | undefined,
  ) {
    const user = await this.authService.requireSession(authorization, 'client');
    return this.workshopService.getClientPortal(user);
  }

  @Post('client-portal/vehicles')
  async addClientPortalVehicle(
    @Headers('authorization') authorization: string | undefined,
    @Body()
    body: VehicleDto,
  ) {
    const user = await this.authService.requireSession(authorization, 'client');
    return this.workshopService.addVehicleToClientPortal(user, body!);
  }

  @Post('client-portal/vehicles/:vehicleId/profile')
  async updateClientPortalVehicleProfile(
    @Headers('authorization') authorization: string | undefined,
    @Param('vehicleId') vehicleId?: string,
    @Body()
    body?: {
      alias?: string | null;
      color?: string | null;
      notes?: string | null;
      insuranceProvider?: string | null;
      policyNumber?: string | null;
    },
  ) {
    const user = await this.authService.requireSession(authorization, 'client');
    return this.workshopService.updateClientPortalVehicleProfile(
      user,
      vehicleId!,
      body ?? {},
    );
  }

  @Get('appointments/board')
  async appointmentsBoard(
    @Headers('authorization') authorization: string | undefined,
  ) {
    const user = await this.authService.requireSession(authorization, 'staff');
    return this.workshopService.getAppointmentsBoard(user);
  }

  @Post('appointments/board/move')
  async moveBoardItem(
    @Headers('authorization') authorization: string | undefined,
    @Body()
    body: MoveBoardItemDto,
  ) {
    const user = await this.authService.requireSession(authorization, 'staff');
    return this.workshopService.moveBoardItem(user, body!);
  }

  @Get('work-orders')
  async workOrders(
    @Headers('authorization') authorization: string | undefined,
  ) {
    const user = await this.authService.requireSession(authorization, 'staff');
    return this.workshopService.listWorkOrders(user);
  }

  @Get('staff/mechanics')
  async mechanics(@Headers('authorization') authorization: string | undefined) {
    const user = await this.authService.requireSession(authorization, 'staff');
    return this.workshopService.listMechanics(user);
  }

  @Get('work-orders/:workOrderId')
  async workOrderDetail(
    @Headers('authorization') authorization: string | undefined,
    @Param('workOrderId') workOrderId: string,
  ) {
    const user = await this.authService.requireSession(authorization, 'staff');
    return this.workshopService.getWorkOrderDetail(user, workOrderId!);
  }

  @Get('inventory/items')
  async inventoryItems(
    @Headers('authorization') authorization: string | undefined,
  ) {
    const user = await this.authService.requireSession(authorization, 'staff');
    return this.workshopService.listInventoryItems(user);
  }

  @Post('inventory/items')
  async createInventoryItem(
    @Headers('authorization') authorization: string | undefined,
    @Body()
    body: InventoryItemDto,
  ) {
    const user = await this.authService.requireSession(authorization, 'staff');
    return this.workshopService.createInventoryItem(user, body!);
  }

  @Post('work-orders/:workOrderId/parts')
  async addPartToWorkOrder(
    @Headers('authorization') authorization: string | undefined,
    @Param('workOrderId') workOrderId: string,
    @Body()
    body: WorkOrderPartDto,
  ) {
    const user = await this.authService.requireSession(authorization, 'staff');
    return this.workshopService.addPartToWorkOrder(user, workOrderId!, body!);
  }

  @Post('work-orders/:workOrderId/update')
  async updateWorkOrder(
    @Headers('authorization') authorization: string | undefined,
    @Param('workOrderId') workOrderId: string,
    @Body()
    body: UpdateWorkOrderDto,
  ) {
    const user = await this.authService.requireSession(authorization, 'staff');
    return this.workshopService.updateWorkOrder(user, workOrderId!, body ?? {});
  }

  @Get('finances/summary')
  async financesSummary(
    @Headers('authorization') authorization: string | undefined,
    @Query('period') period?: 'dia' | 'semana' | 'mes' | 'anio',
  ) {
    const user = await this.authService.requireSession(authorization, 'staff');
    return this.workshopService.getFinanceSummary(user, period);
  }
}
