import { FEELS } from '@/lib/feel';
import type { Feel } from '@/lib/feel';

// The mouth of each face, from a frown to a big smile (board 10).
const MOUTH: Record<Feel, string> = {
  rough: 'M15 27 Q20 21 25 27',
  tough: 'M15 26 Q20 23 25 26',
  ok: 'M15 25 L25 25',
  good: 'M15 24 Q20 28 25 24',
  great: 'M14 23 Q20 31 26 23',
};

/**
 * One of the five faces: a coloured circle, two eyes and a mouth. Drawn as SVG, no
 * emoji. Decorative by default (a button around it names it). Pass `label` ("Felt good")
 * when the face stands alone, such as in a workout card.
 */
export function FeelFace({ feel, size = 40, label }: { feel: Feel; size?: number; label?: string }) {
  const colour = FEELS.find((f) => f.key === feel)?.colour ?? 'var(--feel-ok)';
  return (
    <svg
      className="wt-face"
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <circle className="wt-face-bg" cx="20" cy="20" r="18" style={{ fill: colour }} />
      <circle className="wt-face-ink" cx="14" cy="16" r="2.4" />
      <circle className="wt-face-ink" cx="26" cy="16" r="2.4" />
      <path className="wt-face-mouth" d={MOUTH[feel]} />
    </svg>
  );
}
