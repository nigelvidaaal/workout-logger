// Phase 3 Part 3 — Dashboard's weekly History calendar. Fetches one week
// of workout activity at a time (Monday-Sunday) and shows 7 boxes, one per
// day, with a dot on any day a workout was logged and a highlight on
// today. weekOffset lets the user page backward through past weeks.
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getWorkoutHistory } from "../api/workouts";
import { buildHistoryWeek } from "../utils/historyWeek";
import styles from "../styles/HistoryCalendar.module.css";

export function HistoryCalendar() {
  // 0 = this week, -1 = last week, -2 = two weeks ago, etc. — matches
  // exactly what the /history route expects as ?weekOffset=
  const [weekOffset, setWeekOffset] = useState(0);
  const [rawDays, setRawDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  useEffect(() => {
    // `cancelled` guards against a stale response overwriting a newer one —
    // if the user clicks "prev" twice quickly, the FIRST request's fetch
    // could resolve AFTER the second one and clobber it with old data.
    // Returning a cleanup function from useEffect (React calls it right
    // before the effect re-runs, i.e. when weekOffset changes again) flips
    // this flag so that late response is simply ignored.
    let cancelled = false;

    async function fetchWeek() {
      try {
        setLoading(true);
        const data = await getWorkoutHistory(token, weekOffset);
        if (!cancelled) setRawDays(data);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchWeek();
    return () => {
      cancelled = true;
    };
  }, [token, weekOffset]);

  // raw API rows -> 7 display-ready day objects (src/utils/historyWeek.js)
  const week = buildHistoryWeek(rawDays);

  // "This Week" / "Last Week" for the two most common cases, otherwise a
  // plain date range so older weeks still read clearly
  let rangeLabel = "";
  if (week.length) {
    if (weekOffset === 0) rangeLabel = "This Week";
    else if (weekOffset === -1) rangeLabel = "Last Week";
    else {
      const start = week[0].date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      });
      const end = week[6].date.toLocaleDateString("en-US", {
        day: "numeric",
        timeZone: "UTC",
      });
      rangeLabel = `${start}–${end}`;
    }
  }

  // no logging workouts in the future — caps the "next week" button at
  // the current week instead of paging into empty days that can't have data
  const nextDisabled = weekOffset >= 0;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button
          type="button"
          className={styles.navBtn}
          onClick={() => setWeekOffset((w) => w - 1)}
          aria-label="Previous week"
        >
          ‹
        </button>
        <span className={styles.rangeLabel}>{rangeLabel}</span>
        <button
          type="button"
          className={styles.navBtn}
          onClick={() => setWeekOffset((w) => w + 1)}
          disabled={nextDisabled}
          aria-label="Next week"
        >
          ›
        </button>
      </div>

      {loading ? (
        <p className={styles.loading}>Loading...</p>
      ) : (
        <div className={styles.week}>
          {week.map((day) => (
            <div
              key={day.date.toISOString()}
              className={`${styles.day} ${day.isToday ? styles.today : ""}`}
              title={`${day.setCount} ${day.setCount === 1 ? "set" : "sets"}`}
            >
              <span className={styles.dayLabel}>{day.dayLabel}</span>
              <span className={styles.dayNumber}>{day.dayNumber}</span>
              {day.hasWorkout && (
                <span className={styles.dot} aria-hidden="true" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
