import { useEffect, useRef, useState, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowUpRight, Check, Heart, ImagePlus, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import type { Asset } from '../shared/types';
import { api, media, message, upload, uploadWithProgress } from './api';

export function Photo({asset,small=false,priority=false,...props}: {asset:Asset;small?:boolean;priority?:boolean;className?:string}) {
  return <img {...props} src={media(asset,small?'thumb':'preview')} srcSet={small ? undefined : `${media(asset,'thumb')} 400w, ${media(asset,'preview')} 1400w`} sizes={small?undefined:'(max-width: 700px) 100vw, 60vw'} alt={asset.name} width={asset.width} height={asset.height} loading={priority?'eager':'lazy'} decoding="async" />;
}

/** Template grid tile: thumb only, reserved square slot, no layout shift. */
export function TemplateTileCover({ asset }: { asset: Asset }) {
  return (
    <img
      className="template-tile-img"
      src={media(asset, 'thumb')}
      alt=""
      width={asset.width || 400}
      height={asset.height || 400}
      loading="lazy"
      decoding="async"
    />
  );
}

export function TemplateModalPhotoStrip({
  open,
  selectedId,
  onSelect,
  onUploaded,
  onError,
}: {
  open: boolean;
  selectedId: string | null;
  onSelect: (asset: Asset) => void;
  onUploaded: (assets: Asset[]) => void;
  onError: (text: string) => void;
}) {
  const [items, setItems] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState('');
  const uploadAbort = useRef<AbortController | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    void api<{ items: Asset[] }>('/api/assets?kind=upload')
      .then(data => {
        if (active) setItems(data.items);
      })
      .catch(error => {
        if (active) onError(message(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, onError]);

  async function handleFiles(files: FileList | null) {
    if (!files?.length || uploadBusy) return;
    setUploadError('');
    setUploadBusy(true);
    setUploadPercent(0);
    uploadAbort.current?.abort();
    const controller = new AbortController();
    uploadAbort.current = controller;
    const results: Asset[] = [];
    try {
      for (const file of Array.from(files)) {
        if (file.size > 20 * 1024 * 1024) throw new Error(`${file.name} is larger than 20 MB. Choose a smaller image.`);
        results.push(await uploadWithProgress(file, file.name, {
          signal: controller.signal,
          onProgress: progress => setUploadPercent(progress.percent),
        }));
      }
    } catch (error) {
      const text = message(error);
      setUploadError(text);
      onError(text);
    } finally {
      if (results.length) {
        setItems(prev => [...results, ...prev.filter(a => !results.some(r => r.id === a.id))]);
        onSelect(results[0]!);
        onUploaded(results);
        setUploadError('');
      }
      setUploadBusy(false);
      setUploadPercent(null);
      uploadAbort.current = null;
      if (input.current) input.current.value = '';
    }
  }

  function cancelUpload() {
    uploadAbort.current?.abort();
  }

  const empty = !loading && items.length === 0;

  return (
    <div className="template-modal-strip-wrap">
      {empty && <p className="template-modal-strip-hint">Upload a photo to start — saved uploads will show up here.</p>}
      <div className="template-modal-strip" role="listbox" aria-label="Your photos">
        <input
          className="sr-only"
          tabIndex={-1}
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif"
          capture="environment"
          onChange={e => void handleFiles(e.target.files)}
        />
        <div className="template-modal-strip-upload-wrap">
          <button
            type="button"
            className="template-modal-strip-item template-modal-strip-upload"
            aria-label={uploadBusy ? `Uploading ${uploadPercent ?? 0} percent` : 'Upload a photo'}
            disabled={uploadBusy}
            onClick={() => !uploadBusy && input.current?.click()}
          >
            {uploadBusy && uploadPercent !== null ? (
              <span className="upload-ring" aria-hidden="true">
                <svg viewBox="0 0 36 36">
                  <circle className="upload-ring-track" cx="18" cy="18" r="15" />
                  <circle
                    className="upload-ring-progress"
                    cx="18"
                    cy="18"
                    r="15"
                    style={{ strokeDashoffset: `${94.25 - (94.25 * uploadPercent) / 100}` }}
                  />
                </svg>
                <span className="upload-ring-label">{uploadPercent}%</span>
              </span>
            ) : (
              <Upload size={22} strokeWidth={1.5} aria-hidden="true" />
            )}
            <span className="template-modal-strip-upload-label">{uploadBusy ? 'Uploading…' : 'Upload'}</span>
          </button>
          {uploadBusy && (
            <button type="button" className="upload-cancel text-link" onClick={() => cancelUpload()}>
              Cancel
            </button>
          )}
          {uploadError && !uploadBusy && (
            <button type="button" className="upload-retry text-link" onClick={() => input.current?.click()}>
              Try upload again
            </button>
          )}
        </div>
        {items.map(asset => {
          const selected = selectedId === asset.id;
          return (
            <button
              key={asset.id}
              type="button"
              role="option"
              aria-selected={selected}
              aria-label={`Use ${asset.name}`}
              className={`template-modal-strip-item template-modal-strip-thumb ${selected ? 'is-selected' : ''}`}
              onClick={() => onSelect(asset)}
            >
              <img
                src={media(asset, 'thumb')}
                alt=""
                width={asset.width || 400}
                height={asset.height || 400}
                loading="lazy"
                decoding="async"
              />
              {selected && (
                <span className="template-modal-strip-check" aria-hidden="true">
                  <Check size={16} strokeWidth={2.5} />
                </span>
              )}
            </button>
          );
        })}
      </div>
      {loading && <p className="template-modal-strip-status" role="status">Loading your photos…</p>}
    </div>
  );
}
export function Empty({icon=<ImagePlus size={30} strokeWidth={1.25}/>,title,children,action}: {icon?:ReactNode;title:string;children:ReactNode;action?:ReactNode}) {
  return <div className="empty"><div className="empty-icon">{icon}</div><h2>{title}</h2><p>{children}</p>{action}</div>;
}
export function UploadButton({onUpload,onError,children='Upload images',className='button secondary',onBusy,multiple=true,capture}: {onUpload:(assets:Asset[])=>void;onError:(text:string)=>void;children?:ReactNode;className?:string;onBusy?:(busy:boolean)=>void;multiple?:boolean;capture?:boolean}) {
  const input = useRef<HTMLInputElement>(null); const [busy,setBusy]=useState(false);
  async function handle(files:FileList|null) {
    if (!files?.length) return; setBusy(true); onBusy?.(true); const results:Asset[]=[];
    try { for (const file of Array.from(files)) { if(file.size>20*1024*1024) throw new Error(`${file.name} is larger than 20 MB. Choose a smaller image.`); results.push(await upload(file,file.name)); } }
    catch(error) { onError(message(error)); }
    finally { if(results.length) onUpload(results); setBusy(false); onBusy?.(false); if(input.current)input.current.value=''; }
  }
  return <><input className="sr-only" tabIndex={-1} ref={input} type="file" multiple={multiple} accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif" capture={capture ? 'environment' : undefined} onChange={e=>void handle(e.target.files)}/><button type="button" className={className} disabled={busy} onClick={()=>input.current?.click()}><Upload size={17}/>{busy?'Saving images…':children}</button></>;
}

export function themeArtBadge(theme: { id: string; name: string }) {
  return theme.id.startsWith('eighties-') ? '’80' : theme.name.slice(0, 2);
}
export function AssetCard({
  asset,
  onClick,
  onFavourite,
  selected,
  visualOnly = false,
}: {
  asset: Asset;
  onClick: () => void;
  onFavourite?: (asset: Asset) => void;
  selected?: boolean;
  /** Library grid: image tile only, favourite on overlay. */
  visualOnly?: boolean;
}) {
  if (visualOnly) {
    return (
      <article className={`asset-card asset-card--visual ${selected ? 'selected' : ''}`}>
        <div className="asset-image-shell">
          <button
            type="button"
            className="asset-image"
            onClick={onClick}
            aria-label={`Open ${asset.name}`}
            aria-pressed={selected === undefined ? undefined : selected}
          >
            <Photo asset={asset} small />
            {selected && (
              <span className="selected-mark">
                <Check size={17} />
              </span>
            )}
          </button>
          {onFavourite && (
            <button
              type="button"
              className={`asset-favourite-overlay icon-button ${asset.favourite ? 'is-favourite' : ''}`}
              aria-label={asset.favourite ? 'Remove from favourites' : 'Add to favourites'}
              aria-pressed={Boolean(asset.favourite)}
              onClick={event => {
                event.stopPropagation();
                onFavourite(asset);
              }}
            >
              <Heart size={16} fill={asset.favourite ? 'currentColor' : 'none'} />
            </button>
          )}
        </div>
      </article>
    );
  }
  return (
    <article className={`asset-card ${selected ? 'selected' : ''}`}>
      <button type="button" className="asset-image" onClick={onClick} aria-label={`${selected ? 'Deselect' : 'Open'} ${asset.name}`} aria-pressed={selected === undefined ? undefined : selected}>
        <Photo asset={asset} small />
        {selected && (
          <span className="selected-mark">
            <Check size={17} />
          </span>
        )}
      </button>
      <div className="asset-caption">
        <div>
          <h3>{asset.name}</h3>
          <p>
            {asset.kind === 'upload' ? 'Uploaded' : 'Created'} · {new Date(asset.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </p>
        </div>
        {onFavourite && (
          <button type="button" className={`icon-button ${asset.favourite ? 'is-favourite' : ''}`} aria-label={asset.favourite ? 'Remove from favourites' : 'Add to favourites'} aria-pressed={Boolean(asset.favourite)} onClick={() => onFavourite(asset)}>
            <Heart size={18} fill={asset.favourite ? 'currentColor' : 'none'} />
          </button>
        )}
      </div>
    </article>
  );
}

export function ReferenceAssetTile({
  asset,
  onDeleted,
  onError,
}: {
  asset: Asset;
  onDeleted: (id: string) => void;
  onError: (text: string) => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  async function confirmDelete() {
    setDeleting(true);
    try {
      await api(`/api/assets/${asset.id}`, { method: 'DELETE' });
      onDeleted(asset.id);
      setConfirmOpen(false);
    } catch (e) {
      onError(message(e));
    } finally {
      setDeleting(false);
    }
  }
  return (
    <>
      <article className="asset-card asset-card--visual reference-grid-tile">
        <div className="asset-image-shell">
          <div className="asset-image reference-tile-image">
            <Photo asset={asset} small />
          </div>
          <button
            type="button"
            className="reference-grid-delete icon-button"
            aria-label={`Delete ${asset.name}`}
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 size={15} strokeWidth={1.75} />
          </button>
        </div>
      </article>
      <Modal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete this photo?"
        description="This removes the upload from your references. Images you already created stay in your library."
      >
        <div className="dialog-actions">
          <button type="button" className="button secondary" onClick={() => setConfirmOpen(false)}>
            Cancel
          </button>
          <button type="button" className="button primary" disabled={deleting} onClick={() => void confirmDelete()}>
            Delete
          </button>
        </div>
      </Modal>
    </>
  );
}

export function Modal({open,onOpenChange,title,description,children,wide=false}: {open:boolean;onOpenChange:(open:boolean)=>void;title:string;description:string;children:ReactNode;wide?:boolean}) {
  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal><Dialog.Overlay className="dialog-overlay"/><Dialog.Content className={`dialog-content ${wide?'wide':''}`}><div className="dialog-heading"><div><Dialog.Title>{title}</Dialog.Title><Dialog.Description>{description}</Dialog.Description></div><Dialog.Close className="icon-button" aria-label="Close"><X size={21}/></Dialog.Close></div>{children}</Dialog.Content></Dialog.Portal></Dialog.Root>;
}
export function SavedPhotoGrid({activeId,onPick,onError,single}: {activeId?:string|null;onPick:(asset:Asset)=>void;onError:(text:string)=>void;single?:boolean}) {
  const [items,setItems]=useState<Asset[]>([]); const [search,setSearch]=useState(''); const [kind,setKind]=useState(''); const [cursor,setCursor]=useState<string|null>(null); const [loading,setLoading]=useState(false); const [error,setError]=useState('');
  useEffect(()=>{ let current=true; setLoading(true);setError('');const timer=setTimeout(()=>{api<{items:Asset[];cursor:string|null}>(`/api/assets?q=${encodeURIComponent(search)}&kind=${kind}`).then(data=>{if(current){setItems(data.items);setCursor(data.cursor);}}).catch(e=>{if(current)setError(message(e));}).finally(()=>{if(current)setLoading(false);});},200);return()=>{current=false;clearTimeout(timer);};},[search,kind]);
  function toggle(asset:Asset){onPick(asset);}
  async function more(){if(!cursor)return;setLoading(true);try{const data=await api<{items:Asset[];cursor:string|null}>(`/api/assets?q=${encodeURIComponent(search)}&kind=${kind}&cursor=${encodeURIComponent(cursor)}`);setItems(p=>[...p,...data.items]);setCursor(data.cursor);}catch(e){setError(message(e));}finally{setLoading(false);}}
  return <><div className="picker-tools"><label className="search"><Search size={17}/><input aria-label="Search saved images" placeholder="Find an image…" value={search} onChange={e=>setSearch(e.target.value)}/></label><select aria-label="Image source" value={kind} onChange={e=>setKind(e.target.value)}><option value="">All images</option><option value="upload">Uploads</option><option value="generated">Creations</option></select><UploadButton multiple={!single} children="Upload a photo" onUpload={assets=>{if(assets[0])onPick(assets[0]);setItems(p=>[...assets,...p.filter(a=>!assets.some(n=>n.id===a.id))]);}} onError={onError}/></div><div className="picker-body">{error&&<p className="inline-error" role="alert">{error}</p>}{!items.length&&!loading?<Empty title="No saved photos yet">Upload a photo here or from the template flow on Create.</Empty>:<div className="asset-grid picker-grid">{items.map(asset=><AssetCard key={asset.id} asset={asset} selected={activeId===asset.id} onClick={()=>toggle(asset)}/>)}</div>}{loading&&<p role="status" className="loading-text">Loading your images…</p>}{cursor&&<button className="button secondary" disabled={loading} onClick={()=>void more()}>Load more images</button>}</div></>;
}

export function ReferencePicker({open,onClose,selected,onSelect,onError,max=8}: {open:boolean;onClose:()=>void;selected:Asset[];onSelect:(assets:Asset[])=>void;onError:(text:string)=>void;max?:number}) {
  const [items,setItems]=useState<Asset[]>([]); const [picks,setPicks]=useState<Asset[]>([]); const [search,setSearch]=useState(''); const [kind,setKind]=useState(''); const [cursor,setCursor]=useState<string|null>(null); const [loading,setLoading]=useState(false); const [error,setError]=useState('');
  useEffect(()=>{if(open)setPicks(selected);},[open,selected]);
  useEffect(()=>{ if(!open)return; let current=true; setLoading(true);setError('');const timer=setTimeout(()=>{api<{items:Asset[];cursor:string|null}>(`/api/assets?q=${encodeURIComponent(search)}&kind=${kind}`).then(data=>{if(current){setItems(data.items);setCursor(data.cursor);}}).catch(e=>{if(current)setError(message(e));}).finally(()=>{if(current)setLoading(false);});},200);return()=>{current=false;clearTimeout(timer);};},[open,search,kind]);
  function toggle(asset:Asset){setPicks(previous=>previous.some(a=>a.id===asset.id)?previous.filter(a=>a.id!==asset.id):previous.length<max?[...previous,asset]:previous);}
  async function more(){if(!cursor)return;setLoading(true);try{const data=await api<{items:Asset[];cursor:string|null}>(`/api/assets?q=${encodeURIComponent(search)}&kind=${kind}&cursor=${encodeURIComponent(cursor)}`);setItems(p=>[...p,...data.items]);setCursor(data.cursor);}catch(e){setError(message(e));}finally{setLoading(false);}}
  return <Modal open={open} onOpenChange={v=>{if(!v)onClose();}} title="Choose your references" description="Every image you upload or create is saved here. Use it as often as you like." wide><div className="picker-tools"><label className="search"><Search size={17}/><input aria-label="Search saved images" placeholder="Find an image…" value={search} onChange={e=>setSearch(e.target.value)}/></label><select aria-label="Reference source" value={kind} onChange={e=>setKind(e.target.value)}><option value="">All images</option><option value="upload">Uploads</option><option value="generated">Creations</option></select><UploadButton onUpload={assets=>{setItems(p=>[...assets,...p.filter(a=>!assets.some(n=>n.id===a.id))]);setPicks(p=>[...p,...assets.filter(a=>!p.some(n=>n.id===a.id))].slice(0,max));}} onError={setError}/></div><div className="picker-body">{error&&<p className="inline-error" role="alert">{error}</p>}{!items.length&&!loading?<Empty title="Your references start here">Upload an image once. It will be ready whenever inspiration comes around again.</Empty>:<div className="asset-grid picker-grid">{items.map(asset=><AssetCard key={asset.id} asset={asset} selected={picks.some(a=>a.id===asset.id)} onClick={()=>toggle(asset)}/>)}</div>}{loading&&<p role="status" className="loading-text">Loading your images…</p>}{cursor&&<button className="button secondary" disabled={loading} onClick={()=>void more()}>Load more images</button>}</div><div className="dialog-footer"><span>{picks.length} of {max} selected</span><button className="button primary" onClick={()=>{onSelect(picks);onClose();}}><Check size={17}/>Use selected images</button></div></Modal>;
}
export function ReferenceStrip({assets,onRemove,onChoose}: {assets:Asset[];onRemove:(id:string)=>void;onChoose:()=>void}) {
  return <div className="reference-strip">{assets.map(asset=><div className="reference-tile" key={asset.id}><Photo asset={asset} small/><button className="remove-reference" aria-label={`Remove ${asset.name} from this generation`} onClick={()=>onRemove(asset.id)}><X size={13}/></button></div>)}<button className="add-reference" onClick={onChoose} aria-label="Choose saved reference images"><Plus size={23}/><span>{assets.length?'Add':'Choose images'}</span></button></div>;
}
export function PageHeading({title,description,action}: {title:string;description:string;action?:ReactNode}) { return <header className="page-heading"><div><h1>{title}</h1><p>{description}</p></div>{action}</header>; }
export function TextLink({children,onClick}: {children:ReactNode;onClick:()=>void}) {return <button className="text-link" onClick={onClick}>{children}<ArrowUpRight size={16}/></button>;}
