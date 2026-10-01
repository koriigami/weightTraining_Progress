// Wording and option lists for the preferences editors, shared by Settings and
// onboarding. Pure.
import { AVOID_TAGS, JOINTS } from '../data/exercises';
import type { AvoidTag, Joint } from '../data/exercises';
import { fmtNumber, kgToUnit, unitToKg } from './units';
import type { WeightUnit } from './units';
import type { Prefs } from './routines';

/** What a "home" setup can tick. Ids are the library's equipment ids. */
export const HOME_EQUIPMENT: { id: string; label: string }[] = [
  { id: 'dumbbell', label: 'Dumbbells' },
  { id: 'barbell', label: 'Barbell' },
  { id: 'kettlebell', label: 'Kettlebell' },
  { id: 'band', label: 'Bands' },
  { id: 'pullup-bar', label: 'Pull-up bar' },
  { id: 'bench', label: 'Bench' },
  { id: 'cardio-machine', label: 'Cardio machine' },
  { id: 'bicycle', label: 'Bicycle' },
];

/** Dumbbell weights offered as chips, in the unit the person uses. */
export const DUMBBELL_CHIPS: Record<WeightUnit, number[]> = {
  kg: [1, 2, 3, 4, 5, 7.5, 10, 12.5, 15, 20],
  lb: [2.5, 5, 7.5, 10, 12.5, 15, 20, 25, 30, 40, 50],
};

/** The "anything to avoid" chips, and the joints to go easy on. */
export const AVOID_CHIPS: AvoidTag[] = ['lunges', 'burpees', 'jumping', 'deadlifts', 'overhead'];
export const LIMIT_CHIPS: Joint[] = ['knees', 'shoulders', 'lower-back'];

export const weightUnitName = (u: Prefs['units']['weight']): string => (u === 'lb' ? 'Lbs' : 'Kg');
export const distanceUnitName = (u: Prefs['units']['distance']): string => (u === 'mi' ? 'Miles' : 'Km');

export function unitsSummary(units: Prefs['units']): string {
  return `${weightUnitName(units.weight)} · ${distanceUnitName(units.distance)}`;
}

/** Dumbbell weights as the person reads them: "2, 3, 5, 10 kg". Stored kg values come back in their unit. */
export function dumbbellList(kg: readonly number[], unit: WeightUnit): string {
  const nums = [...kg].map((k) => kgToUnit(k, unit)).sort((a, b) => a - b);
  return `${nums.map(fmtNumber).join(', ')} ${unit}`;
}

export function equipmentSummary(prefs: Pick<Prefs, 'equipment' | 'units'>): string {
  const { kind, has, dumbbellKg } = prefs.equipment;
  if (kind === 'gym') return 'Full gym';
  if (kind === 'none') return 'No equipment';
  const names = HOME_EQUIPMENT.filter((e) => has.includes(e.id)).map((e) => e.label);
  if (names.length === 0) return 'Home, no equipment picked';
  const list = names.join(', ');
  return has.includes('dumbbell') && dumbbellKg.length > 0 ? `${list} (${dumbbellList(dumbbellKg, prefs.units.weight)})` : list;
}

export function avoidSummary(prefs: Pick<Prefs, 'avoid' | 'limits'>): string {
  const names = [
    ...prefs.avoid.map((a) => AVOID_TAGS[a as AvoidTag]).filter(Boolean),
    ...prefs.limits.map((j) => JOINTS[j as Joint]).filter(Boolean),
  ];
  return names.length ? names.join(', ') : 'None';
}

export function weeklyGoalSummary(n: number): string {
  return `${n} training ${n === 1 ? 'day' : 'days'} a week`;
}

/** The chips to show: the standard list for the unit, plus any saved weight that is not on it, in order. */
export function dumbbellChoices(unit: WeightUnit, savedKg: readonly number[]): number[] {
  const set = new Set(DUMBBELL_CHIPS[unit]);
  for (const k of savedKg) set.add(kgToUnit(k, unit));
  return [...set].sort((a, b) => a - b);
}

export function isDumbbellOn(savedKg: readonly number[], chip: number, unit: WeightUnit): boolean {
  return savedKg.some((k) => kgToUnit(k, unit) === chip);
}

/** Adds or removes a chip's weight from the saved list (kg, sorted). */
export function toggleDumbbell(savedKg: readonly number[], chip: number, unit: WeightUnit): number[] {
  if (isDumbbellOn(savedKg, chip, unit)) return savedKg.filter((k) => kgToUnit(k, unit) !== chip);
  return [...savedKg, unitToKg(chip, unit)].sort((a, b) => a - b);
}

export function toggleIn<T>(list: readonly T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}
