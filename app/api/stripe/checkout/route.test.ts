import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createFakeRepo } from '../../../../test/helpers/fakeDb';

vi.mock('@/lib/db', () => ({ getDb: vi.fn() }));
vi.mock('@/lib/stripe', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/stripe')>();
  return { ...actual, getStripe: vi.fn() };
});

import { getDb } from '@/lib/db';
import { getStripe } from '@/lib/stripe';
import { POST } from './route';

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/stripe/checkout', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

const validBody = {
  nom_societe: 'ACME Corp',
  slug: 'acme-corp',
  admin_prenom: 'Jane',
  admin_nom: 'Doe',
  admin_email: 'jane@acme.com',
  plan: 'pro_mobile',
  seats: 3,
};

describe('POST /api/stripe/checkout', () => {
  beforeEach(() => {
    vi.mocked(getDb).mockResolvedValue({
      getRepository: (entity: any) => {
        if (entity.name === 'Tenant') return createFakeRepo([]) as any;
        if (entity.name === 'User') return createFakeRepo([]) as any;
        throw new Error(`Unexpected repo: ${entity.name}`);
      },
    } as any);
    vi.mocked(getStripe).mockReturnValue({
      checkout: {
        sessions: {
          create: vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/test-session' }),
        },
      },
    } as any);
  });

  it('rejects a missing required field', async () => {
    const res = await POST(makeRequest({ ...validBody, nom_societe: '' }));
    expect(res.status).toBe(400);
  });

  it('rejects an invalid plan', async () => {
    const res = await POST(makeRequest({ ...validBody, plan: 'gold_plan' }));
    expect(res.status).toBe(400);
  });

  it('rejects seats above the plan cap', async () => {
    const res = await POST(makeRequest({ ...validBody, plan: 'pro_mobile', seats: 10 }));
    expect(res.status).toBe(400);
  });

  it('rejects an invalid slug format', async () => {
    const res = await POST(makeRequest({ ...validBody, slug: 'Not Valid Slug!' }));
    expect(res.status).toBe(400);
  });

  it('rejects a slug already used by another tenant', async () => {
    vi.mocked(getDb).mockResolvedValue({
      getRepository: (entity: any) => {
        if (entity.name === 'Tenant') return createFakeRepo([{ id: 't1', slug: 'acme-corp', nom: 'Existing' }]) as any;
        if (entity.name === 'User') return createFakeRepo([]) as any;
        throw new Error('unexpected');
      },
    } as any);
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(409);
  });

  it('rejects an email already used by another user', async () => {
    vi.mocked(getDb).mockResolvedValue({
      getRepository: (entity: any) => {
        if (entity.name === 'Tenant') return createFakeRepo([]) as any;
        if (entity.name === 'User') return createFakeRepo([{ id: 'u1', email: 'jane@acme.com' }]) as any;
        throw new Error('unexpected');
      },
    } as any);
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(409);
  });

  it('creates a Stripe checkout session for a valid request', async () => {
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.url).toContain('checkout.stripe.com');
  });

  it('passes the requested seat count as the line item quantity', async () => {
    const createMock = vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/test-session' });
    vi.mocked(getStripe).mockReturnValue({ checkout: { sessions: { create: createMock } } } as any);

    await POST(makeRequest({ ...validBody, seats: 4 }));

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [expect.objectContaining({ quantity: 4 })],
      })
    );
  });
});
