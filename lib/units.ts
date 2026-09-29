// Weight and distance units. Data is stored in kg and km. The user's units only
// change what the screens show and what a typed number means.
import type { Prefs } from './routines';

export type WeightUnit = Prefs['units']['weight'];
export type DistanceUnit = Prefs['units']['distance'];

const LB_PER_KG = 2.2046226218;
const KM_PER_MI = 1.609344;

const round = (n: number, places: number): number => {
  const f = 10 ** places;
  return Math.round(n * f) / f;
};

// A number for people: no trailing zeros, at most two decimals.
export function fmtNumber(n: number): string {
  return String(round(n, 2));
}

// Stored kg as the number to show in the user's unit. Pounds show one decimal,
// so typing 135 lb gives back 135 after the round trip through kg.
export function kgToUnit(kg: number, unit: WeightUnit): number {
  return unit === 'lb' ? round(kg * LB_PER_KG, 1) : round(kg, 2);
}

// A typed number in the user's unit as kg to store.
export function unitToKg(value: number, unit: WeightUnit): number {
  return unit === 'lb' ? round(value / LB_PER_KG, 3) : round(value, 3);
}

export function kmToUnit(km: number, unit: DistanceUnit): number {
  return unit === 'mi' ? round(km / KM_PER_MI, 2) : round(km, 3);
}

export function unitToKm(value: number, unit: DistanceUnit): number {
  return unit === 'mi' ? round(value * KM_PER_MI, 3) : round(value, 3);
}

export const weightLabel = (unit: WeightUnit): string => (unit === 'lb' ? 'Lbs' : 'Kg');
export const distanceLabel = (unit: DistanceUnit): string => (unit === 'mi' ? 'Mi' : 'Km');

// "5 kg", "11 lb".
export function fmtWeight(kg: number, unit: WeightUnit): string {
  return `${fmtNumber(kgToUnit(kg, unit))} ${unit}`;
}

// One decimal, no trailing zero: 5.7, 10, 1.2.
const fmtOne = (n: number): string => String(round(n, 1));

// A total lifted. Under 1,000 kg it is whole units with thousands separators:
// "850 kg", "1,874 lb". From 1,000 kg it gets a short form so it stays readable
// on a card or a stat tile: tonnes for kilograms ("5.7 t"), and for pounds the
// same weight in thousands of pounds ("12.6k lb"). Both units switch over at
// the same weight lifted, so a kg user and a lb user see the change together.
export function fmtVolume(kg: number, unit: WeightUnit): string {
  if (kg >= 1000) return unit === 'lb' ? `${fmtOne(kgToUnit(kg, 'lb') / 1000)}k lb` : `${fmtOne(kg / 1000)} t`;
  return `${Math.round(kgToUnit(kg, unit)).toLocaleString('en-US')} ${unit}`;
}

// "3 km", "1.86 mi".
export function fmtDistance(km: number, unit: DistanceUnit): string {
  return `${fmtNumber(kmToUnit(km, unit))} ${unit}`;
}
