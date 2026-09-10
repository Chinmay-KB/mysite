import type { Generation } from './types';

export type GenerationSubmitOutcome =
  | { action: 'failed'; message: string; rotateRequestKey: true }
  | { action: 'ready'; message: string; rotateRequestKey: true; outputAssetId: string | null }
  | {
      action: 'in_progress';
      message: string;
      rotateRequestKey: true;
      status: 'queued' | 'generating' | 'saving';
    }
  | { action: 'started'; message: string; rotateRequestKey: true };

export function outcomeForGenerationSubmit(job: Generation, idempotentReplay: boolean): GenerationSubmitOutcome {
  switch (job.status) {
    case 'failed':
      return {
        action: 'failed',
        message: job.error ?? 'This generation did not finish. Change the prompt or settings and try again.',
        rotateRequestKey: true,
      };
    case 'ready':
      return {
        action: 'ready',
        message: job.output_asset_id
          ? 'This image is already in your library.'
          : 'This generation has already finished.',
        rotateRequestKey: true,
        outputAssetId: job.output_asset_id,
      };
    case 'queued':
      return idempotentReplay
        ? { action: 'in_progress', message: 'Your image is still queued.', rotateRequestKey: true, status: 'queued' }
        : { action: 'started', message: 'Image started. You can leave this page and come back to it.', rotateRequestKey: true };
    case 'generating':
      return {
        action: 'in_progress',
        message: 'Your image is still generating.',
        rotateRequestKey: true,
        status: 'generating',
      };
    case 'saving':
      return {
        action: 'in_progress',
        message: 'Your image is still being saved.',
        rotateRequestKey: true,
        status: 'saving',
      };
    default: {
      const never: never = job.status;
      throw new Error(`Unexpected generation status: ${never}`);
    }
  }
}
