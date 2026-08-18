// ---------------------------------------------------------------------------
// Where this fits in the data flow:
//
//   MuscleChart.jsx already builds:
//     intensityByGroup = { chest: 0.8, back: 0.4, shoulders: 0, biceps: 0.1, ... }
//   (10 keys — one per src/constants/muscleGroups.js entry — each 0..1, relative
//   to whichever group has the most tonnage in the selected time range)
//
//   react-muscle-highlighter's <Body> wants:
//     data = [
//       { slug: 'chest', intensity: 3 },        // 3 = High
//       { slug: 'upper-back', intensity: 2 },   // 2 = Medium
//       { slug: 'lower-back', intensity: 2 },
//       { slug: 'trapezius', intensity: 2 },
//       ...
//     ]
//   and a `colors` array on <Body colors={[low, medium, high]} />, where
//   `intensity: 2` means "use colors[1]" (1-based indexing — colors[intensity - 1]).
//
//   This file is the function in between: buildMuscleHighlighterData(intensityByGroup)
//   should return that `data` array.
// ---------------------------------------------------------------------------

import { MUSCLE_TO_HIGHLIGHTER_SLUGS } from '../constants/muscleHighlighterSlugs';


// intensityToTier(intensity) — takes a single 0..1 number, returns 1, 2, or 3.
//
// re declaring tiers and thresholds since they dont import from muscleFill 

const TIER_HIGH = { min: 0.66, color: "#33FF33", label: "High" };   // neon green
const TIER_MID = { min: 0.33, color: "#00D2FF", label: "Medium" };  // vivid cyan
const TIER_LOW = { min: 0, color: "#FFD700", label: "Low" };        // bright yellow

function intensityToTier(intensity) {

  // STEP 1: if intensity is HIGH 
  if (intensity >= TIER_HIGH.min) {
    return TIER_HIGH; 
  // STEP 2: if intensity is MEDIUM 
  } else if (intensity >= TIER_MID.min){
    return TIER_MID
  } else { 
    return TIER_LOW
  }
}

// buildMuscleHighlighterData(intensityByGroup) — the main export.
export function buildMuscleHighlighterData(intensityByGroup) {
  // STEP 1: start with an empty array 
  const data = [];

  // loop over every [group, intensity] pair in intensityByGroup.
  // Object.entries({ chest: 0.8, back: 0.4 }) returns [['chest', 0.8], ['back', 0.4]] —
  // an array of [key, value] pairs, which is exactly what a `for...of` with array
  // destructuring wants.
  for (const [group, intensity] of Object.entries(intensityByGroup)) {
    // Step 3: skip this group entirely if intensity is 0 (nothing logged).
    if (intensity === 0) {
      // continue skips the rest of THIS loop, moves to the next group 
      continue;
    }

    // Step 4: convert this group's intensity into a tier by calling the function
    // you just wrote above.
    const tier = intensityToTier(intensity);

    // Step 5: look up which library slug(s) this group maps to. 
    // side note: found out that adding a '||' to this avoids runtime down errors 
    const slugs = MUSCLE_TO_HIGHLIGHTER_SLUGS[group] || [];

    // Step 6: push one { slug, intensity: tier } entry into `data` for EACH slug in the array of step 5
    for (const slug of slugs) {
      data.push({slug, color: tier.color });
    }
  }

  // Step 7: return what you built.
  return data;
}

// Muscle chart graphics improved; building of highlighter data