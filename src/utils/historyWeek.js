// Turns the raw 7-day array from getWorkoutHistory() into display-ready
// objects for the Dashboard's History calendar.

export function buildHistoryWeek(days) {
  // days.map(...) runs the function once for EACH of the 7 objects in the array 
  return days.map((day) => {
    // parse the ISO string into a real Date object. `day.day` 
    const date = new Date(day.day);

    // a short weekday name: "Mon", "Tue", etc. 
    const dayLabel = date.toLocaleDateString("en-US", {
      weekday: "short",
      timeZone: "UTC",
    });

    // the day-of-month as a plain number (17, 18, ...).
    const dayNumber = date.getUTCDate();

    // did the user log any sets this day? 
    const hasWorkout = day.set_count > 0;

    // is this Date "today"? Comparing Date objects directly 
    const isToday =
      // slice -> "YYYY-MM-DD" format
      date.toISOString().slice(0, 10) ===
      new Date().toISOString().slice(0, 10);

    // STEP 6 — one display-ready object per day, everything the
    // HistoryCalendar component will need to render a single box.
    return {
      date,
      dayLabel,
      dayNumber,
      isToday,
      hasWorkout,
      exerciseCount: day.exercise_count,
      setCount: day.set_count,
      // CLAUDE CODE — bug fix (see getWorkoutHistory in api/workouts.js):
      // lets HistoryCalendar link a day straight to that day's dated
      // workout instead of the day box being a dead end. Deliberately NOT
      // gated on hasWorkout — a workout that's been started (exercises
      // added via "Set as Workout for Today") but has no sets logged yet
      // still needs to be reachable, otherwise it's the exact
      // "navigate away and it's gone" bug this is fixing.
      workoutId: day.workout_id,
    };
  });
}