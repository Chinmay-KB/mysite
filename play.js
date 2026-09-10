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
  let bubbleCanvas;
  let bubbleContext;
  let bubbles = [];
  let bubbleFrame;

  const resizeBubbleCanvas = () => {
    if (!bubbleCanvas) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    bubbleCanvas.width = window.innerWidth * ratio;
    bubbleCanvas.height = window.innerHeight * ratio;
    bubbleCanvas.style.width = `${window.innerWidth}px`;
    bubbleCanvas.style.height = `${window.innerHeight}px`;
    bubbleContext.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  const startBubbles = () => {
    if (motion.matches) return;
    if (!bubbleCanvas) {
      bubbleCanvas = document.createElement('canvas');
      bubbleCanvas.className = 'bubble-screensaver';
      bubbleCanvas.setAttribute('aria-hidden', 'true');
      document.body.append(bubbleCanvas);
      bubbleContext = bubbleCanvas.getContext('2d');
      resizeBubbleCanvas();
      window.addEventListener('resize', resizeBubbleCanvas, { passive: true });
    }

    const origin = dreamToy.getBoundingClientRect();
    const colors = ['#4252ad', '#df461f', '#e3e86a', '#d978a7', '#59a6a1', '#f3a441'];
    for (let i = 0; i < 34; i += 1) {
      const radius = 9 + Math.random() * 24;
      bubbles.push({
        x: origin.left + Math.random() * origin.width,
        y: origin.top + Math.random() * origin.height,
        radius,
        vx: (Math.random() - 0.5) * 1.8,
        vy: -(0.8 + Math.random() * 2.4),
        color: colors[i % colors.length],
        alpha: 0.42 + Math.random() * 0.3,
      });
    }

    if (!bubbleFrame) {
      let previous = performance.now();
      const animate = (now) => {
        const delta = Math.min((now - previous) / 16.67, 2);
        previous = now;
        bubbleContext.clearRect(0, 0, window.innerWidth, window.innerHeight);
        bubbles.forEach((bubble) => {
          bubble.x += bubble.vx * delta;
          bubble.y += bubble.vy * delta;
          bubble.vy -= 0.006 * delta;
          bubble.vx *= 0.999;

          if (bubble.x - bubble.radius < 0 || bubble.x + bubble.radius > window.innerWidth) {
            bubble.vx *= -1;
            bubble.x = Math.max(bubble.radius, Math.min(window.innerWidth - bubble.radius, bubble.x));
          }
        });

        for (let i = 0; i < bubbles.length; i += 1) {
          for (let j = i + 1; j < bubbles.length; j += 1) {
            const first = bubbles[i];
            const second = bubbles[j];
            const dx = second.x - first.x;
            const dy = second.y - first.y;
            const distance = Math.hypot(dx, dy);
            const minimum = first.radius + second.radius;
            if (distance === 0 || distance >= minimum) continue;
            const nx = dx / distance;
            const ny = dy / distance;
            const overlap = (minimum - distance) / 2;
            first.x -= nx * overlap;
            first.y -= ny * overlap;
            second.x += nx * overlap;
            second.y += ny * overlap;
            const relativeVelocity = (second.vx - first.vx) * nx + (second.vy - first.vy) * ny;
            if (relativeVelocity > 0) continue;
            first.vx += relativeVelocity * nx;
            first.vy += relativeVelocity * ny;
            second.vx -= relativeVelocity * nx;
            second.vy -= relativeVelocity * ny;
          }
        }

        bubbles = bubbles.filter((bubble) => bubble.y + bubble.radius > -20);
        bubbles.forEach((bubble) => {
          bubbleContext.beginPath();
          bubbleContext.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
          bubbleContext.fillStyle = bubble.color;
          bubbleContext.globalAlpha = bubble.alpha;
          bubbleContext.fill();
          bubbleContext.beginPath();
          bubbleContext.arc(bubble.x - bubble.radius * 0.3, bubble.y - bubble.radius * 0.3, bubble.radius * 0.16, 0, Math.PI * 2);
          bubbleContext.fillStyle = '#fffefa';
          bubbleContext.globalAlpha = 0.75;
          bubbleContext.fill();
        });
        bubbleContext.globalAlpha = 1;
        if (bubbles.length) bubbleFrame = requestAnimationFrame(animate);
        else bubbleFrame = undefined;
      };
      bubbleFrame = requestAnimationFrame(animate);
    }
  };

  dreamToy.addEventListener('click', () => {
    const on = dreamToy.classList.toggle('is-dreaming');
    dreamToy.setAttribute('aria-pressed', on ? 'true' : 'false');
    startBubbles();
    const timeEl = dreamToy.querySelector('[data-dream-time]');
    if (timeEl && on) {
      const now = new Date();
      timeEl.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    } else if (timeEl) {
      timeEl.textContent = '02:47';
    }
  });
}
