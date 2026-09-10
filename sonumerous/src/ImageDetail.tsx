import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Download, Heart, Pencil, Sparkles } from 'lucide-react';
import type { Asset, Detail, Generation, GenerationInput, Model, Session } from '../shared/types';
import { api, media, message, navigate } from './api';
import { Empty, Modal, Photo } from './components';

interface Props {
  assetId: string;
  models: Model[];
  session: Session;
  submitting: boolean;
  revision: number;
  onSubmit: (input: GenerationInput) => Promise<Generation | null>;
  onError: (text: string) => void;
  onNotice: (text: string) => void;
  onRefresh: () => void;
}

export default function ImageDetail({ assetId, models, session, submitting, revision, onSubmit, onError, onNotice, onRefresh }: Props) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [viewId, setViewId] = useState(assetId);
  const [changeOpen, setChangeOpen] = useState(false);
  const [changePrompt, setChangePrompt] = useState('');
  const [pendingJob, setPendingJob] = useState<string | null>(null);
  const [pendingRefine, setPendingRefine] = useState<Generation | null>(null);
  const [loading, setLoading] = useState(true);
  const pendingKey = useRef<string | null>(null);

  const viewAsset = useMemo(() => {
    if (!detail) return null;
    const version = detail.versions.find(v => v.asset?.id === viewId);
    if (version?.asset) return version.asset;
    return detail.asset;
  }, [detail, viewId]);

  const themeContext = useMemo(() => {
    if (!detail?.generation?.snapshot) return null;
    try {
      const snap = JSON.parse(detail.generation.snapshot) as { input?: GenerationInput };
      return snap.input ?? null;
    } catch {
      return null;
    }
  }, [detail?.generation?.snapshot]);

  const load = useCallback(() => {
    setLoading(true);
    api<Detail>(`/api/assets/${assetId}`)
      .then(data => {
        setDetail(data);
        setViewId(data.asset.id);
      })
      .catch(e => onError(message(e)))
      .finally(() => setLoading(false));
  }, [assetId, onError]);

  useEffect(() => {
    load();
  }, [load, revision]);

  useEffect(() => {
    if (!pendingJob) return;
    const timer = setInterval(() => {
      api<Detail>(`/api/assets/${assetId}`)
        .then(data => {
          setDetail(data);
          const job = data.versions.find(v => v.id === pendingJob) ?? (data.generation?.id === pendingJob ? data.generation : null);
          if (job && 'status' in job && (job.status === 'ready' || job.status === 'failed')) {
            setPendingJob(null);
            setPendingRefine(null);
            if (job.status === 'ready' && job.output_asset_id) {
              setViewId(job.output_asset_id);
              onNotice('Your refined image is ready.');
              onRefresh();
            }
            if (job.status === 'failed') onError(job.error ?? 'Refinement did not complete.');
          }
        })
        .catch(() => {});
    }, 3500);
    return () => clearInterval(timer);
  }, [assetId, pendingJob, onError, onNotice, onRefresh]);

  async function toggleFavourite() {
    if (!viewAsset) return;
    try {
      await api(`/api/assets/${viewAsset.id}`, { method: 'PATCH', body: JSON.stringify({ favourite: !viewAsset.favourite }) });
      load();
    } catch (e) {
      onError(message(e));
    }
  }

  async function submitChange() {
    if (!viewAsset || !changePrompt.trim()) return;
    const defaultModel = models[0]?.id ?? 'openai/gpt-image-2.5-sunburst';
    const defaultRatio = models[0]?.ratios[0] ?? '1:1';
    let input: GenerationInput = {
      prompt: changePrompt.trim(),
      model: themeContext?.model ?? defaultModel,
      aspectRatio: themeContext?.aspectRatio ?? defaultRatio,
      referenceIds: [],
      themeId: themeContext?.themeId ?? null,
      themePrompt: themeContext?.themePrompt ?? '',
      avoid: themeContext?.avoid ?? '',
      parentAssetId: viewAsset.id,
      preserve: '',
      annotationAssetId: null,
      region: null,
      usePreferences: themeContext?.usePreferences ?? true,
      requestKey: crypto.randomUUID(),
    };
    const fingerprint = JSON.stringify({ ...input, requestKey: '' });
    if (pendingKey.current !== fingerprint) {
      pendingKey.current = fingerprint;
      input = { ...input, requestKey: crypto.randomUUID() };
    }
    const job = await onSubmit(input);
    if (!job) return;
    setChangeOpen(false);
    setChangePrompt('');
    if (job.status === 'ready') {
      pendingKey.current = null;
      if (job.output_asset_id) setViewId(job.output_asset_id);
      load();
      return;
    }
    if (['queued', 'generating', 'saving'].includes(job.status)) {
      setPendingJob(job.id);
      setPendingRefine(job);
      pendingKey.current = null;
      load();
    }
  }

  const displayVersions = useMemo(() => {
    if (!detail || !viewAsset) return [] as (Generation & { asset: Asset | null })[];
    let rows: (Generation & { asset: Asset | null })[] = detail.versions.length
      ? [...detail.versions]
      : detail.generation
        ? [{ ...detail.generation, asset: detail.asset }]
        : [
            {
              id: detail.asset.id,
              root_id: detail.asset.id,
              parent_asset_id: null,
              model: '',
              prompt: detail.asset.name,
              status: 'ready',
              error: null,
              output_asset_id: detail.asset.id,
              created_at: detail.asset.created_at,
              snapshot: '{}',
              asset: detail.asset,
            } as Generation & { asset: Asset },
          ];

    if (pendingRefine && !rows.some(r => r.id === pendingRefine.id)) {
      if (!rows.some(r => r.asset?.id === viewAsset.id)) {
        rows = [
          ...rows,
          {
            id: `view-${viewAsset.id}`,
            root_id: pendingRefine.root_id,
            parent_asset_id: viewAsset.id,
            model: pendingRefine.model,
            prompt: viewAsset.name,
            status: 'ready',
            error: null,
            output_asset_id: viewAsset.id,
            created_at: viewAsset.created_at,
            snapshot: '{}',
            asset: viewAsset,
          } as Generation & { asset: Asset },
        ];
      }
      rows = [...rows, { ...pendingRefine, asset: null }];
    }
    return rows;
  }, [detail, viewAsset, pendingRefine]);

  const showVersionStrip =
    displayVersions.length > 1 || displayVersions.some(v => !v.asset);

  if (loading) return <p className="loading-text" role="status">Opening your image…</p>;
  if (!detail || !viewAsset) {
    return (
      <Empty title="This image could not be found." action={<button className="button primary" onClick={() => navigate('/library')}>Back to library</button>}>
        It may have been removed, or the link is outdated.
      </Empty>
    );
  }

  const activeJob = pendingJob
    ? displayVersions.find(v => v.id === pendingJob) ?? pendingRefine
    : null;
  const showPending = activeJob && ['queued', 'generating', 'saving'].includes(activeJob.status);

  return (
    <>
      <section className="detail-viewport" aria-label="Image">
        <div className="detail-viewport-top">
          <button type="button" className="button quiet detail-back" onClick={() => navigate('/library')}>
            <ArrowLeft size={17} />
            Library
          </button>
          <h1 className="sr-only">{viewAsset.name}</h1>
        </div>

        {showVersionStrip && (
          <div className="version-strip version-strip--compact" role="tablist" aria-label="Version history">
            {displayVersions.map(v => {
              const pending = !v.asset;
              const selected = v.asset?.id === viewId;
              return (
                <button
                  key={v.id}
                  type="button"
                  className={`version-thumb ${selected ? 'active' : ''} ${pending ? 'version-thumb--pending' : ''}`}
                  aria-selected={selected}
                  disabled={pending}
                  onClick={() => v.asset && setViewId(v.asset.id)}
                  title={v.prompt}
                >
                  {v.asset ? (
                    <Photo asset={v.asset} small />
                  ) : (
                    <span className="version-thumb-pending" aria-hidden="true">
                      <span className="version-thumb-shimmer" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className="detail-viewport-stage">
          <div className="detail-image-wrap detail-image-wrap--viewport">
            <Photo asset={viewAsset} priority className="detail-fit-image" />
            <div className="detail-photo-overlay">
              <button
                type="button"
                className={`detail-overlay-btn detail-overlay-btn--fav ${viewAsset.favourite ? 'is-favourite' : ''}`}
                aria-label={viewAsset.favourite ? 'Remove favourite' : 'Add favourite'}
                onClick={() => void toggleFavourite()}
              >
                <Heart size={17} fill={viewAsset.favourite ? 'currentColor' : 'none'} />
              </button>
              <div className="detail-overlay-stack">
                <a className="detail-overlay-btn" href={`${media(viewAsset, 'original')}?download=true`} aria-label="Download">
                  <Download size={17} />
                </a>
                <button
                  type="button"
                  className="detail-overlay-btn"
                  aria-label="Make changes"
                  disabled={Boolean(showPending) || !session.generationReady}
                  onClick={() => setChangeOpen(true)}
                >
                  <Pencil size={17} />
                </button>
              </div>
            </div>
          </div>

          {showPending && (
            <p className="detail-pending-status sr-only" role="status">
              {activeJob!.status === 'queued' ? 'Queued' : activeJob!.status === 'saving' ? 'Saving your refinement' : 'Creating your refinement'}
            </p>
          )}
        </div>
      </section>

      <Modal
        open={changeOpen}
        onOpenChange={open => {
          if (!open && !submitting) {
            setChangeOpen(false);
            setChangePrompt('');
          }
        }}
        title="Make changes"
        description="Describe what should change in this image."
      >
        <label className="form-stack">
          What should change?
          <textarea
            className="prompt-input"
            maxLength={6000}
            value={changePrompt}
            onChange={e => setChangePrompt(e.target.value)}
            placeholder="Describe the adjustment you want…"
            rows={4}
          />
        </label>
        <div className="dialog-footer">
          <button
            type="button"
            className="button primary generate-button"
            disabled={submitting || !changePrompt.trim() || !session.generationReady}
            onClick={() => void submitChange()}
          >
            <Sparkles size={18} />
            {submitting ? 'Starting…' : 'Generate'}
          </button>
        </div>
      </Modal>
    </>
  );
}
