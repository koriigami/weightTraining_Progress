import type { Config } from 'tailwindcss';

// Colors read the CSS variables in app/globals.css (Arena Bright, Deep Sky).
const config: Config = {
  // Light theme only. The dark: variants some older components still carry
  // never apply, because nothing ever sets this selector.
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        app: 'var(--bg-solid)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        calm: 'var(--calm)',
        cell: 'var(--cell)',
        line: 'var(--line)',
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        link: 'var(--link)',
        p1: 'var(--p1)',
        p2: 'var(--p2)',
        'p-bevel': 'var(--p-bevel)',
        's-line': 'var(--s-line)',
        's-face': 'var(--s-face)',
        's-bevel': 'var(--s-bevel)',
        's-ink': 'var(--s-ink)',
        xp: 'var(--xp)',
        'xp-hi': 'var(--xp-hi)',
        'xp-deep': 'var(--xp-deep)',
        ok: 'var(--ok)',
        'ok-deep': 'var(--ok-deep)',
        'ok-soft': 'var(--ok-soft)',
        bad: 'var(--bad)',
        'bad-ink': 'var(--bad-ink)',
        stroke: 'var(--stroke)',
        hi: 'var(--hi)',
        sec: 'var(--sec)',
        muscle: 'var(--muscle)',
        skin: 'var(--skin)',
        'hero-stroke': 'var(--hero-stroke)',
        'nav-ink': 'var(--nav-ink)',
        accent: 'var(--accent)',
      },
      backgroundImage: {
        hero: 'var(--hero)',
        'chip-on': 'var(--chip-on)',
        secondary: 'var(--s-grad)',
        'nav-wood': 'var(--nav-bg)',
      },
      boxShadow: {
        card: 'var(--card-shadow)',
        hero: 'var(--hero-shadow)',
      },
      fontFamily: {
        sans: ['var(--font-ui)'],
        display: ['var(--font-num)'],
      },
      transitionDuration: {
        80: '80ms',
      },
    },
  },
  plugins: [],
};

export default config;
