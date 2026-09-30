import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCaseType, fetchCaseTypes } from './caseTypesControls';

describe('case type controls', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches types for the selected project', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue([]),
    });
    vi.stubGlobal('fetch', fetchMock);

    await fetchCaseTypes('token', 7);

    expect(fetchMock.mock.calls[0][0]).toMatch(/\/casetypes\?projectId=7$/);
  });

  it('creates a type in the selected project', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ id: 5, name: '兼容性', sortOrder: 4, projectId: 7 }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await createCaseType('token', 7, '兼容性');

    expect(fetchMock.mock.calls[0][0]).toMatch(/\/casetypes\?projectId=7$/);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ name: '兼容性' }),
    });
  });
});
