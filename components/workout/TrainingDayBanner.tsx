'use client';

import { useEffect, useRef } from 'react';
import { anim, springTo } from '@/lib/anim';
import { coinShower } from '@/lib/fx';
import { DUR, EASE, SPRINGS } from '@/lib/motion';
import { WORKOUT_XP } from '@/lib/routines';
import { SYN, buzz, play } from '@/lib/sound';

const SHOW_MS = 2200;

/**
 * The workout passed 20 minutes today: a banner drops from the top with a bounce
 * while coins rain down and bounce once. It leaves after 2 s, and shows once a day
 * (the daily bonus is paid once). Quieter coins; board 12 marks it "may change later".
 */
export function TrainingDayBanner({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    void springTo(ref.current, -80, 0, (v) => `translateY(${v}px)`, SPRINGS.bouncy);
    coinShower(26);
    play('coins');
    const second = setTimeout(() => SYN.coin(1.2), 300);
    buzz('success');
    const leave = setTimeout(() => void anim(ref.current, [{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(-30px)', opacity: 0 }], { duration: DUR.base - 20, easing: EASE.in, fill: 'forwards' }), SHOW_MS);
    const end = setTimeout(() => done.current(), SHOW_MS + 260);
    return () => {
      clearTimeout(second);
      clearTimeout(leave);
      clearTimeout(end);
    };
  }, []);

  return (
    <div className="wt-dayban-wrap">
      <div ref={ref} className="wt-dayban" role="status">
        Training day! <b>+{WORKOUT_XP.daily} XP</b>
      </div>
    </div>
  );
}
