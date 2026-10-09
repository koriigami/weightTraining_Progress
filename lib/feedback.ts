// The app's sound and haptic calls. The engine, the sound table and the device
// prefs ('wt:prefs') live in lib/sound.ts; this file keeps the older, moment-sized
// calls that components already use and plays them with the signed-off sounds.
// Stages 3 and 5 move callers to play(slot) directly.
//
// Old call -> new sound:
//   tick()      -> the set tick (SYN.set) and a light buzz
//   dayCleared()-> slot 'done' and a success buzz
//   levelUp()   -> music 'level' and a reward buzz
//   rankUp()    -> slot 'shatter', music 'rank' and a reward buzz
//   whoosh()    -> slot 'whoosh'
//   chest()     -> 'crack' x4, 'burst', 'reveal' on the old beats, with the old buzz pattern
//   badgeReveal -> slot 'sparkle' and a success buzz

import { buzz, duck, getPrefs, music, play, setMusicEnabled, setSoundEnabled, setVibrateEnabled, SYN, unlock } from './sound';
import type { Prefs } from './sound';

export { getPrefs, setMusicEnabled, setSoundEnabled, setVibrateEnabled };
export type { Prefs };

// Prime audio on a user gesture, so later celebrations (which may be triggered
// on load, without a fresh gesture) can still play once the context is running.
export function warm() {
  unlock();
}

export function tick() {
  buzz('light');
  SYN.set(0);
}

export function dayCleared() {
  buzz('success');
  play('done');
}

export function levelUp() {
  buzz('reward');
  music('level');
}

export function rankUp() {
  buzz('reward');
  play('shatter');
  duck(900);
  music('rank');
}

export function whoosh() {
  play('whoosh');
}

// The badge chest: four knocks, the lid bursts, then the badge appears. The
// buzz follows the same beats, so a phone knocks four times and pops once.
export function chest() {
  try {
    if (getPrefs().vibrate && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([14, 146, 14, 146, 14, 146, 14, 156, 40, 210, 24]);
    }
  } catch {
    // ignore
  }
  [0, 160, 320, 480].forEach((ms) => setTimeout(() => play('crack'), ms));
  setTimeout(() => play('burst'), 650);
  setTimeout(() => play('reveal'), 900);
}

export function badgeReveal() {
  buzz('success');
  play('sparkle');
}
