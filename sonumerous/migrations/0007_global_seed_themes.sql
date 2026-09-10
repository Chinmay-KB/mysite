-- Move starter themes into shared rows while preserving existing user copies.
ALTER TABLE themes ADD COLUMN scope TEXT NOT NULL DEFAULT 'user';

PRAGMA foreign_keys = OFF;

CREATE TABLE themes_global (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  scope TEXT NOT NULL DEFAULT 'user' CHECK(scope IN ('user', 'global')),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  prompt TEXT NOT NULL,
  avoid TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  cover_asset_id TEXT REFERENCES assets(id),
  hidden INTEGER NOT NULL DEFAULT 0,
  default_aspect TEXT NOT NULL DEFAULT '1:1'
);

INSERT INTO themes_global (
  id, user_id, scope, name, description, prompt, avoid, updated_at,
  cover_asset_id, hidden, default_aspect
)
SELECT
  id, user_id, scope, name, description, prompt, avoid, updated_at,
  cover_asset_id, hidden, default_aspect
FROM themes;

DROP TABLE themes;
ALTER TABLE themes_global RENAME TO themes;
CREATE INDEX themes_owner ON themes(user_id);
CREATE INDEX themes_scope ON themes(scope, hidden);
CREATE UNIQUE INDEX generations_global_theme_cover_once
  ON generations(theme_id)
  WHERE purpose='theme_cover' AND theme_id LIKE 'theme:%';

INSERT OR IGNORE INTO themes (
  id, user_id, scope, name, description, prompt, avoid, hidden, default_aspect
) VALUES
(
  'theme:eighties', NULL, 'global', 'An ’80s kind of day',
  'Warm analog tones, soft flash, and retro studio charm.',
  'Reimagine this image as a realistic portrait from an Indian film of the 80s. Use the recognisable facial features, natural skin tone, period-appropriate voluminous hair, retro-modern 80s clothing by default (high-waist denim, puff-sleeved tops, blazers, chic dresses, statement accessories — elegant, not costume-y; saree only if the photo already features one), warm studio lighting, subtle analogue film grain and slightly faded colours while maintaining the image''s photorealism and natural and elegant appearance – make it look like a real photo taken in India in the 80s, not a modern photo with a vintage filter.',
  'Modern objects, smartphones, contemporary hairstyles, text, watermarks, logos, or distorted facial features. Keep the EXACT body shape, shoulder width, torso and posture of the original photo. No broadening shoulders, no widening the trunk, no bodybuilder proportions — the body must look naturally proportional, never absurd.',
  0, '1:1'
),
(
  'theme:studio', NULL, 'global', 'Studio Portrait',
  'Editorial head-and-shoulders on pure black, natural skin, and crisp studio light.',
  'Use the attached image as the exact facial reference. Create a hyperrealistic professional studio editorial portrait that preserves the person''s facial identity, proportions, expression, and natural features. Portrait style: contemporary high-end photography. Framing: medium head-and-shoulders shot, 4:5 aspect ratio. Pose: direct gaze into camera, neutral expression. Background: pure uniform black, no texture, no visible environment. Lighting: soft studio lighting with a side key light and gentle fill. Add subtle side chiaroscuro for depth and separation from the black background. Skin: natural, realistic skin texture with fine detail. Eyes: very sharp focus, crisp catchlights, high detail. Lens look: 85mm portrait lens, shallow depth of field. Color: neutral color correction, natural tones. Output: high-resolution, clean editorial portrait.',
  'No caricature. No painting or illustration style. No fake skin. No facial distortion. No exaggerated smile. No glossy or artificial skin. No visible background elements. No texture in the background. No overprocessed retouching',
  0, '4:5'
),
(
  'theme:scribbles', NULL, 'global', 'Handwritten Scribbles',
  'White-pen doodles and sweet diary notes layered over your photo.',
  'Add a hand drawn overlay on top of the image. Final output should be stylish, relaxed and effortlessly casual. Drawing rules: Use thin, hand-drawn lines as if drawn with a white pen. Keep it in a single-stroke style: rough and slightly uneven. Add outlines tracing around the outer edges of objects. Use arrows or dotted lines to guide the viewer''s eye. Text rules: Handwritten text. Keep it short, like a casual inner monologue. Tone: diary-like, brief, and emotion-focused. Commentary should be positive and sweet. Decorations: Add steam, sparkles, hearts, small emoticon-like faces sparingly. Avoid overdoing it; leave some negative space.',
  'Heavy filters, unreadable text blocks, cluttered overlays, or changing the underlying photo.',
  0, '1:1'
),
(
  'theme:fix-lighting', NULL, 'global', 'Fix Lighting',
  'Soft, even light on your face—pose, background, and scene stay the same.',
  'Improve the lighting while keeping everything else exactly the same. Do not change the person, pose, expression, background, or composition. Fix issues like back lighting, harsh shadows, underexposure or uneven lighting. Transform the original lighting into soft, natural, flattering light coming from slightly above eye level and facing the subject, so the face is evenly lit with realistic skin tones. Keep the result photorealistic and consistent with the original scene.',
  'Pose changes, background swaps, beauty retouching, or altered composition.',
  0, '1:1'
),
(
  'theme:wanderlust', NULL, 'global', 'Wanderlust',
  'Travel collage with instant photos, a handwritten postcard, and memento details.',
  'Use this image to create a travel collage by placing the main subject of the original image in a travel destination location with location appropriate styling as an instant photo with instant photo style lighting, color and quality. Include a postcard from a random less traveled destination in blue ink pen inspiring me to travel to new places. It should feel intimate, personal, and cleanly curated. Add souvenirs and small details that create a sense of a memento in a balanced layout with natural lighting.',
  'Cluttered layouts, illegible postcard text, or generic stock-travel clichés without a personal feel.',
  0, '1:1'
);

PRAGMA foreign_keys = ON;
