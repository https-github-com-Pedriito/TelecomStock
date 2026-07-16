import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import bcryptjs from 'bcryptjs';
import { createFakeRepo } from '../../../../test/helpers/fakeDb';
import { makeAuthHeader } from '../../../../test/helpers/authRequest';

vi.mock('@/lib/db', () => ({ getDb: vi.fn() }));
vi.mock('@/lib/mailer', () => ({ sendPasswordChangedEmail: vi.fn().mockResolvedValue(undefined) }));

import { getDb } from '@/lib/db';
import { sendPasswordChangedEmail } from '@/lib/mailer';
import { PUT } from './route';

const OLD_PASSWORD = 'old-password-123';

function setupDb(opts: { tenants?: any[]; users?: any[] }) {
  const tenantRepo = createFakeRepo(opts.tenants ?? []);
  const userRepo = createFakeRepo(opts.users ?? []);
  vi.mocked(getDb).mockResolvedValue({
    getRepository: (entity: any) => {
      if (entity.name === 'Tenant') return tenantRepo as any;
      if (entity.name === 'User') return userRepo as any;
      throw new Error(`Unexpected repo: ${entity.name}`);
    },
  } as any);
  return { userRepo };
}

describe('PUT /api/auth/change-password', () => {
  it('rejects a missing old or new password', async () => {
    const { Authorization, tenantId } = makeAuthHeader();
    setupDb({ tenants: [{ id: tenantId, is_active: true }] });
    const req = new NextRequest('http://localhost/api/auth/change-password', {
      method: 'PUT',
      headers: { Authorization },
      body: JSON.stringify({ oldPassword: '', newPassword: '' }),
    });
    const res = await PUT(req, {});
    expect(res.status).toBe(400);
  });

  it('rejects an incorrect current password', async () => {
    const { Authorization, tenantId, userId } = makeAuthHeader();
    const hash = await bcryptjs.hash(OLD_PASSWORD, 4);
    setupDb({
      tenants: [{ id: tenantId, is_active: true }],
      users: [{ id: userId, email: 'jane@acme.com', password_hash: hash }],
    });
    const req = new NextRequest('http://localhost/api/auth/change-password', {
      method: 'PUT',
      headers: { Authorization },
      body: JSON.stringify({ oldPassword: 'wrong', newPassword: 'new-password-456' }),
    });
    const res = await PUT(req, {});
    expect(res.status).toBe(401);
    expect(sendPasswordChangedEmail).not.toHaveBeenCalled();
  });

  it('updates the password hash and sends a confirmation email', async () => {
    const { Authorization, tenantId, userId } = makeAuthHeader();
    const hash = await bcryptjs.hash(OLD_PASSWORD, 4);
    const { userRepo } = setupDb({
      tenants: [{ id: tenantId, is_active: true }],
      users: [{ id: userId, email: 'jane@acme.com', password_hash: hash }],
    });
    const req = new NextRequest('http://localhost/api/auth/change-password', {
      method: 'PUT',
      headers: { Authorization },
      body: JSON.stringify({ oldPassword: OLD_PASSWORD, newPassword: 'new-password-456' }),
    });
    const res = await PUT(req, {});
    expect(res.status).toBe(200);

    const updated = userRepo._all()[0];
    expect(await bcryptjs.compare('new-password-456', updated.password_hash)).toBe(true);
    expect(sendPasswordChangedEmail).toHaveBeenCalledWith('jane@acme.com');
  });
});
