// Searching, filtering and grouping the exercise library. Pure, so the picker,
// the library panel and the Exercises page all behave the same.
//
// Rules from the design board:
// - Muscles and equipment are multi-select. An exercise matches when it works any
//   selected muscle (as main or as "also works"), and when its equipment is any
//   selected piece.
// - Exercises the person avoids are hidden, with a "Show" link.
// - Exercises for the equipment they have come first. The rest are dimmed.
import { AVOID_TAGS, EQUIPMENT, JOINTS, MUSCLES } from '../data/exercises';
import type { CustomExercise, Equipment, ExerciseDef, Muscle } from '../data/exercises';
import { isAvoided } from './routines';
import type { Prefs } from './routines';

export type ExerciseFilters = {
  query: string;
  muscles: Muscle[];
  equipment: Equipment[];
  showAvoided: boolean;
};

export function emptyFilters(): ExerciseFilters {
  return { query: '', muscles: [], equipment: [], showAvoided: false };
}

export function toggleInList<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

// Every muscle of a quick pick (Push, Pull, ...) is selected.
export function isQuickPickOn(selected: readonly Muscle[], group: readonly Muscle[]): boolean {
  return group.every((m) => selected.includes(m));
}

// Tapping a quick pick selects all its muscles, and tapping it again removes them.
export function toggleQuickPick(selected: readonly Muscle[], group: readonly Muscle[]): Muscle[] {
  if (isQuickPickOn(selected, group)) return selected.filter((m) => !group.includes(m));
  return [...new Set([...selected, ...group])];
}

export type ClearWhich = 'muscles' | 'equipment' | 'all';

// Clears the pills. The search text stays, since it has its own box.
export function clearFilters(f: ExerciseFilters, which: ClearWhich = 'all'): ExerciseFilters {
  return {
    ...f,
    muscles: which === 'equipment' ? f.muscles : [],
    equipment: which === 'muscles' ? f.equipment : [],
  };
}

export type FilterPill = { kind: 'muscle' | 'equipment'; value: string; label: string };

// The removable pills under the search box: muscles first, then equipment.
export function filterPills(f: ExerciseFilters): FilterPill[] {
  return [
    ...f.muscles.map((m): FilterPill => ({ kind: 'muscle', value: m, label: MUSCLES[m] })),
    ...f.equipment.map((q): FilterPill => ({ kind: 'equipment', value: q, label: EQUIPMENT[q] })),
  ];
}

export function removePill(f: ExerciseFilters, pill: FilterPill): ExerciseFilters {
  return pill.kind === 'muscle'
    ? { ...f, muscles: f.muscles.filter((m) => m !== pill.value) }
    : { ...f, equipment: f.equipment.filter((q) => q !== pill.value) };
}

export function matchesFilters(e: ExerciseDef, f: ExerciseFilters): boolean {
  const q = f.query.trim().toLowerCase();
  if (q && !e.name.toLowerCase().includes(q)) return false;
  if (f.equipment.length > 0 && !f.equipment.includes(e.equipment)) return false;
  if (f.muscles.length > 0 && !f.muscles.includes(e.primary) && !e.secondary.some((m) => f.muscles.includes(m))) return false;
  return true;
}

// The library with the user's own exercises first, so a new one is easy to find.
export function libraryOrder(library: readonly ExerciseDef[], custom: readonly CustomExercise[] | undefined): ExerciseDef[] {
  return custom && custom.length > 0 ? [...custom, ...library] : [...library];
}

export type FilterResult = { list: ExerciseDef[]; hidden: ExerciseDef[] };

// Exercises that match, and the matching ones held back by the avoid list.
export function filterExercises(all: readonly ExerciseDef[], f: ExerciseFilters, prefs: Pick<Prefs, 'avoid' | 'limits'>): FilterResult {
  const matches = all.filter((e) => matchesFilters(e, f));
  if (f.showAvoided) return { list: matches, hidden: [] };
  const hidden = matches.filter((e) => isAvoided(e, prefs));
  return { list: matches.filter((e) => !hidden.includes(e)), hidden };
}

// "Lunges, jumping and knees": why the hidden exercises are hidden.
export function avoidReasons(hidden: readonly ExerciseDef[], prefs: Pick<Prefs, 'avoid' | 'limits'>): string[] {
  const reasons: string[] = [];
  const add = (r: string) => {
    if (!reasons.includes(r)) reasons.push(r);
  };
  for (const e of hidden) {
    if (e.avoidTag && prefs.avoid.includes(e.avoidTag)) add(AVOID_TAGS[e.avoidTag].toLowerCase());
    for (const j of e.stresses ?? []) if (prefs.limits.includes(j)) add(JOINTS[j].toLowerCase());
  }
  return reasons;
}

export type ExerciseGroup = { key: string; title: string; exercises: ExerciseDef[] };

// With muscles selected: one group per muscle (its main exercises), then the rest
// that only work them as "also works". Otherwise: for your equipment, then the
// rest. Inside a group, exercises for your equipment come first.
export function groupExercises(list: readonly ExerciseDef[], f: ExerciseFilters, mine: ReadonlySet<Equipment>): ExerciseGroup[] {
  const byMine = (items: ExerciseDef[]) => [...items].sort((a, b) => Number(mine.has(b.equipment)) - Number(mine.has(a.equipment)));
  let groups: ExerciseGroup[];
  if (f.muscles.length > 0) {
    groups = f.muscles.map((m) => ({ key: m, title: MUSCLES[m], exercises: byMine(list.filter((e) => e.primary === m)) }));
    groups.push({
      key: 'also',
      title: f.muscles.length === 1 ? `Also works ${MUSCLES[f.muscles[0]].toLowerCase()}` : 'Also works these',
      exercises: byMine(list.filter((e) => !f.muscles.includes(e.primary))),
    });
  } else {
    groups = [
      { key: 'mine', title: 'For your equipment', exercises: list.filter((e) => mine.has(e.equipment)) },
      { key: 'other', title: 'Other equipment', exercises: list.filter((e) => !mine.has(e.equipment)) },
    ];
  }
  return groups.filter((g) => g.exercises.length > 0);
}

// "Chest · Triceps, Shoulders" plus "Needs dumbbell" when the equipment is not theirs.
export function exerciseSubtitle(e: Pick<ExerciseDef, 'primary' | 'secondary' | 'equipment'>, opts: { needs?: boolean } = {}): string {
  const also = e.secondary.slice(0, 2).map((m) => MUSCLES[m]);
  let text = MUSCLES[e.primary];
  if (also.length > 0) text += ` · ${also.join(', ')}`;
  if (opts.needs) text += ` · Needs ${EQUIPMENT[e.equipment].toLowerCase()}`;
  return text;
}
