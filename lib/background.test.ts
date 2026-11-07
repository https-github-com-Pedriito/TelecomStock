import { describe, expect, it, vi } from 'vitest';

const afterMock = vi.hoisted(() => vi.fn());
vi.mock('next/server', () => ({ after: afterMock }));

import { runAfterResponse } from './background';

describe('runAfterResponse', () => {
  it('délègue à after() : la tâche n\'est pas attendue', async () => {
    afterMock.mockImplementation(() => undefined);
    const task = vi.fn().mockResolvedValue(undefined);
    await runAfterResponse(task);
    expect(afterMock).toHaveBeenCalledTimes(1);
    expect(task).not.toHaveBeenCalled();
  });

  it('exécute la tâche directement hors d\'une requête Next (after lève)', async () => {
    afterMock.mockImplementation(() => {
      throw new Error('outside a request scope');
    });
    const task = vi.fn().mockResolvedValue(undefined);
    await runAfterResponse(task);
    expect(task).toHaveBeenCalledTimes(1);
  });

  it('ne laisse jamais une erreur de la tâche remonter', async () => {
    afterMock.mockImplementation(() => {
      throw new Error('outside a request scope');
    });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(runAfterResponse(async () => { throw new Error('boom'); })).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
