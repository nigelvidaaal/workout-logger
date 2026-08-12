import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getExerciseProgress } from "../api/workouts";
import { useAuth } from "../context/AuthContext";

export function ExerciseChart({ exerciseName }) {
  // data — array of { date, maxweight } objects from the server
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  useEffect(() => {
    async function fetchProgress() {
      try {
        setLoading(true);
        const result = await getExerciseProgress(token, exerciseName);
        setData(result);
      } finally {
        setLoading(false);
      }
    }
    fetchProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseName]);
  // [exerciseName] — refetch if the exercise name changes

  // need at least 2 data points for a line chart to be meaningful
  if (loading) return <div>Loading chart...</div>;
  if (data.length < 2) return null;

  return (
    <div>
      <h4>Progress — {exerciseName}</h4>
      {/* ResponsiveContainer makes the chart fill its parent's width */}
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          {/* CartesianGrid adds the background grid lines */}
          <CartesianGrid strokeDasharray="3 3" />
          {/* XAxis uses the date field from each data point */}
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          {/* YAxis shows the weight values */}
          <YAxis tick={{ fontSize: 11 }} />
          {/* Tooltip shows exact values on hover */}
          <Tooltip />
          {/* Line draws the actual chart line using maxweight values */}
          <Line
            type="monotone"
            dataKey="maxweight"
            stroke="#F9740D"
            strokeWidth={2}
            dot={{ fill: "#F9740D" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
