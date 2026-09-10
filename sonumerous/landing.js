const grid = document.getElementById('theme-grid');
const status = document.getElementById('theme-status');
const collage = document.querySelector('.landing-hero-collage');
const appPath = '/app/';
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

function coverImage(theme, { decorative = false } = {}) {
  const img = document.createElement('img');
  img.src = theme.coverUrl;
  img.alt = decorative ? '' : `${theme.name} cover`;
  img.loading = 'lazy';
  img.decoding = 'async';
  img.addEventListener('error', () => {
    img.replaceWith(placeholderFor(theme.name));
  }, { once: true });
  return img;
}

function renderCollage(themes) {
  if (!collage) return;
  const frames = themes.slice(0, 3);
  collage.replaceChildren();
  collage.classList.toggle('has-covers', frames.length > 0);
  frames.forEach((theme, index) => {
    const frame = document.createElement('figure');
    frame.className = `hero-collage-frame hero-collage-frame-${index + 1}`;
    if (theme.coverUrl) {
      frame.appendChild(coverImage(theme, { decorative: true }));
    } else {
      frame.appendChild(placeholderFor(theme.name));
    }
    collage.appendChild(frame);
  });
}

function observeCards(cards) {
  if (reduceMotion || cards.length === 0) return;
  const observer = new IntersectionObserver((entries, current) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const card = entry.target;
      const stagger = Number(card.style.getPropertyValue('--stagger')) || 0;
      card.classList.add('is-visible');
      window.setTimeout(() => card.classList.add('is-risen'), stagger * 60 + 560);
      current.unobserve(card);
    }
  }, { threshold: 0, rootMargin: '120px 0px 40% 0px' });

  for (const card of cards) observer.observe(card);
}

function themeCard(theme) {
  const card = document.createElement('a');
  card.href = appPath;
  card.className = 'theme-card';
  card.setAttribute('role', 'listitem');
  card.setAttribute('aria-label', `Start with ${theme.name}`);

  const art = document.createElement('div');
  art.className = 'theme-card-art';
  if (theme.coverUrl) {
    art.appendChild(coverImage(theme));
  } else {
    art.appendChild(placeholderFor(theme.name));
  }

  const name = document.createElement('span');
  name.className = 'theme-card-name';
  name.textContent = theme.name;

  card.append(art, name);
  card.addEventListener('click', () => rememberTheme(theme.slug));
  return card;
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
    renderCollage(themes);
    const cards = themes.map(themeCard);
    if (!reduceMotion) {
      cards.forEach((card, index) => {
        card.style.setProperty('--stagger', String(index));
        card.classList.add('will-rise');
      });
    }
    grid.replaceChildren(...cards);
    observeCards(cards);
    status.hidden = true;
  } catch {
    renderCollage([]);
    status.hidden = false;
    status.textContent = 'Templates will appear when the studio is ready.';
  }
}

void loadThemes();
