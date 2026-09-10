import type { WorkflowStep } from '../mocks/cloudflare-workers';

/** Simulates Cloudflare Workflow step checkpoints (cached by step name). */
export function createWorkflowStep(options?: { cache?: Map<string, unknown> }): WorkflowStep {
  const cache = options?.cache ?? new Map<string, unknown>();

  return {
    do<T>(name: string, configOrFn: Record<string, unknown> | (() => Promise<T> | T), maybeFn?: () => Promise<T> | T): Promise<T> {
      const fn = (typeof configOrFn === 'function' ? configOrFn : maybeFn) as () => Promise<T> | T;
      if (cache.has(name)) return Promise.resolve(cache.get(name) as T);
      return Promise.resolve(fn()).then(result => {
        cache.set(name, result);
        return result;
      });
    },
    sleep: async () => {},
    sleepUntil: async () => {},
    waitForEvent: async () => undefined as never,
  };
}

/** Re-runs only steps after `after`, simulating a retry of downstream publish/storage work. */
export function createWorkflowStepRetryAfter(after: string, prior: Map<string, unknown>): WorkflowStep {
  const cache = new Map(prior);
  let replay = false;
  return {
    do<T>(name: string, configOrFn: Record<string, unknown> | (() => Promise<T> | T), maybeFn?: () => Promise<T> | T): Promise<T> {
      const fn = (typeof configOrFn === 'function' ? configOrFn : maybeFn) as () => Promise<T> | T;
      if (!replay) {
        if (name === after) replay = true;
        if (cache.has(name)) return Promise.resolve(cache.get(name) as T);
        return Promise.resolve(fn()).then(result => {
          cache.set(name, result);
          return result;
        });
      }
      if (cache.has(name) && name !== after && prior.has(name)) {
        return Promise.resolve(cache.get(name) as T);
      }
      return Promise.resolve(fn()).then(result => {
        cache.set(name, result);
        return result;
      });
    },
    sleep: async () => {},
    sleepUntil: async () => {},
    waitForEvent: async () => undefined as never,
  };
}
