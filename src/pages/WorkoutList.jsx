import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom"; //useNavigate, for after logging today's workout
import {
  getWorkouts,
  createWorkout,
  deleteWorkout,
  logWorkoutToday,
} from "../api/workouts";
import { useAuth } from "../context/AuthContext";
import styles from "../styles/WorkoutList.module.css";

export function WorkoutList() {
  // workouts — array of SAVED WORKOUTS (templates) from the server
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [name, setName] = useState("");
  // isCreating — true while form is submitting, prevents double submissions
  const [isCreating, setIsCreating] = useState(false);
  // tracks which workout's "log today" request is in flight
  const [loggingId, setLoggingId] = useState(null);

  // the server uses it to know whose workouts to fetch/create/delete
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchWorkouts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchWorkouts() {
    try {
      setLoading(true);
      // pass token so server can verify identity and return only THIS user's workouts
      const data = await getWorkouts(token);
      // store the array in state so the component can render it
      setWorkouts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    // prevent browser page reload on form submit
    e.preventDefault();
    try {
      setIsCreating(true);
      // create the workout on the server — token proves who's creating it
      // user_id is set by requireAuth on the server, not sent from here
      await createWorkout(token, name);
      // refetch so the new workout appears in the list
      await fetchWorkouts();
      // clear the input so user can type a new workout name
      setName("");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteWorkout(token, id);
      // refetch after deleting — UI always reflects server reality
      await fetchWorkouts();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleLogToday(templateId) {
    try {
      // this card's btn can show its own loading state
      setLoggingId(templateId);
      // clone the template on the server — AWAIT it
      // so we actually get the new dated workout back
      const newWorkout = await logWorkoutToday(token, templateId);
      // go straight to today's fresh copy, ready for sets — not back to this list
      navigate(`/workouts/${newWorkout.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoggingId(null);
    }
  }

  // early returns — same pattern as Task Manager
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Saved Workouts</h1>
      </div>

      {/* create workout form — single input, no formData object needed */}
      <form onSubmit={handleCreate} className={styles.form}>
        <input
          className={styles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Workout name (e.g. Push Day)"
          required
        />
        <button
          type="submit"
          className={styles.addBtn}
          disabled={isCreating || !name}
        >
          {isCreating ? "Creating..." : "Add Workout"}
        </button>
      </form>

      {/* short circuit — show message if no workouts yet */}
      {workouts.length === 0 && (
        <p className={styles.emptyMessage}>
          No saved workouts yet. Add one above.
        </p>
      )}

      <div className={styles.workoutList}>
        {/* map over workouts — each one is a card with a link, a "log today"
            button, and a delete button */}
        {workouts.map((workout) => (
          <div key={workout.id} className={styles.workoutCard}>
            <div className={styles.workoutInfo}>
              {/* Link builds the URL dynamically using each workout's id —
                  clicking the name still opens it for editing the exercise list */}
              <Link
                to={`/workouts/${workout.id}`}
                className={styles.workoutName}
              >
                {workout.name}
              </Link>
            </div>
            <button
              className={styles.logTodayBtn}
              onClick={() => handleLogToday(workout.id)}
              disabled={loggingId === workout.id}
            >
              {loggingId === workout.id
                ? "Starting..."
                : "Set as Workout for Today"}
            </button>
            <button
              className={styles.deleteBtn}
              onClick={() => handleDelete(workout.id)}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
