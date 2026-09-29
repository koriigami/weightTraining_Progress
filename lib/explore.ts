// The Explore list of ready-made routines: the type chips, the order of the
// groups, which routines fit the user's equipment, and which are already added.
import { exerciseById } from '../data/exercises';
import type { Equipment } from '../data/exercises';
import { STARTER_GROUPS } from './routines';
import type { ExerciseLookup, Prefs, Routine, StarterGroup } from './routines';

export type ExploreKind = 'all' | StarterGroup['kind'];

export const EXPLORE_CHIPS: { kind: ExploreKind; label: string }[] = [
  { kind: 'all', label: 'All' },
  { kind: 'strength', label: 'Strength' },
  { kind: 'running', label: 'Running' },
  { kind: 'walking', label: 'Walking' },
  { kind: 'cycling', label: 'Cycling' },
];

// Someone with no equipment gets running and walking first. Everyone else gets
// strength first.
export function exploreOrder(equipmentKind: Prefs['equipment']['kind']): StarterGroup['kind'][] {
  return equipmentKind === 'none' ? ['running', 'walking', 'strength', 'cycling'] : ['strength', 'running', 'walking', 'cycling'];
}

// The groups for one chip, in the order for this person. Stable inside a kind, so
// Dumbbells at home, Gym and No equipment keep their order.
export function exploreGroups(kind: ExploreKind, equipmentKind: Prefs['equipment']['kind'], groups: readonly StarterGroup[] = STARTER_GROUPS): StarterGroup[] {
  const order = exploreOrder(equipmentKind);
  return groups.filter((g) => kind === 'all' || g.kind === kind).sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
}

// Every exercise of the routine uses equipment the person has.
export function fitsEquipment(routine: Pick<Routine, 'items'>, mine: ReadonlySet<Equipment>, lookup: ExerciseLookup = exerciseById): boolean {
  return routine.items.every((i) => {
    const e = lookup(i.exerciseId);
    return e ? mine.has(e.equipment) : false;
  });
}

// A starter counts as added when My routines has a routine with its title and the
// same exercises in the same order. That survives a reload, and editing the sets
// or the weights of the copy does not undo it.
export function isStarterAdded(starter: Pick<Routine, 'title' | 'items'>, routines: readonly Routine[]): boolean {
  const ids = starter.items.map((i) => i.exerciseId).join(',');
  const title = starter.title.trim().toLowerCase();
  return routines.some((r) => r.title.trim().toLowerCase() === title && r.items.map((i) => i.exerciseId).join(',') === ids);
}

export function findStarter(id: string): Routine | undefined {
  for (const g of STARTER_GROUPS) {
    const found = g.routines.find((r) => r.id === id);
    if (found) return found;
  }
  return undefined;
}
