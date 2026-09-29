import confetti from 'canvas-confetti';

const COLORS = ['#FFD24A', '#FFF3B0', '#7CC0FF', '#FF6B8A', '#5EE0A3'];

// Two cannons from the bottom corners.
export function celebrationBurst() {
  const opts = { particleCount: 70, spread: 62, startVelocity: 52, ticks: 220, zIndex: 1100, colors: COLORS, disableForReducedMotion: true };
  confetti({ ...opts, angle: 60, origin: { x: 0, y: 0.95 } });
  confetti({ ...opts, angle: 120, origin: { x: 1, y: 0.95 } });
}

// A short pop from the middle, for the moments that already have rays and sparks:
// it lands with the shield or the medal and is gone in about a second.
export function momentBurst() {
  confetti({
    particleCount: 46,
    spread: 80,
    startVelocity: 34,
    ticks: 110,
    gravity: 1.1,
    scalar: 0.9,
    zIndex: 1100,
    colors: COLORS,
    origin: { x: 0.5, y: 0.42 },
    disableForReducedMotion: true,
  });
}

// A small burst centered on a card, used when a day is cleared.
export function cardBurst(rect: { left: number; top: number; width: number }) {
  confetti({
    particleCount: 40,
    spread: 70,
    startVelocity: 28,
    zIndex: 900,
    colors: COLORS,
    disableForReducedMotion: true,
    origin: { x: (rect.left + rect.width / 2) / window.innerWidth, y: (rect.top + 60) / window.innerHeight },
  });
}
