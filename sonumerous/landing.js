const grid = document.getElementById('theme-grid');
const status = document.getElementById('theme-status');
const appPath = '/app/';

function rememberTheme(slug) {
  try {
    sessionStorage.setItem('sonumerous-open-theme-slug', slug);
  } catch {
    /* Storage is optional; the studio still opens without it. */
  }
}

function placeholderFor(name) {
  const placeholder = document.createElement('span');
  placeholder.className = 'theme-card-placeholder';
  placeholder.textContent = name.slice(0, 2);
  return placeholder;
}

async function loadThemes() {
  if (!grid || !status) return;
  status.hidden = false;
  status.textContent = 'Loading templates…';
  try {
    const response = await fetch('/public/themes', { credentials: 'same-origin' });
    if (!response.ok) throw new Error('Could not load templates.');
    const themes = await response.json();
    if (!Array.isArray(themes)) throw new Error('Could not load templates.');
    grid.replaceChildren();
    for (const theme of themes) {
      const card = document.createElement('a');
      card.href = appPath;
      card.className = 'theme-card';
      card.setAttribute('aria-label', `Start with ${theme.name}`);

      const art = document.createElement('div');
      art.className = 'theme-card-art';
      if (theme.coverUrl) {
        const img = document.createElement('img');
        img.src = theme.coverUrl;
        img.alt = `${theme.name} cover`;
        img.loading = 'lazy';
        img.decoding = 'async';
        img.addEventListener('error', () => {
          img.replaceWith(placeholderFor(theme.name));
        }, { once: true });
        art.appendChild(img);
      } else {
        art.appendChild(placeholderFor(theme.name));
      }

      const name = document.createElement('span');
      name.className = 'theme-card-name';
      name.textContent = theme.name;

      card.append(art, name);
      card.addEventListener('click', () => rememberTheme(theme.slug));
      grid.appendChild(card);
    }
    status.hidden = true;
  } catch {
    status.hidden = false;
    status.textContent = 'Templates will appear when the studio is ready.';
  }
}

void loadThemes();
