/** Test-only stub for `cloudflare:workers` — not used in production builds. */
export class WorkflowEntrypoint<_Env = unknown, _Params = unknown> {
  protected env: _Env;

  constructor(_ctx: unknown, env: _Env) {
    this.env = env;
  }
}

export interface WorkflowEvent<TPayload> {
  payload: TPayload;
}

export interface WorkflowStep {
  do<T>(
    name: string,
    callback: () => Promise<T> | T,
  ): Promise<T>;
  do<T>(
    name: string,
    config: Record<string, unknown>,
    callback: () => Promise<T> | T,
  ): Promise<T>;
  sleep: (name: string, duration: string) => Promise<void>;
  sleepUntil: (name: string, timestamp: Date | number) => Promise<void>;
  waitForEvent: <T>(name: string, options: { type: string; timeout?: string }) => Promise<T>;
}
