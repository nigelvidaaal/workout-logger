// Maps this app's 10 chart muscle groups (see src/constants/muscleGroups.js) to
// the "slug" names used by the react-muscle-highlighter <Body> component.
//
// The library models more muscles than we track tonnage for, so one of OUR groups
// often fans out to SEVERAL of its slugs (e.g. our "back" covers three of theirs).
// Every slug in the list gets colored with the SAME tier as its parent group —
// we don't have finer-grained volume data than "chest / back / shoulders / etc",
// so there's no more-correct way to split it.
//
// Reference: https://github.com/soroojshehryar/react-muscle-highlighter
export const MUSCLE_TO_HIGHLIGHTER_SLUGS = {
  chest: ['chest'],
  back: ['upper-back', 'lower-back', 'trapezius'],
  shoulders: ['deltoids'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  abs: ['abs', 'obliques'],
  quads: ['quadriceps'],
  hamstrings: ['hamstring'],
  glutes: ['gluteal'],
  calves: ['calves'],
};

// Slugs the library renders that we have NO chart group / volume data for at all
// (forearms, hands, feet, etc). These should always render with the library's
// defaultFill — never touched by our tier logic. Kept here mostly as documentation;
// you likely won't need to reference this list directly since simply never adding
// them to the `data` array is enough to leave them at defaultFill.
export const UNTRACKED_SLUGS = [
  'adductors',
  'ankles',
  'feet',
  'forearm',
  'hands',
  'head',
  'knees',
  'tibialis',
  'neck',
  'hair',
];