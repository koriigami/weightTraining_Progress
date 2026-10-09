'use client';

import { useRef } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { Check, Lock } from 'lucide-react';
import { BadgeImage } from '@/components/art3d/BadgeImage';
import { RankShield } from '@/components/RankShield';
import { GameModal } from '@/components/ui/GameModal';
import { XpBar } from '@/components/ui/XpBar';
import { cn } from '@/components/ui/cn';
import { Badge } from '@/components/Badge';
import { badgeFacts, tierLabel } from '@/lib/badgeCards';
import type { BadgeCard } from '@/lib/badgeCards';
import type { EarnedBadgeSummary } from '@/lib/badges';
import { gatePreview } from '@/lib/rankRoad';
import type { GateRow } from '@/lib/rankRoad';
import { earnedBadgeArt } from '@/lib/rewardStage';

/** What the badge view shows: a badge (earned, or a locked card) or a locked rank gate. */
export type BadgeViewData = { kind: 'badge'; card: BadgeCard; earned: EarnedBadgeSummary | null } | { kind: 'gate'; row: GateRow };

const MAX_TILT = 16;

/**
 * The medal tilts up to 16 degrees toward the finger (perspective 600 px) and a
 * glare follows it, lit only where the picture is. It springs back when you let go.
 * With reduced motion it stays flat.
 */
function TiltMedal({ children }: { children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const glare = useRef<HTMLElement>(null);

  function move(e: ReactPointerEvent<HTMLDivElement>) {
    const el = box.current;
    const g = glare.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    const clamp = (v: number) => Math.max(-MAX_TILT, Math.min(MAX_TILT, v));
    el.classList.remove('rest');
    el.style.transform = `perspective(600px) rotateX(${clamp(-y * 32)}deg) rotateY(${clamp(x * 32)}deg)`;
    if (g) {
      // Light only the medal, not the square around it: the picture is the mask. No picture (no WebGL) means no glare.
      const src = el.querySelector('img')?.getAttribute('src');
      if (src) {
        g.style.maskImage = g.style.webkitMaskImage = `url(${src})`;
        g.style.background = `radial-gradient(circle at ${(x + 0.5) * 100}% ${(y + 0.5) * 100}%, rgba(255,255,255,.6), rgba(255,255,255,0) 45%)`;
      }
    }
  }
  function leave() {
    const el = box.current;
    if (!el) return;
    el.classList.add('rest');
    el.style.transform = '';
    if (glare.current) glare.current.style.background = '';
  }

  return (
    <div ref={box} className="wt-tilt rest" onPointerMove={move} onPointerLeave={leave} onPointerUp={leave} onPointerCancel={leave}>
      {children}
      <i ref={glare} className="wt-glare" aria-hidden="true" />
    </div>
  );
}

function Fact({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="wt-bv-fact">
      <small>{k}</small>
      <b>{children}</b>
    </div>
  );
}

/**
 * The badge view: the medal large and tiltable with its tier, name, the date
 * earned, what it measures and how far the next tier is. A badge you do not have
 * shows the stone medal in its progress ring and what it takes. A locked rank
 * shows the shield in stone and "Reach level N".
 */
export function BadgeView({ view, onClose, onReplay }: { view: BadgeViewData | null; onClose: () => void; onReplay: (b: EarnedBadgeSummary) => void }) {
  let title = '';
  let art: ReactNode;
  let ribbon: ReactNode;
  let body: ReactNode;
  let extra: ReactNode;
  let replay: EarnedBadgeSummary | null = null;

  if (view?.kind === 'badge') {
    const { card, earned } = view;
    const f = badgeFacts(card, earned);
    const have = earned !== null;
    title = card.name;
    replay = earned;
    art = have ? (
      <TiltMedal>
        <BadgeImage art={earnedBadgeArt(earned)} size={180} />
      </TiltMedal>
    ) : (
      <div className="wt-bv-ring">
        <svg viewBox="0 0 220 220" aria-hidden="true">
          <circle cx="110" cy="110" r="102" className="trk" />
          <circle cx="110" cy="110" r="102" className="val" pathLength={100} strokeDasharray={`${Math.max(0, Math.min(100, f.pct))} 100`} />
        </svg>
        <TiltMedal>
          <BadgeImage art={card.art} size={150} locked />
        </TiltMedal>
      </div>
    );
    ribbon = (
      <span className={cn('wt-lock-rib', have && 'open')}>
        {have ? <Check size={14} aria-hidden="true" /> : <Lock size={14} aria-hidden="true" />}
        {f.tier}
      </span>
    );
    body = have ? f.earnedLine : card.hint;
    extra = (
      <div className="wt-bv-facts">
        {have && <Fact k="What it measures">{f.what}</Fact>}
        <Fact k={have ? 'Next' : 'Progress'}>{f.progress}</Fact>
        <XpBar thin value={f.pct} label={`${card.name}: ${f.progress}`} />
        {card.ladder.length > 0 && <Ladder ladder={card.ladder} />}
      </div>
    );
  } else if (view?.kind === 'gate') {
    const p = gatePreview(view.row);
    title = p.title;
    art = (
      <div className="wt-bv-stone">
        <TiltMedal>
          <RankShield rank={view.row.rank} size={130} />
        </TiltMedal>
        <span className="wt-lkm" aria-hidden="true">
          <Lock size={14} />
        </span>
      </div>
    );
    ribbon = (
      <span className="wt-lock-rib">
        <Lock size={14} aria-hidden="true" />
        Reach level {view.row.level}
      </span>
    );
    body = p.body;
  }

  return (
    <GameModal
      open={view !== null}
      title={title}
      art={art}
      badge={ribbon}
      extra={extra}
      className="wt-bv"
      cancelLabel={replay ? 'Close' : 'Got it'}
      onCancel={onClose}
      confirmLabel="Watch it unlock"
      onConfirm={
        view?.kind === 'badge' && view.earned
          ? () => {
              const b = view.earned;
              onClose();
              if (b) onReplay(b);
            }
          : undefined
      }
    >
      {body}
    </GameModal>
  );
}

function Ladder({ ladder }: { ladder: BadgeCard['ladder'] }) {
  return (
    <ol className="wt-ladder" aria-label="Tiers">
      {ladder.map((l) => (
        <li key={l.tier} aria-label={`${tierLabel(l.tier)}, ${l.threshold.toLocaleString('en-US')}, ${l.earned ? 'earned' : 'not yet'}`}>
          <Badge shape="circle" tier={l.tier} text={l.tier[0].toUpperCase()} locked={!l.earned} size={34} label="" />
          <span aria-hidden="true">{l.threshold.toLocaleString('en-US')}</span>
        </li>
      ))}
    </ol>
  );
}
