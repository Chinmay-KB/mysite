export interface Asset {
  id: string; name: string; kind: 'upload' | 'generated' | 'annotation'; mime: string;
  width: number; height: number; favourite: number; generation_id: string | null; created_at: string;
}
export interface Theme {
  id: string; name: string; description: string; prompt: string; avoid: string; updated_at: string;
  cover_asset_id: string | null; scope?: 'user' | 'global'; hidden?: number; default_aspect?: string; cover?: Asset | null;
}
export interface Preference { id: string; text: string; theme_id: string | null }
export interface Model { id: string; name: string; description: string; ratios: string[]; maxReferences: number }
export interface Region { x: number; y: number; width: number; height: number }
export interface GenerationInput {
  prompt: string; model: string; aspectRatio: string; referenceIds: string[]; themeId: string | null;
  themePrompt: string; avoid: string; parentAssetId: string | null; preserve: string;
  annotationAssetId: string | null; region: Region | null; usePreferences: boolean; requestKey: string;
}
export interface Generation {
  id: string; root_id: string; parent_asset_id: string | null; theme_id?: string | null; model: string; prompt: string;
  purpose?: 'user' | 'theme_cover';
  status: 'queued' | 'generating' | 'saving' | 'ready' | 'failed'; error: string | null;
  output_asset_id: string | null; created_at: string; snapshot: string;
}
export interface Detail { asset: Asset; generation: Generation | null; versions: (Generation & { asset: Asset | null })[]; feedback: string | null; parentAsset: Asset | null }
export interface Session { authenticated: boolean; email?: string; generationReady?: boolean; loginUrl?: string; local?: boolean }
