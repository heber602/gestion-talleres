import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import type { Request, Response } from 'express';

describe('Google login state', () => {
  it('rejects an OAuth callback that is not bound to the browser', async () => {
    const service = { loginWithGoogle: jest.fn() };
    const response = { clearCookie: jest.fn(), redirect: jest.fn() };
    const controller = new AuthController(service as unknown as AuthService);
    await controller.googleCallback(
      response as unknown as Response,
      { headers: {} } as Request,
      'code',
      'a'.repeat(64),
    );
    expect(response.redirect).toHaveBeenCalledWith(
      expect.stringContaining('googleError='),
    );
    expect(service.loginWithGoogle).not.toHaveBeenCalled();
  });
});
