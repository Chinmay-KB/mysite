import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, Check, Download, Image, Images, Plus, RotateCcw, Share2, Sparkles, X } from 'lucide-react';
import type { Asset, Generation, GenerationInput, Model, Session, Theme } from '../shared/types';
import { outcomeForGenerationSubmit } from '../shared/generationReplay';
import { api, appLink, media, message, navigate, postGeneration } from './api';
import { AssetCard, Empty, Modal, PageHeading, Photo, ReferenceAssetTile, TemplateModalPhotoStrip, TemplateTileCover, themeArtBadge } from './components';
const ImageDetail = lazy(() => import('./ImageDetail'));

const SEED_THEME_SLUGS = ['yearbook-90s', 'y2k-fashion', 'action-figure', 'cinematic-poster', 'retro-film', 'wanderlust', 'fix-lighting', 'scribbles', 'studio', 'eighties'] as const;

function slugFromThemeId(themeId: string) {
  return SEED_THEME_SLUGS.find(slug => themeId === slug || themeId.startsWith(`${slug}-`));
}

function useRoute() {
  const [route, setRoute] = useState(location.hash.slice(1) || '/create');
  useEffect(() => {
    const change = () => {
      setRoute(location.hash.slice(1) || '/create');
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  return route;
}

export default function App() {
  const route = useRoute();
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [themes, setThemes] = useState<Theme[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [modelsState, setModelsState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [jobs, setJobs] = useState<Generation[]>([]);
  const [revision, setRevision] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const pendingKey = useRef<string | null>(null);
  const pendingRequestKey = useRef<string>(crypto.randomUUID());
  const report = useCallback((text: string) => setError(text), []);
  const announce = useCallback((text: string) => setNotice(text), []);
  const refresh = useCallback(() => setRevision(n => n + 1), []);
  useEffect(() => {
    api<Session>('/api/session').then(setSession).catch(e => report(message(e)));
  }, [report]);
  useEffect(() => {
    if (!session?.authenticated) return;
    let active = true;
    Promise.all([api<Theme[]>('/api/themes'), api<Generation[]>('/api/generations')]).then(([t, j]) => {
      if (active) {
        setThemes(t);
        setJobs(j);
      }
    }).catch(e => report(message(e)));
    return () => {
      active = false;
    };
  }, [session?.authenticated, revision, report]);
  useEffect(() => {
    if (!session?.authenticated) return;
    setModelsState('loading');
    api<Model[]>('/api/models').then(m => {
      setModels(m);
      setModelsState('ready');
    }).catch(() => setModelsState('error'));
  }, [session?.authenticated]);
  useEffect(() => {
    if (!jobs.some(j => ['queued', 'generating', 'saving'].includes(j.status)) && !themes.some(t => !t.cover_asset_id)) return;
    const timer = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      Promise.all([api<Generation[]>('/api/generations'), api<Theme[]>('/api/themes')]).then(([next, nextThemes]) => {
        setJobs(next);
        setThemes(nextThemes);
        if (next.some(n => n.status === 'ready' && jobs.find(j => j.id === n.id)?.status !== 'ready')) {
          refresh();
          announce('Your new image is ready.');
        }
      }).catch(e => report(message(e)));
    }, 3500);
    return () => clearInterval(timer);
  }, [jobs, themes, refresh, announce, report]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  function startWith(asset: Asset) {
    sessionStorage.setItem('sonumerous-pending-photo', asset.id);
    navigate('/create');
    announce('Pick a template to use this photo.');
  }
  async function submit(input: GenerationInput): Promise<Generation | null> {
    if (submitting) return null;
    setSubmitting(true);
    setError('');
    const fingerprint = JSON.stringify({ ...input, requestKey: '' });
    let payload = input;
    const idempotentReplay = pendingKey.current === fingerprint;
    if (!idempotentReplay) {
      pendingKey.current = fingerprint;
      payload = { ...input, requestKey: crypto.randomUUID() };
      pendingRequestKey.current = payload.requestKey;
    } else {
      payload = { ...input, requestKey: pendingRequestKey.current };
    }
    try {
      const job = await postGeneration(payload);
      setJobs(p => [job, ...p.filter(j => j.id !== job.id)]);
      const outcome = outcomeForGenerationSubmit(job, idempotentReplay);
      if (outcome.action === 'failed') {
        pendingKey.current = null;
        pendingRequestKey.current = crypto.randomUUID();
        report(outcome.message);
        return null;
      }
      if (outcome.rotateRequestKey) {
        pendingKey.current = null;
        pendingRequestKey.current = crypto.randomUUID();
      }
      if (outcome.action === 'ready') {
        refresh();
        announce(outcome.message);
        return job;
      }
      if (outcome.action === 'started' || outcome.action === 'in_progress') {
        announce(outcome.message);
        return job;
      }
      return job;
    } catch (e) {
      report(message(e));
      return null;
    } finally {
      setSubmitting(false);
    }
  }
  async function favourite(asset: Asset) {
    try {
      await api(`/api/assets/${asset.id}`, { method: 'PATCH', body: JSON.stringify({ favourite: !asset.favourite }) });
      refresh();
    } catch (e) {
      report(message(e));
    }
  }
  if (!session) return <div className="boot"><Brand /><p role="status">{error || 'Opening your studio…'}</p>{error && <button className="button secondary" onClick={() => location.reload()}>Try again</button>}</div>;
  if (!session.authenticated) return <div className="login-page"><header><Brand /><span>Personal image studio</span></header><main><div className="login-mark"><Images size={50} strokeWidth={1} /></div><h1>A place for<br />your imagination.</h1><p>Create something new. Keep what you love.<br />Make it a little more you.</p>{session.loginUrl ? <a className="button primary" href={appLink(session.loginUrl)}>Enter your studio<ArrowRight size={18} /></a> : <div className="setup-note"><h2>Your studio is taking shape.</h2><p>Private sign-in is being connected. Come back soon.</p></div>}<span className="login-caption">A private space. Sign in with your email.</span></main><footer>Sonumerous <span>Create. Collect. Reimagine.</span></footer></div>;
  const section = route.split('/')[1];
  return <div className="app-shell"><a className="skip-link" href="#main-content" onClick={e => { e.preventDefault(); document.getElementById('main-content')?.focus(); }}>Skip to content</a><aside className="sidebar"><a href="#/create" aria-label="Sonumerous home"><Brand /></a><nav aria-label="Main navigation">{[{ path: 'create', label: 'Create', icon: Plus }, { path: 'library', label: 'Library', icon: Images }, { path: 'references', label: 'References', icon: Image }].map(({ path, label, icon: Icon }) => <a key={path} href={`#/${path}`} className={section === path ? 'active' : ''} aria-current={section === path ? 'page' : undefined}><Icon size={19} strokeWidth={1.7} /><span>{label}</span></a>)}</nav><div className="sidebar-bottom"><a className="sidebar-signout" href={appLink('/cdn-cgi/access/logout')}>Sign out</a></div></aside><div className="main-shell"><div className="topbar"><a href="#/create" className="mobile-brand"><Brand /></a><span className="topbar-label">A little space to make something yours.</span></div><main id="main-content" tabIndex={-1}>{error && <div className="banner error" role="alert"><span>{error}</span><button className="icon-button" aria-label="Dismiss error" onClick={() => setError('')}><X size={18} /></button></div>}{notice && <div className="banner success" role="status"><Check size={17} /><span>{notice}</span><button className="icon-button" aria-label="Dismiss message" onClick={() => setNotice('')}><X size={18} /></button></div>}
    {section === 'create' ? <Create themes={themes} models={models} modelsState={modelsState} jobs={jobs} onSubmit={submit} submitting={submitting} session={session} onError={report} onRefresh={refresh} /> :
      section === 'references' ? <References onError={report} revision={revision} /> :
      section === 'library' ? <Library onError={report} revision={revision} onRefresh={refresh} onFavourite={favourite} jobs={jobs} /> :
        section === 'image' && route.split('/')[2] ? <Suspense fallback={<p role="status" className="loading-text">Opening your image…</p>}><ImageDetail assetId={route.split('/')[2]} models={models} session={session} onSubmit={submit} submitting={submitting} onError={report} onNotice={announce} onRefresh={refresh} revision={revision} /></Suspense> : <Empty title="This page wandered off." action={<a className="button primary" href="#/create">Back to Create</a>}>Your images are right where you left them.</Empty>}
  </main><footer className="app-footer"><span>AI generated for the naturally beautiful</span><span>Sonumerous</span></footer></div></div>;
}
function Brand() { return <span className="brand">Sonumerous<span className="brand-dot" aria-hidden="true">.</span></span>; }

interface CreateProps {
  themes: Theme[];
  models: Model[];
  modelsState: 'loading' | 'ready' | 'error';
  jobs: Generation[];
  onSubmit: (input: GenerationInput) => Promise<Generation | null>;
  submitting: boolean;
  session: Session;
  onError: (s: string) => void;
  onRefresh: () => void;
}

async function shareAsset(asset: Asset) {
  const downloadUrl = `${media(asset, 'original')}?download=true`;
  try {
    const response = await fetch(media(asset, 'original'));
    if (!response.ok) throw new Error('Could not load the image.');
    const blob = await response.blob();
    const file = new File([blob], asset.name.includes('.') ? asset.name : `${asset.name}.png`, { type: blob.type || asset.mime });
    if (typeof navigator.share === 'function' && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      await navigator.share({ files: [file], title: asset.name });
      return;
    }
  } catch {
    /* fall back to download */
  }
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = '';
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function creatingStatusLine(theme: Theme | null) {
  if (!theme) return 'Creating your image — this takes a minute or two';
  const slug = slugFromThemeId(theme.id);
  const labels: Record<string, string> = {
    eighties: '80s portrait',
    studio: 'studio portrait',
    scribbles: 'handwritten scribbles',
    'fix-lighting': 'lighting fix',
    wanderlust: 'travel collage',
    'yearbook-90s': '90s yearbook portrait',
    'y2k-fashion': 'Y2K editorial',
    'action-figure': 'action figure',
    'cinematic-poster': 'movie poster',
    'retro-film': 'retro film memory',
  };
  const label = (slug && labels[slug]) ?? theme.name.toLowerCase();
  return `Creating your ${label} — this takes a minute or two`;
}

function Create({ themes, models, modelsState, jobs, onSubmit, submitting, session, onError, onRefresh }: CreateProps) {
  const [modalTheme, setModalTheme] = useState<Theme | null>(null);
  const [photo, setPhoto] = useState<Asset | null>(null);
  const [previewJob, setPreviewJob] = useState<string | null>(null);
  const [previewTheme, setPreviewTheme] = useState<Theme | null>(null);
  const [previewSourcePhoto, setPreviewSourcePhoto] = useState<Asset | null>(null);
  const [latest, setLatest] = useState<Asset | null>(null);
  const coverRequested = useRef(new Set<string>());
  const requestKey = useRef(crypto.randomUUID());
  const activeJob = previewJob ? jobs.find(j => j.id === previewJob) : null;

  useEffect(() => {
    for (const theme of themes) {
      if (theme.cover_asset_id || coverRequested.current.has(theme.id)) continue;
      coverRequested.current.add(theme.id);
      void api(`/api/themes/${theme.id}/cover`, { method: 'POST' }).then(() => onRefresh()).catch(() => coverRequested.current.delete(theme.id));
    }
  }, [themes, onRefresh]);

  useEffect(() => {
    const themeId = sessionStorage.getItem('sonumerous-open-theme');
    if (themeId) {
      sessionStorage.removeItem('sonumerous-open-theme');
      const t = themes.find(x => x.id === themeId);
      if (t) setModalTheme(t);
    }
    const themeSlug = sessionStorage.getItem('sonumerous-open-theme-slug');
    if (themeSlug) {
      sessionStorage.removeItem('sonumerous-open-theme-slug');
      const t = themes.find(x => x.id === themeSlug || x.id === `theme:${themeSlug}` || x.id.startsWith(`${themeSlug}-`));
      if (t) setModalTheme(t);
    }
    const photoId = sessionStorage.getItem('sonumerous-pending-photo');
    if (photoId) {
      sessionStorage.removeItem('sonumerous-pending-photo');
      void api<{ asset: Asset }>(`/api/assets/${photoId}`).then(d => setPhoto(d.asset)).catch(e => onError(message(e)));
    }
  }, [themes, onError]);

  useEffect(() => {
    if (!activeJob?.output_asset_id) return;
    void api<{ asset: Asset }>(`/api/assets/${activeJob.output_asset_id}`).then(d => setLatest(d.asset)).catch(e => onError(message(e)));
  }, [activeJob?.output_asset_id, activeJob?.status, onError]);

  async function generate() {
    if (!modalTheme || !photo) return;
    const model = models[0]?.id ?? 'openai/gpt-image-2.5-sunburst';
    const input: GenerationInput = {
      prompt: modalTheme.description.trim() || modalTheme.name,
      model,
      aspectRatio: modalTheme.default_aspect ?? '1:1',
      referenceIds: [photo.id],
      themeId: modalTheme.id,
      themePrompt: modalTheme.prompt,
      avoid: modalTheme.avoid,
      parentAssetId: photo.id,
      preserve: '',
      annotationAssetId: null,
      region: null,
      usePreferences: true,
      requestKey: requestKey.current,
    };
    const job = await onSubmit(input);
    if (job) {
      setPreviewTheme(modalTheme);
      setPreviewSourcePhoto(photo);
      setModalTheme(null);
      setPhoto(null);
      setPreviewJob(job.id);
      requestKey.current = crypto.randomUUID();
    }
  }

  function openTryAgain() {
    const theme = previewTheme;
    setPreviewJob(null);
    setLatest(null);
    setPreviewTheme(null);
    setPreviewSourcePhoto(null);
    if (theme) {
      setModalTheme(theme);
      setPhoto(null);
    }
  }

  if (previewJob) {
    const busy = activeJob && ['queued', 'generating', 'saving'].includes(activeJob.status);
    const failed = activeJob?.status === 'failed';
    const ready = activeJob?.status === 'ready' && latest;
    return (
      <section className="create-result create-result--viewport" aria-label="Your generated image">
        <div className="create-result-stage">
          <div className="create-result-hero">
            {failed ? (
              <div className="create-failed" role="alert">
                <p className="create-failed-message">{activeJob.error ?? 'Something went wrong while creating your image.'}</p>
                <button type="button" className="button primary" onClick={openTryAgain}>Try again</button>
              </div>
            ) : (
              <div className="create-result-frame">
                {previewSourcePhoto && busy && (
                  <>
                    <img
                      className="create-source-pending create-result-fit"
                      src={media(previewSourcePhoto, 'preview')}
                      alt=""
                      width={previewSourcePhoto.width}
                      height={previewSourcePhoto.height}
                      loading="eager"
                      decoding="async"
                    />
                    <div className="create-pending-shimmer" aria-hidden="true" />
                  </>
                )}
                {ready && (
                  <>
                    <Photo asset={latest} priority className="create-result-image create-result-fit" />
                    <div className="create-result-bar" role="toolbar" aria-label="Result actions">
                      <a className="button primary create-result-bar-btn" href={`#/image/${latest.id}`}>Make changes</a>
                      <button type="button" className="button secondary create-result-bar-btn" aria-label="Share image" onClick={() => void shareAsset(latest)}>
                        <Share2 size={17} />
                        Share
                      </button>
                      <a className="button secondary create-result-bar-btn" href={`${media(latest, 'original')}?download=true`} download>
                        <Download size={17} />
                        Download
                      </a>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          {busy && (
            <div className="create-pending-meta" role="status">
              <p className="create-pending-status">{creatingStatusLine(previewTheme)}</p>
              {activeJob?.status === 'saving' && <p className="create-pending-sub">Saving your image and preparing previews.</p>}
            </div>
          )}
        </div>
        {ready && (
          <button type="button" className="text-link create-result-again" onClick={() => { setPreviewJob(null); setLatest(null); setPreviewTheme(null); setPreviewSourcePhoto(null); }}>
            Try another template
          </button>
        )}
      </section>
    );
  }

  return <>
    <PageHeading title="Pick a template" description="Choose a look, add your photo, and generate." action={<a className="button quiet" href="#/library">Your library<ArrowUpRight size={17} /></a>} />
    <div className="template-grid" role="list">
      {themes.filter(theme => !theme.hidden).map(theme => (
        <button key={theme.id} type="button" className="template-card" role="listitem" onClick={() => { setModalTheme(theme); setPhoto(null); }}>
          <div className="template-card-art">
            {theme.cover ? <TemplateTileCover asset={theme.cover} /> : theme.coverUrl ? <img className="template-tile-img" src={theme.coverUrl} alt="" loading="lazy" decoding="async" /> : <div className="theme-art template-art-placeholder" aria-hidden="true"><span>{themeArtBadge(theme)}</span></div>}
          </div>
          <span className="template-card-label">{theme.name}</span>
        </button>
      ))}
    </div>
    <Modal open={!!modalTheme} onOpenChange={open => { if (!open && !submitting) { setModalTheme(null); setPhoto(null); } }} title={modalTheme?.name ?? 'Template'} description={modalTheme?.description ?? 'Add your photo, then generate.'}>
      {modalTheme && <>
        <TemplateModalPhotoStrip
          open={!!modalTheme}
          selectedId={photo?.id ?? null}
          onSelect={setPhoto}
          onUploaded={() => onRefresh()}
          onError={onError}
        />
        <div className="dialog-footer template-modal-footer">
          <button type="button" className="button primary generate-button template-modal-generate" disabled={!photo || submitting || modelsState !== 'ready' || !models.length || !session.generationReady} onClick={() => void generate()}><Sparkles size={18} />{submitting ? 'Starting…' : 'Generate'}</button>
        </div>
      </>}
    </Modal>
  </>;
}

function References({ onError, revision }: { onError: (s: string) => void; revision: number }) {
  const [items, setItems] = useState<Asset[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const query = 'kind=upload';
  useEffect(() => {
    let current = true;
    setLoading(true);
    setFailed(false);
    void api<{ items: Asset[]; cursor: string | null }>(`/api/assets?${query}`).then(d => {
      if (current) {
        setItems(d.items);
        setCursor(d.cursor);
      }
    }).catch(e => {
      if (current) {
        setFailed(true);
        onError(message(e));
      }
    }).finally(() => {
      if (current) setLoading(false);
    });
    return () => {
      current = false;
    };
  }, [query, revision, onError]);
  async function more() {
    if (!cursor) return;
    setLoading(true);
    try {
      const data = await api<{ items: Asset[]; cursor: string | null }>(`/api/assets?${query}&cursor=${encodeURIComponent(cursor)}`);
      setItems(p => [...p, ...data.items]);
      setCursor(data.cursor);
    } catch (e) {
      onError(message(e));
    } finally {
      setLoading(false);
    }
  }
  return <>
    <PageHeading title="A familiar starting point." description="Photos you have saved for templates and refinements." />
    {failed ? (
      <Empty title="References couldn’t load." action={<button className="button secondary" type="button" onClick={() => location.reload()}>Try again</button>}>Check your connection and try again.</Empty>
    ) : !loading && !items.length ? (
      <Empty title="No saved photos yet." action={<a className="button secondary" href="#/create">Create from a template</a>}>Upload a photo when you pick a template on Create.</Empty>
    ) : (
      <div className="asset-grid references-grid">
        {items.map(asset => (
          <ReferenceAssetTile
            key={asset.id}
            asset={asset}
            onDeleted={id => setItems(p => p.filter(a => a.id !== id))}
            onError={onError}
          />
        ))}
      </div>
    )}
    {loading && <p className="loading-text" role="status">Loading your photos…</p>}
    {cursor && <div className="load-more"><button className="button secondary" type="button" disabled={loading} onClick={() => void more()}>Load more images</button></div>}
  </>;
}

function Library({ onError, revision, onRefresh, onFavourite, jobs }: { onError: (s: string) => void; revision: number; onRefresh: () => void; onFavourite: (a: Asset) => void; jobs: Generation[] }) {
  const [items, setItems] = useState<Asset[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [filter, setFilter] = useState('creations');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const query = `kind=generated&favourite=${filter === 'favourites'}`;
  useEffect(() => {
    let current = true;
    setLoading(true);
    setFailed(false);
    const timer = setTimeout(() => {
      api<{ items: Asset[]; cursor: string | null }>(`/api/assets?${query}`).then(d => {
        if (current) {
          setItems(d.items);
          setCursor(d.cursor);
        }
      }).catch(e => {
        if (current) {
          setFailed(true);
          onError(message(e));
        }
      }).finally(() => {
        if (current) setLoading(false);
      });
    }, 180);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [query, revision, onError]);
  async function more() {
    setLoading(true);
    try {
      const data = await api<{ items: Asset[]; cursor: string | null }>(`/api/assets?${query}&cursor=${encodeURIComponent(cursor ?? '')}`);
      setItems(p => [...p, ...data.items]);
      setCursor(data.cursor);
    } catch (e) {
      onError(message(e));
    } finally {
      setLoading(false);
    }
  }
  const pending = jobs.filter(j => ['queued', 'generating', 'saving', 'failed'].includes(j.status)).slice(0, 4);
  const failedJobs = pending.filter(j => j.status === 'failed');
  const inProgressJobs = pending.filter(j => j.status !== 'failed');
  const statusTileCount = failedJobs.length + inProgressJobs.length;
  const showCollectionEmpty = !loading && !items.length && !statusTileCount;
  const emptyTitle = filter === 'favourites' ? 'Keep your favourites close.' : 'Your collection is empty.';
  const emptyAction = <a className="button secondary" href="#/create">Create from a template</a>;
  const emptyBody = filter === 'favourites' ? 'Tap the heart on an image to save it here.' : 'Pick a template on Create to make your first image.';

  return <>
    <div className="library-toolbar library-toolbar--segment-only">
      <div className="segmented" role="group" aria-label="Filter images">
        {['creations', 'favourites'].map(f => (
          <button key={f} type="button" className={filter === f ? 'active' : ''} onClick={() => setFilter(f)} aria-pressed={filter === f}>
            {f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>
    </div>
    {failed ? (
      <Empty title="The library couldn’t load." action={<button className="button secondary" onClick={onRefresh}>Try again</button>}>Check your connection and try again.</Empty>
    ) : showCollectionEmpty ? (
      <Empty title={emptyTitle} action={emptyAction}>{emptyBody}</Empty>
    ) : (
      <div className="asset-grid">
        {failedJobs.map(j => (
          <a key={j.id} href="#/create" className="library-status-tile library-status-tile--failed" aria-label="Try again">
            <RotateCcw size={18} strokeWidth={1.75} />
          </a>
        ))}
        {inProgressJobs.map(j => (
          <div key={j.id} className="library-status-tile library-status-tile--pending" aria-label="Generating">
            <Sparkles size={18} strokeWidth={1.75} />
          </div>
        ))}
        {items.map(asset => (
          <AssetCard key={asset.id} asset={asset} visualOnly onClick={() => navigate(`/image/${asset.id}`)} onFavourite={onFavourite} />
        ))}
      </div>
    )}
    {loading && <p className="loading-text" role="status">Loading your images…</p>}
    {cursor && <div className="load-more"><button className="button secondary" disabled={loading} onClick={() => void more()}>Load more images</button></div>}
  </>;
}
