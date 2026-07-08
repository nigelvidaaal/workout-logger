import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getWorkouts, createWorkout, deleteWorkout } from "../api/workouts";
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

  // the server uses it to know whose workouts to fetch/create/delete
  const { token } = useAuth();

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
              <span className={styles.workoutDate}>{workout.date}</span>
            </div>
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
