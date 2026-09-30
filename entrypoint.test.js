import { describe, expect, it, vi } from 'vitest';
import { ensureAdminUser } from './entrypoint.js';

describe('ensureAdminUser', () => {
  it('creates the configured administrator when it does not exist', async () => {
    const User = {
      findOrCreate: vi.fn().mockResolvedValue([{ update: vi.fn() }, true]),
    };
    const bcrypt = {
      hash: vi.fn().mockResolvedValue('hashed-password'),
    };

    const result = await ensureAdminUser({
      User,
      bcrypt,
      adminUsername: 'admin666',
      adminPassword: '666666',
      adminEmail: 'admin666@local',
      adminRoleIndex: 0,
    });

    expect(User.findOrCreate).toHaveBeenCalledWith({
      where: { email: 'admin666@local' },
      defaults: {
        email: 'admin666@local',
        username: 'admin666',
        password: 'hashed-password',
        role: 0,
      },
    });
    expect(result).toEqual({ created: true, email: 'admin666@local', username: 'admin666' });
  });

  it('updates the configured administrator when it already exists', async () => {
    const existingUser = { update: vi.fn() };
    const User = {
      findOrCreate: vi.fn().mockResolvedValue([existingUser, false]),
    };
    const bcrypt = {
      hash: vi.fn().mockResolvedValue('new-hashed-password'),
    };

    await ensureAdminUser({
      User,
      bcrypt,
      adminUsername: 'admin666',
      adminPassword: '666666',
      adminEmail: 'admin666@local',
      adminRoleIndex: 0,
    });

    expect(existingUser.update).toHaveBeenCalledWith({
      username: 'admin666',
      password: 'new-hashed-password',
      role: 0,
    });
  });
});
