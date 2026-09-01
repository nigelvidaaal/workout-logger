import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom"; // NEW — CLAUDE CODE bug fix
import {
  getWorkouts,
  createWorkout,
  deleteWorkout,
  logWorkoutToday, // NEW — CLAUDE CODE bug fix: see handleLogToday below
} from "../api/workouts";
import { useAuth } from "../context/AuthContext";
import styles from "../styles/WorkoutList.module.css";

export function WorkoutList() {
  // workouts — array of workout objects from the server
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [name, setName] = useState("");
  // isCreating — true while form is submitting, prevents double submissions
  const [isCreating, setIsCreating] = useState(false);
  // CLAUDE CODE — bug fix: which template's "Set as Workout for Today" is
  // mid-request, keyed by template id, so only THAT card's button disables
  // (not every card) and a double-click can't fire two clones at once
  const [loggingId, setLoggingId] = useState(null);

  // the server uses it to know whose workouts to fetch/create/delete
  const { token } = useAuth();
  const navigate = useNavigate(); // NEW

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

  // CLAUDE CODE — bug fix: this was the actual root cause behind "not saving
  // a workout" / workouts seeming to reset. "My Workouts" only ever listed
  // TEMPLATES (see server/routes/workouts.js's GET '/'); the only way to
  // reach a loggable, dated instance is POST /:id/log-today — but no button
  // anywhere in the app ever called it. WorkoutDetail.jsx even had a message
  // telling the user to "use 'Set as Workout for Today' from the list", and
  // WorkoutList.module.css already had a fully-styled `.logTodayBtn` class —
  // the button itself was just never added to the JSX. Wired it up here:
  // clone today's dated workout from this template, then jump straight to
  // it so the user lands somewhere they can actually add sets.
  async function handleLogToday(templateId) {
    try {
      setLoggingId(templateId);
      const dated = await logWorkoutToday(token, templateId);
      navigate(`/workouts/${dated.id}`);
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
        <h1 className={styles.title}>My Workouts</h1>
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
        <p className={styles.emptyMessage}>No workouts yet. Add one above.</p>
      )}

      <div className={styles.workoutList}>
        {/* map over workouts — each one is a card with a link and delete button */}
        {workouts.map((workout) => (
          <div key={workout.id} className={styles.workoutCard}>
            <div className={styles.workoutInfo}>
              {/* Link builds the URL dynamically using each workout's id */}
              <Link
                to={`/workouts/${workout.id}`}
                className={styles.workoutName}
              >
                {workout.name}
              </Link>
              {/* CLAUDE CODE — bug fix: templates have no date (date is
                  explicitly NULL — see server POST '/'), so `new
                  Date(workout.date)` was `new Date(null)`, which JS coerces
                  to the Unix epoch — every card on this page was silently
                  showing "Jan 1, 1970" here. The CSS for this span was
                  already deleted (see WorkoutList.module.css's comment) but
                  the JSX using it never was; removing it now for real. */}
            </div>
            {/* CLAUDE CODE — bug fix: the missing "Set as Workout for
                Today" button — see handleLogToday above */}
            <button
              className={styles.logTodayBtn}
              onClick={() => handleLogToday(workout.id)}
              disabled={loggingId === workout.id}
            >
              {loggingId === workout.id ? "Starting..." : "Set as Workout for Today"}
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
