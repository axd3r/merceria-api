import { hashPassword, verifyPassword } from './password';
describe('Passwords', () => {
  it('salts passwords independently and verifies without plaintext storage', async () => {
    const password = 'Long password for testing';
    const a = await hashPassword(password),
      b = await hashPassword(password);
    expect(a).not.toEqual(b);
    expect(a).not.toContain(password);
    expect(await verifyPassword(password, a)).toBe(true);
    expect(await verifyPassword('wrong', a)).toBe(false);
    expect(await verifyPassword(password, 'invalid')).toBe(false);
  });
});
