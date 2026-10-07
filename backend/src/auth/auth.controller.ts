import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import type { Response } from 'express';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { AuthService } from './auth.service';
import {
  LoginBody,
  OwnerRegistrationBody,
  ClientRegistrationBody,
  StaffInviteBody,
  AcceptInviteBody,
  EmailDto,
  ResetPasswordBody,
} from './auth.dto';

interface OwnerPlanSelectionBody {
  planCode: string;
  billingCycle?: 'monthly' | 'semiannual' | 'annual';
  note?: string;
}

interface SuperadminCreateAccountBody {
  name: string;
  email: string;
  password: string;
  tenantId?: string;
}

interface ResolvePlanRequestBody {
  action: 'approve' | 'reject';
  reviewNote?: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private frontendUrl() {
    return (
      (process.env.FRONTEND_URL || process.env.RENDER_EXTERNAL_URL)?.replace(/\/$/, '') ?? 'http://localhost:3001'
    );
  }

  private googleCallbackUrl() {
    return (
      process.env.GOOGLE_REDIRECT_URI?.trim() ||
      `${process.env.API_PUBLIC_URL?.replace(/\/$/, '') ?? (process.env.RENDER_EXTERNAL_URL ? `${process.env.RENDER_EXTERNAL_URL.replace(/\/$/, '')}/api` : 'http://localhost:3000')}/auth/google/callback`
    );
  }

  private loginRedirect(params: Record<string, string | number>) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      search.set(key, String(value));
    });
    return `${this.frontendUrl()}/login?${search.toString()}`;
  }

  @Get('google/start')
  googleStart(@Res() response: Response) {
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();

    if (!clientId) {
      return response.redirect(
        this.loginRedirect({
          googleError: 'Configuracion de Google no disponible',
        }),
      );
    }

    const googleUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleUrl.searchParams.set('client_id', clientId);
    googleUrl.searchParams.set('redirect_uri', this.googleCallbackUrl());
    googleUrl.searchParams.set('response_type', 'code');
    googleUrl.searchParams.set('scope', 'openid email profile');
    googleUrl.searchParams.set('prompt', 'select_account');
    const state = randomBytes(32).toString('hex');
    response.cookie('81cc_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 10 * 60 * 1000,
    });
    googleUrl.searchParams.set('state', state);

    return response.redirect(googleUrl.toString());
  }

  @Get('google/callback')
  async googleCallback(
    @Res() response: Response,
    @Req() request: Request,
    @Query('code') code?: string,
    @Query('state') state?: string,
  ) {
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

    const expectedState = request.headers.cookie
      ?.split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith('81cc_oauth_state='))
      ?.slice('81cc_oauth_state='.length);
    response.clearCookie('81cc_oauth_state', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    if (
      !state ||
      !expectedState ||
      !/^[a-f0-9]{64}$/.test(state) ||
      !/^[a-f0-9]{64}$/.test(expectedState) ||
      !timingSafeEqual(Buffer.from(state), Buffer.from(expectedState))
    ) {
      return response.redirect(
        this.loginRedirect({
          googleError:
            'La solicitud de Google expiró o no corresponde a este navegador. Volvé a intentar.',
        }),
      );
    }

    if (!clientId || !clientSecret || !code) {
      return response.redirect(
        this.loginRedirect({
          googleError: 'No se pudo validar Google',
        }),
      );
    }

    try {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: this.googleCallbackUrl(),
          grant_type: 'authorization_code',
        }),
      });

      const tokenPayload = (await tokenResponse.json()) as {
        access_token?: string;
      };

      if (!tokenResponse.ok || !tokenPayload.access_token) {
        return response.redirect(
          this.loginRedirect({
            googleError: 'No se pudo completar la autenticacion con Google',
          }),
        );
      }

      const profileResponse = await fetch(
        'https://openidconnect.googleapis.com/v1/userinfo',
        {
          headers: {
            Authorization: `Bearer ${tokenPayload.access_token}`,
          },
        },
      );

      const profilePayload = (await profileResponse.json()) as {
        email?: string;
        name?: string;
        email_verified?: boolean;
      };

      if (
        !profileResponse.ok ||
        !profilePayload.email ||
        !profilePayload.email_verified
      ) {
        return response.redirect(
          this.loginRedirect({
            googleError: 'No se pudo leer el perfil de Google',
          }),
        );
      }

      const session = await this.authService.loginWithGoogle(
        profilePayload.email,
        profilePayload.name ?? profilePayload.email,
        {
          userAgent: request.headers['user-agent'],
          ipAddress: request.ip,
        },
      );

      return response.redirect(
        this.loginRedirect({
          googleToken: session.token,
          googleExpiresAt: session.expiresAt,
          googleRole: session.user.role,
        }),
      );
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'No se pudo iniciar sesion con Google';
      return response.redirect(
        this.loginRedirect({
          googleError: message,
        }),
      );
    }
  }

  // Límite estricto: 5 intentos/minuto para prevenir fuerza bruta
  @Throttle({ global: { ttl: 60000, limit: 5 } })
  @Post('login')
  login(@Body() body: LoginBody, @Req() request: Request) {
    return this.authService.loginWithCredentials(
      body.email,
      body.password,
      {
        userAgent: request.headers['user-agent'],
        ipAddress: request.ip,
      },
      body.tenantId,
    );
  }

  @Throttle({ global: { ttl: 60000, limit: 5 } })
  @Post('register-owner')
  registerOwner(@Body() body: OwnerRegistrationBody) {
    return this.authService.registerOwner(body);
  }

  @Post('register-client')
  registerClient(@Body() body: ClientRegistrationBody) {
    return this.authService.registerClient(body);
  }

  @Throttle({ global: { ttl: 60000, limit: 5 } })
  @Post('client/login')
  clientLogin(@Body() body: LoginBody, @Req() request: Request) {
    return this.authService.loginClient(body.email, body.password, {
      userAgent: request.headers['user-agent'],
      ipAddress: request.ip,
    });
  }

  @Get('session')
  async session(@Headers('authorization') authorization?: string) {
    return {
      user: await this.authService.requireSession(authorization, undefined, {
        allowRestricted: true,
      }),
    };
  }

  @Get('staff')
  async staff(@Headers('authorization') authorization?: string) {
    const viewer = await this.authService.requireSession(
      authorization,
      'staff',
    );
    return this.authService.listStaff(viewer);
  }

  @Get('staff/invites')
  async staffInvites(@Headers('authorization') authorization?: string) {
    const viewer = await this.authService.requireSession(
      authorization,
      'staff',
    );
    return this.authService.listStaffInvites(viewer);
  }

  @Get('owner/account-status')
  async ownerAccountStatus(@Headers('authorization') authorization?: string) {
    const viewer = await this.authService.requireSession(
      authorization,
      'staff',
      { allowRestricted: true },
    );
    return this.authService.getOwnerAccountStatus(viewer);
  }

  @Post('owner/select-plan')
  async ownerSelectPlan(
    @Headers('authorization') authorization?: string,
    @Body() body?: OwnerPlanSelectionBody,
  ) {
    const viewer = await this.authService.requireSession(
      authorization,
      'staff',
      { allowRestricted: true },
    );
    return this.authService.selectOwnerPlan(viewer, body!);
  }

  @Get('superadmin/plan-requests')
  async superadminPlanRequests(
    @Headers('authorization') authorization?: string,
  ) {
    const viewer = await this.authService.requireSession(
      authorization,
      'staff',
    );
    return this.authService.listPlanChangeRequestsForSuperadmin(viewer);
  }

  @Post('superadmin/plan-requests/:requestId/resolve')
  async resolveSuperadminPlanRequest(
    @Headers('authorization') authorization: string | undefined,
    @Req() request: Request,
    @Body() body?: ResolvePlanRequestBody,
  ) {
    const viewer = await this.authService.requireSession(
      authorization,
      'staff',
    );
    const requestId = Array.isArray(request.params.requestId)
      ? request.params.requestId[0]
      : request.params.requestId;
    return this.authService.resolvePlanChangeRequest(viewer, requestId, body!);
  }

  @Post('superadmin/create-account')
  async createSuperadminAccount(
    @Headers('authorization') authorization?: string,
    @Body() body?: SuperadminCreateAccountBody,
  ) {
    const viewer = await this.authService.requireSession(
      authorization,
      'staff',
    );
    return this.authService.createSuperadminAccount(viewer, body!);
  }

  @Post('staff/invites')
  async createStaffInvite(
    @Headers('authorization') authorization?: string,
    @Body() body?: StaffInviteBody,
  ) {
    const viewer = await this.authService.requireSession(
      authorization,
      'staff',
    );
    return this.authService.createStaffInvite(viewer, body!);
  }

  @Post('staff/invites/preview')
  previewInvite(@Body() body: { token: string }) {
    return this.authService.readStaffInvite(body.token);
  }

  @Post('staff/invites/accept')
  acceptInvite(@Body() body: AcceptInviteBody) {
    return this.authService.acceptStaffInvite(body);
  }

  @Get('superadmin/tenants')
  async superadminTenants(@Headers('authorization') authorization?: string) {
    const viewer = await this.authService.requireSession(
      authorization,
      'staff',
    );
    return this.authService.listTenantsForSuperadmin(viewer);
  }

  @Get('superadmin/users')
  async superadminUsers(@Headers('authorization') authorization?: string) {
    const viewer = await this.authService.requireSession(
      authorization,
      'staff',
    );
    return this.authService.listUsersForSuperadmin(viewer);
  }

  @Get('superadmin/test-accounts')
  async superadminTestAccounts(
    @Headers('authorization') authorization?: string,
  ) {
    const viewer = await this.authService.requireSession(
      authorization,
      'staff',
    );
    return this.authService.listTestAccountsForSuperadmin(viewer);
  }

  @Get('superadmin/plans')
  async superadminPlans(@Headers('authorization') authorization?: string) {
    const viewer = await this.authService.requireSession(
      authorization,
      'staff',
    );
    return this.authService.listPlansForSuperadmin(viewer);
  }

  @Get('superadmin/finances')
  async superadminFinances(@Headers('authorization') authorization?: string) {
    const viewer = await this.authService.requireSession(
      authorization,
      'staff',
    );
    return this.authService.getPlatformFinanceSummary(viewer);
  }

  @Post('superadmin/plans')
  async upsertPlan(
    @Headers('authorization') authorization?: string,
    @Body()
    body?: {
      code: string;
      name: string;
      monthlyPrice: number;
      maxUsers: number;
      maxWorkOrders?: number | null;
      features?: string[];
      active?: boolean;
    },
  ) {
    const viewer = await this.authService.requireSession(
      authorization,
      'staff',
    );
    return this.authService.upsertPlanForSuperadmin(viewer, body!);
  }

  @Post('superadmin/tenants/:tenantId/moderate')
  async moderateTenant(
    @Headers('authorization') authorization: string | undefined,
    @Req() request: Request,
  ) {
    const viewer = await this.authService.requireSession(
      authorization,
      'staff',
    );
    const tenantId = Array.isArray(request.params.tenantId)
      ? request.params.tenantId[0]
      : request.params.tenantId;
    return this.authService.moderateTenant(
      viewer,
      tenantId,
      request.body ?? {},
    );
  }

  @Throttle({ global: { ttl: 60000, limit: 3 } })
  @Post('forgot-password')
  forgotPassword(@Body() body: EmailDto) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  resetPassword(@Body() body: ResetPasswordBody) {
    return this.authService.resetPassword(body.token, body.password);
  }
}
