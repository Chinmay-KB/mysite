const motion = matchMedia('(prefers-reduced-motion: reduce)');

document.querySelectorAll('[data-bubble]').forEach((bubble) => {
  bubble.addEventListener('click', () => {
    bubble.classList.add('is-popped');
    window.setTimeout(() => bubble.classList.remove('is-popped'), motion.matches ? 0 : 1400);
  });
});

const letters = [...document.querySelectorAll('.name-line > span')];
const helloNote = document.querySelector('.hello-note');
const orbit = document.querySelector('.stack-strip.is-orbit');
const wiggle = document.querySelector('.wiggle');
if (wiggle) {
  const dance = () => {
    if (helloNote) {
      const wght = 340 + Math.floor(Math.random() * 561);
      const opsz = 9 + Math.floor(Math.random() * 136);
      helloNote.style.fontVariationSettings = `'opsz' ${opsz},'wght' ${wght}`;
    }
    if (motion.matches) return;
    letters.forEach((letter, index) => {
      letter.animate([
        { transform: 'none' },
        { transform: `translateY(-${25 + (index % 3) * 12}px) rotate(${index % 2 ? 18 : -18}deg)` },
        { transform: 'translateY(5px) scale(1.1,.9)' },
        { transform: 'none' },
      ], { duration: 700, delay: index * 45, easing: 'cubic-bezier(.2,.8,.2,1)' });
    });
  };
  wiggle.addEventListener('click', dance);
  // Entrance: dance once shortly after load so the hero moves without waiting for a click.
  let entrancePlayed = false;
  const entrance = () => {
    if (entrancePlayed) return;
    entrancePlayed = true;
    dance();
  };
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => setTimeout(entrance, 450));
  } else if (document.readyState === 'complete') {
    setTimeout(entrance, 450);
  } else {
    window.addEventListener('load', () => setTimeout(entrance, 450), { once: true });
  }
}

const eyes = document.querySelector('.eyes');
if (eyes) {
  eyes.addEventListener('click', () => {
    if (orbit && !motion.matches) {
      orbit.classList.add('is-zoom');
      setTimeout(() => orbit.classList.remove('is-zoom'), 1200);
    }
    if (motion.matches) return;
    eyes.classList.add('is-blink');
    setTimeout(() => eyes.classList.remove('is-blink'), 180);
    eyes.animate(
      [{ transform: 'rotate(12deg)' }, { transform: 'rotate(-18deg)' }, { transform: 'rotate(12deg)' }],
      { duration: 450 },
    );
  });
  document.addEventListener('pointermove', (event) => {
    if (motion.matches || event.pointerType === 'touch') return;
    const box = eyes.getBoundingClientRect();
    const angle = Math.atan2(
      event.clientY - box.top - box.height / 2,
      event.clientX - box.left - box.width / 2,
    );
    eyes.querySelectorAll('i').forEach((pupil) => {
      pupil.style.transform = `translate(${Math.cos(angle) * 10}px,${Math.sin(angle) * 12}px)`;
    });
  }, { passive: true });
}

const strikeToy = document.querySelector('[data-strike-toy]');
if (strikeToy) {
  strikeToy.addEventListener('click', () => strikeToy.classList.toggle('is-pruned'));
}

const trimToy = document.querySelector('[data-trim-toy]');
if (trimToy) {
  trimToy.addEventListener('click', () => trimToy.classList.toggle('is-trimmed'));
}

const dreamToy = document.querySelector('[data-dream-toy]');
if (dreamToy) {
  dreamToy.addEventListener('click', () => {
    const on = dreamToy.classList.toggle('is-dreaming');
    dreamToy.setAttribute('aria-pressed', on ? 'true' : 'false');
    const timeEl = dreamToy.querySelector('[data-dream-time]');
    if (timeEl && on) {
      const now = new Date();
      timeEl.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    } else if (timeEl) {
      timeEl.textContent = '02:47';
    }
  });
}
