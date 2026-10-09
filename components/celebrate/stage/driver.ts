// What the reward stage asks of whatever draws the chest and the medals. The 3D
// stage (components/art3d/stage3d) and the flat one (./flat) both do this, so the
// sequence in ./run is written once. Points are in stage pixels (390 by 780).
import type { ChestKey, MedalModel } from '@/lib/badgeModel';
import type { Pt } from './fx';

export type MedalHooks = { onRise?: () => void; onFlip?: () => void };

export interface ArtDriver {
  /** Puts a new chest on the stage, out of sight until `rest` or `drop`. */
  setChest(key: ChestKey): void;
  /** Shows the chest standing still, as it is after a replay is set up. */
  rest(): void;
  /** Falls from above; `onLand` fires on impact. */
  drop(onLand?: () => void): Promise<void>;
  /** A tap: the latch cracks and the chest jolts. `i` of `n` taps. */
  tap(i: number, n: number): Promise<void>;
  /** The charge before a three-tap chest bursts. */
  charge(ms: number): Promise<void>;
  /** The lid opens and light pours out. */
  burst(): Promise<void>;
  /** The open chest moves to the lower third and stays whole. */
  settle(): Promise<void>;
  /** A point on the chest, `y` up its height from the base (0 to 1 or more). */
  chestPoint(y?: number): Pt;
  /** The chest's top right corner, where the counter sits. */
  chestCorner(): Pt;
  /** Where a medal hangs once it has risen. */
  medalPoint(): Pt;
  /** The medal on screen, so the page can take over from it. Null when there is none or it is drawn by the page. */
  medalBox(): { x: number; y: number; size: number } | null;
  /**
   * A medal rises out of the chest on a curve, spins, pauses backlit and flips to
   * its face. Absent when the page draws the medal itself (see `medalMarkup`).
   */
  medalOut?(model: MedalModel, hooks: MedalHooks): Promise<void>;
  /** The medal as a picture for the tray: a data URL, or SVG markup for the flat stage. */
  medalImage(model: MedalModel): string;
  /** The page's own markup for a medal (the flat stage). */
  medalMarkup?(model: MedalModel): string;
  /** The 3D medal steps aside; the page flies its picture to the tray. */
  removeMedal(): void;
  /** The chest sinks out of view. */
  hideChest(): Promise<void>;
  /** Hides everything, for the rank-up moment. */
  hideAll(): void;
  /** The stage is shown at this scale on a screen with this pixel ratio. */
  resize(k: number): void;
  dispose(): void;
}
