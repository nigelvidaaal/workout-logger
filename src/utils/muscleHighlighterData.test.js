import { buildMuscleHighlighterData } from './muscleHighlighterData';

test('tiers chest high, back medium, biceps low, and skips zero-volume groups', () => {
  const result = buildMuscleHighlighterData({
    chest: 0.9, back: 0.4, shoulders: 0, biceps: 0.1, triceps: 0,
    abs: 0, quads: 0, hamstrings: 0, glutes: 0, calves: 0,
  });

  expect(result).toEqual([
    { slug: 'chest', color: '#33FF33' },
    { slug: 'upper-back', color: '#00D2FF' },
    { slug: 'lower-back', color: '#00D2FF' },
    { slug: 'trapezius', color: '#00D2FF' },
    { slug: 'biceps', color: '#FFD700' },
  ]);
});