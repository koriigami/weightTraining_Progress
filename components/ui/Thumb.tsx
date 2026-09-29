import type { ExerciseDef, Muscle } from '@/data/exercises';
import { BodySvg, highlightFill } from './MuscleMap';

const BACK_MUSCLES: Muscle[] = ['triceps', 'upperback', 'lats', 'traps', 'lowerback', 'glutes', 'hamstrings', 'calves'];

// The crop of the body that frames each main muscle.
const CROP: Partial<Record<Muscle, string>> = {
  chest: '12 22 76 76',
  shoulders: '12 22 76 76',
  biceps: '8 30 70 70',
  triceps: '8 30 70 70',
  traps: '12 16 76 76',
  upperback: '12 22 76 76',
  lats: '12 26 76 76',
  forearms: '2 52 60 60',
  abs: '20 34 60 60',
  obliques: '20 34 60 60',
  lowerback: '20 40 60 60',
  glutes: '16 76 68 68',
  quads: '16 84 68 68',
  hamstrings: '16 88 68 68',
  calves: '16 128 68 68',
};

/** A small round body-map thumbnail zoomed on the exercise's main muscle. */
export function Thumb({ exercise, size = 44, className }: { exercise: Pick<ExerciseDef, 'primary' | 'secondary'>; size?: number; className?: string }) {
  const { primary, secondary } = exercise;
  const fill = highlightFill(primary === 'cardio' ? [] : [primary], secondary);
  const crop = CROP[primary];
  return (
    <span className={`wt-thumb${className ? ` ${className}` : ''}`} style={{ width: size, height: size }}>
      {crop ? (
        <BodySvg view={BACK_MUSCLES.includes(primary) ? 'back' : 'front'} fillFor={fill} viewBox={crop} width={size} height={size} />
      ) : (
        <BodySvg view="front" fillFor={fill} width={size * 0.5} height={size * 0.92} />
      )}
    </span>
  );
}
