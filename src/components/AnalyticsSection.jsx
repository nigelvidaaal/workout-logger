import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useAuth } from "../context/AuthContext";
import { getVolumeAnalytics } from "../api/workouts";
import styles from "../styles/AnalyticsSection.module.css";

const TIME_RANGE_OPTIONS = [
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "all", label: "All Time" },
];

const CHART_TYPE_OPTIONS = [
  { value: "volume", label: "Volume" },
  { value: "exercises", label: "Exercises", disabled: true },
  { value: "bodyweight", label: "Body Weight", disabled: true },
];

// matches the anatomy chart's "High" tier green (src/utils/muscleFill.js) for
// visual consistency across the app's data-viz surfaces — not the app's --accent
// (orange), a deliberate choice since the reference look calls for a green line
const VOLUME_LINE_COLOR = "#33FF33";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// formats from the raw "YYYY-MM-DD..." date-string PREFIX only — never round-trips
// through `new Date()`, which would reinterpret the backend's already-Pacific-bucketed
// date through the browser's own local timezone and could shift the displayed day again
function formatBucketLabel(bucket) {
  const [, month, day] = bucket.slice(0, 10).split("-").map(Number);
  return `${MONTH_NAMES[month - 1]} ${day}`;
}

export function AnalyticsSection() {
  const [timeRange, setTimeRange] = useState("week");
  const [chartType, setChartType] = useState("volume");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { token } = useAuth();

  useEffect(() => {
    async function fetchVolume() {
      try {
        setLoading(true);
        setError(null);
        const rows = await getVolumeAnalytics(token, timeRange);
        setData(rows.map((row) => ({ ...row, volume: Number(row.volume) })));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchVolume();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

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
        ) : data.length === 0 ? (
          <p className={styles.stateMessage}>No sets logged in this range yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data}>
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
