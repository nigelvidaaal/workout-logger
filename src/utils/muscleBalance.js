// this section tells the user of how many sets the muscles has worked out with. 
import { MUSCLE_GROUPS } from '../constants/muscleGroups';

// target sets - min and max
const TARGET_MIN = 10; 
const TARGET_MAX = 20; 

const COLOR_LOW = '#FFD700';  // gold — at/below TARGET_MIN
const COLOR_HIGH = '#33FF33'; // green — at/above TARGET_MAX

// return a hex color with the use of min and max vars above 
function getSetsColor(setsPerWeek) {
  // "how far between 10 and 20 is this number, as a 0-1 value?"
  // (value - min) / (max - min) is the literal math-class formula for that.
  const rawFraction = (setsPerWeek - TARGET_MIN) / (TARGET_MAX - TARGET_MIN);
  // clamp, as it would go negative with just 10 
  const fraction = Math.max(0, Math.min(1, rawFraction));

  // cuts out portion of strings (1, 3)
  // converts isolated string into a base 10 number (...), 16. parseInt reads it to hexadecimal 
  const lowR = parseInt(COLOR_LOW.slice(1, 3), 16);
  const lowG = parseInt(COLOR_LOW.slice(3, 5), 16);
  const lowB = parseInt(COLOR_LOW.slice(5, 7), 16);
  const highR = parseInt(COLOR_HIGH.slice(1, 3), 16);
  const highG = parseInt(COLOR_HIGH.slice(3, 5), 16);
  const highB = parseInt(COLOR_HIGH.slice(5, 7), 16);

  // blend each channel toward "high" by `fraction`. This is the
  // same shape 3 times: start at low, add the full low-to-high distance
  // scaled down by fraction. At fraction 0 this is just `low`; at fraction
  // 1 it's low + (high-low) = high; at 0.5 it's exactly the midpoint.
  // Math.round() because color channels are whole numbers, not decimals.
  const r = Math.round(lowR + (highR - lowR) * fraction);
  const g = Math.round(lowG + (highG - lowG) * fraction);
  const b = Math.round(lowB + (highB - lowB) * fraction);

  // back to a "#RRGGBB" string. n.toString(16) converts a number
  // to hex, but DROPS a leading zero it would otherwise need — 5 becomes
  // "5", not "05". padStart(2, '0') means "pad the front of this string
  // with '0' until it's at least 2 characters" — turning "5" into "05" but
  // leaving an already-2-character "1a" untouched.
  const toHex = (n) => n.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function buildMuscleBalance(setsByGroup) {
  // every group shown now, not just a top-3/bottom-3 split — the whole
  // point of a 10-20 target is seeing where EVERY muscle group sits
  return MUSCLE_GROUPS.map((group) => {
    const setsPerWeek = setsByGroup[group.value] ?? 0;
    return {
      value: group.value,
      label: group.label,
      setsPerWeek,
      color: getSetsColor(setsPerWeek),
    };
  });
}