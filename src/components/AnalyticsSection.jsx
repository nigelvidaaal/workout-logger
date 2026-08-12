import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  Scatter,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useAuth } from "../context/AuthContext";
import {
  getVolumeAnalytics,
  getExerciseAnalytics,
  getBodyWeightAnalytics,
  logBodyWeight,
} from "../api/workouts";
import styles from "../styles/AnalyticsSection.module.css";

const TIME_RANGE_OPTIONS = [
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "all", label: "All Time" },
];

const CHART_TYPE_OPTIONS = [
  { value: "volume", label: "Volume" },
  { value: "exercises", label: "Exercises" },
  { value: "bodyweight", label: "Body Weight" },
];

// matches the anatomy chart's "High" tier green (src/utils/muscleFill.js) for
// visual consistency across the app's data-viz surfaces — not the app's --accent
// (orange), a deliberate choice since the reference look calls for a green line
const VOLUME_LINE_COLOR = "#33FF33";

// warm/cool pair for the exercise comparison bars — warm reuses the app's actual
// --accent token directly; cool matches the anatomy chart's "Medium" tier cyan
// (src/utils/muscleFill.js), same reasoning as VOLUME_LINE_COLOR above: every
// data-viz color here traces back to an already-established app color
const WEIGHT_COLOR = "var(--accent)";
const VOLUME_BAR_COLOR = "#00D2FF";

// trendline reuses --accent again (literal "accent-colored trendline"); the raw
// daily-weight dots are a genuinely new color — nothing "muted gold" exists
// anywhere else in the app's palette to borrow instead
const BODY_WEIGHT_TREND_COLOR = "var(--accent)";
const BODY_WEIGHT_DOT_COLOR = "#D4A017";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// formats from the raw "YYYY-MM-DD..." date-string PREFIX only — never round-trips
// through `new Date()`, which would reinterpret the backend's already-Pacific-bucketed
// date through the browser's own local timezone and could shift the displayed day again
function formatBucketLabel(bucket) {
  const [, month, day] = bucket.slice(0, 10).split("-").map(Number);
  return `${MONTH_NAMES[month - 1]} ${day}`;
}

// exercise names come back as LOWER(e.name) from the query — title-case them for
// display (matches this app's existing pattern, e.g. MuscleChart's capitalized
// legend labels) and truncate long ones so rotated axis labels stay legible
function formatExerciseLabel(name) {
  const capitalized = name.replace(/\b\w/g, (c) => c.toUpperCase());
  return capitalized.length > 14 ? `${capitalized.slice(0, 14)}…` : capitalized;
}

export function AnalyticsSection() {
  const [timeRange, setTimeRange] = useState("week");
  const [chartType, setChartType] = useState("volume");
  const [volumeData, setVolumeData] = useState([]);
  const [exerciseData, setExerciseData] = useState([]);
  const [bodyWeightData, setBodyWeightData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [weightInput, setWeightInput] = useState("");
  const [logging, setLogging] = useState(false);
  // bumped after a successful log to retrigger the effect below — keeping the
  // fetch itself declared inside the effect (rather than called in from an
  // event handler) is what keeps react-hooks/set-state-in-effect happy here
  const [refreshKey, setRefreshKey] = useState(0);

  const { token } = useAuth();

  useEffect(() => {
    async function fetchChartData() {
      try {
        setLoading(true);
        setError(null);
        if (chartType === "exercises") {
          const rows = await getExerciseAnalytics(token, timeRange);
          setExerciseData(
            rows.map((row) => ({
              ...row,
              top_weight: Number(row.top_weight),
              total_volume: Number(row.total_volume),
            }))
          );
        } else if (chartType === "bodyweight") {
          const rows = await getBodyWeightAnalytics(token, timeRange);
          setBodyWeightData(rows);
        } else {
          const rows = await getVolumeAnalytics(token, timeRange);
          setVolumeData(rows.map((row) => ({ ...row, volume: Number(row.volume) })));
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchChartData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange, chartType, refreshKey]);

  async function handleLogWeight(e) {
    e.preventDefault();
    const value = Number(weightInput);
    if (!Number.isFinite(value) || value <= 0) return;

    try {
      setLogging(true);
      await logBodyWeight(token, value);
      setWeightInput("");
      // triggers the effect above to refetch, so the chart updates immediately
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLogging(false);
    }
  }

  return (
    <div className={styles.card}>
      {/* both toggle rows render unconditionally, even mid-refetch, so the active
          selection stays visible instead of flickering away on every click */}
      <div className={styles.toggleRow}>
        {TIME_RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`${styles.toggleBtn} ${timeRange === opt.value ? styles.toggleBtnActive : ""}`}
            onClick={() => setTimeRange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className={styles.chartArea}>
        {loading ? (
          <p className={styles.stateMessage}>Loading...</p>
        ) : error ? (
          <p className={styles.stateMessage}>Error: {error}</p>
        ) : chartType === "exercises" ? (
          exerciseData.length === 0 ? (
            <p className={styles.stateMessage}>No sets logged in this range yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={exerciseData} margin={{ bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="name"
                  tickFormatter={formatExerciseLabel}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                  height={60}
                  tick={{ fontSize: 10, fill: "var(--text-secondary)" }}
                />
                <YAxis
                  yAxisId="weight"
                  orientation="left"
                  tick={{ fontSize: 11, fill: WEIGHT_COLOR }}
                />
                <YAxis
                  yAxisId="volume"
                  orientation="right"
                  tick={{ fontSize: 11, fill: VOLUME_BAR_COLOR }}
                />
                <Tooltip
                  labelFormatter={formatExerciseLabel}
                  contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                  labelStyle={{ color: "var(--text-primary)" }}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: "var(--text-secondary)" }} />
                <Bar
                  yAxisId="weight"
                  dataKey="top_weight"
                  name="Top Weight (lbs)"
                  fill={WEIGHT_COLOR}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  yAxisId="volume"
                  dataKey="total_volume"
                  name="Total Volume (lbs)"
                  fill={VOLUME_BAR_COLOR}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )
        ) : chartType === "bodyweight" ? (
          bodyWeightData.length === 0 ? (
            <p className={styles.stateMessage}>No weight logged in this range yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={bodyWeightData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatBucketLabel}
                  tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
                />
                {/* explicit domain so the axis frames the actual weight range instead
                    of anchoring at zero, which would flatten out day-to-day variation */}
                <YAxis
                  domain={["dataMin - 2", "dataMax + 2"]}
                  tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
                />
                <Tooltip
                  labelFormatter={formatBucketLabel}
                  contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                  labelStyle={{ color: "var(--text-primary)" }}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: "var(--text-secondary)" }} />
                <Scatter dataKey="weight" name="Daily Weight" fill={BODY_WEIGHT_DOT_COLOR} />
                <Line
                  type="monotone"
                  dataKey="trend"
                  name="7-Day Trendline"
                  stroke={BODY_WEIGHT_TREND_COLOR}
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )
        ) : volumeData.length === 0 ? (
          <p className={styles.stateMessage}>No sets logged in this range yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={volumeData}>
              <defs>
                <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={VOLUME_LINE_COLOR} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={VOLUME_LINE_COLOR} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="bucket"
                tickFormatter={formatBucketLabel}
                tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
              />
              <YAxis tick={{ fontSize: 11, fill: "var(--text-secondary)" }} />
              <Tooltip
                labelFormatter={formatBucketLabel}
                contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                labelStyle={{ color: "var(--text-primary)" }}
              />
              <Area
                type="monotone"
                dataKey="volume"
                stroke={VOLUME_LINE_COLOR}
                strokeWidth={2}
                fill="url(#volumeGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {chartType === "bodyweight" && (
        <form className={styles.logForm} onSubmit={handleLogWeight}>
          <input
            className={styles.logInput}
            type="number"
            step="0.1"
            min="0"
            placeholder="Weight (lbs)"
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
          />
          <button
            type="submit"
            className={styles.logBtn}
            disabled={logging || !(Number(weightInput) > 0)}
          >
            {logging ? "Logging..." : "Log"}
          </button>
        </form>
      )}

      <div className={styles.toggleRow}>
        {CHART_TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`${styles.toggleBtn} ${chartType === opt.value ? styles.toggleBtnActive : ""} ${opt.disabled ? styles.toggleBtnDisabled : ""}`}
            disabled={opt.disabled}
            onClick={() => setChartType(opt.value)}
          >
            {opt.label}
            {opt.disabled && " · Soon"}
          </button>
        ))}
      </div>
    </div>
  );
}
