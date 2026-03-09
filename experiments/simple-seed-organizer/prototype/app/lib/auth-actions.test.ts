import { describe, it, expect, vi } from 'vitest';
import { requestPasswordReset, updatePassword } from './auth-actions';

// Minimal Supabase auth mock shape
function makeMockSupabase(resetResult = { error: null }, updateResult = { error: null }) {
  return {
    auth: {
      resetPasswordForEmail: vi.fn().mockResolvedValue(resetResult),
      updateUser: vi.fn().mockResolvedValue(updateResult),
    },
  };
}

describe('requestPasswordReset', () => {
  it('calls resetPasswordForEmail with the correct email and redirectTo', async () => {
    const mock = makeMockSupabase();
    const result = await requestPasswordReset('user@example.com', mock as never);

    expect(mock.auth.resetPasswordForEmail).toHaveBeenCalledOnce();
    expect(mock.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'user@example.com',
      expect.objectContaining({ redirectTo: expect.stringContaining('/reset-password') })
    );
    expect(result.error).toBeNull();
  });

  it('returns an error and does NOT call Supabase for an invalid email', async () => {
    const mock = makeMockSupabase();
    const result = await requestPasswordReset('not-an-email', mock as never);

    expect(result.error).toBeTruthy();
    expect(mock.auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('returns an error and does NOT call Supabase for an empty email', async () => {
    const mock = makeMockSupabase();
    const result = await requestPasswordReset('', mock as never);

    expect(result.error).toBeTruthy();
    expect(mock.auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('surfaces the Supabase error message when the API call fails', async () => {
    const mock = makeMockSupabase({ error: { message: 'Rate limit exceeded' } as never });
    const result = await requestPasswordReset('user@example.com', mock as never);

    expect(result.error).toBe('Rate limit exceeded');
  });
});

describe('updatePassword', () => {
  it('calls updateUser with the new password', async () => {
    const mock = makeMockSupabase();
    const result = await updatePassword('newpassword123', mock as never);

    expect(mock.auth.updateUser).toHaveBeenCalledOnce();
    expect(mock.auth.updateUser).toHaveBeenCalledWith({ password: 'newpassword123' });
    expect(result.error).toBeNull();
  });

  it('returns an error and does NOT call Supabase for a password shorter than 6 characters', async () => {
    const mock = makeMockSupabase();
    const result = await updatePassword('12345', mock as never);

    expect(result.error).toBeTruthy();
    expect(mock.auth.updateUser).not.toHaveBeenCalled();
  });

  it('returns an error and does NOT call Supabase for an empty password', async () => {
    const mock = makeMockSupabase();
    const result = await updatePassword('', mock as never);

    expect(result.error).toBeTruthy();
    expect(mock.auth.updateUser).not.toHaveBeenCalled();
  });

  it('surfaces the Supabase error message when the API call fails', async () => {
    const mock = makeMockSupabase(
      { error: null },
      { error: { message: 'Invalid or expired token' } as never }
    );
    const result = await updatePassword('validpassword', mock as never);

    expect(result.error).toBe('Invalid or expired token');
  });
});
