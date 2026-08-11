import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getWorkout,
  deleteWorkout,
  createExercise,
  deleteExercise,
  createSet,
  deleteSet,
} from "../api/workouts";
import { useAuth } from "../context/AuthContext";
// import { ExerciseChart } from "../components/ExerciseChart";
import styles from "../styles/WorkoutDetail.module.css";
import confetti from "canvas-confetti";
import { ExerciseSearch } from "../components/ExerciseSearch";

export function WorkoutDetail() {
  // workout — single object containing { id, name, date, exercises: [] }
  // starts null because we haven't fetched yet
  const [workout, setWorkout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // exerciseName — controlled input for adding a new exercise
  const [exerciseName, setExerciseName] = useState("");
  // catalogId — set when exerciseName came from picking a real catalog match;
  // null means a fully custom name, either typed or explicitly confirmed as custom
  const [catalogId, setCatalogId] = useState(null);

  // confetti effect when hitting a PR
  const [celebration, setCelebration] = useState(null);

  // newSet — tracks which exercise we're adding a set to, plus the set values
  // exerciseId: null means no exercise is currently selected for set addition
  const [newSet, setNewSet] = useState({
    exerciseId: null,
    reps: " ",
    weight: " ",
    set_number: " ",
  });

  // token comes from auth context — passed to every API call
  const { token } = useAuth();
  // id comes from the URL — /workouts/3 gives id = "3"
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    fetchWorkout();
    // [id] means refetch if the id in the URL changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function fetchWorkout() {
    try {
      setLoading(true);
      // getWorkout fetches ONE workout by id WITH its exercises and sets nested inside
      // the server runs the JOIN query and groupExercisesWithSets for us
      const data = await getWorkout(token, id);
      setWorkout(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteWorkout() {
    try {
      await deleteWorkout(token, id);
      // workout is gone — nothing left to show on this page
      // navigate back to the list
      navigate("/workouts");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAddExercise(e) {
    e.preventDefault();
    try {
      // create the exercise — workout.id tells the server which workout it belongs to
      await createExercise(token, id, exerciseName, catalogId);
      // refetch so the new exercise appears immediately
      await fetchWorkout();
      // clear the inputs
      setExerciseName("");
      setCatalogId(null);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteExercise(exerciseId) {
    try {
      await deleteExercise(token, exerciseId);
      // refetch so the deleted exercise disappears
      await fetchWorkout();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAddSet(e) {
    e.preventDefault();
    try {
      // newSet.exerciseId tells the server which exercise this set belongs to
      // reps, weight, set_number are the actual set values
      const result = await createSet(
        token,
        newSet.exerciseId,
        newSet.reps,
        newSet.weight,
        newSet.set_number,
      );

      if (result.isPR) {
        const exercise = workout.exercises.find(
          (ex) => ex.id === newSet.exerciseId,
        );
        const exerciseName = exercise?.name;

        confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
        setCelebration({
          weight: result.weight,
          exerciseName: exerciseName, // NEW — pass it into celebration state
          achievements: result.unlockedAchievements,
        });
      }

      // refetch so the new set appears under the right exercise
      await fetchWorkout();
      // reset set form but keep exerciseId so user can add another set to same exercise
      setNewSet({
        exerciseId: newSet.exerciseId,
        reps: "",
        weight: "",
        set_number: "",
      });
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteSet(setId) {
    try {
      await deleteSet(token, setId);
      await fetchWorkout();
    } catch (err) {
      setError(err.message);
    }
  }

  // early returns — same pattern as every other page
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  // if fetch succeeded but returned nothing
  if (!workout) return <div>Workout not found</div>;

  return (
    <div className={styles.container}>
      {/* PR CONFETTI FX */}
      {celebration && (
        <div className={styles.celebrationBanner}>
          <h2>
            🎉 New PR on {celebration.exerciseName}! {celebration.weight} lbs
          </h2>
          {celebration.achievements.length > 0 && (
            <div>
              {celebration.achievements.map((a) => (
                <p key={a.tier}>
                  {a.icon} Achievement unlocked: {a.name}
                </p>
              ))}
            </div>
          )}
          <button onClick={() => setCelebration(null)}>Dismiss</button>
        </div>
      )}
      <button className={styles.backBtn} onClick={() => navigate("/workouts")}>
        ← Back
      </button>

      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h1>{workout.name}</h1>
          <p>{workout.date}</p>
        </div>
        <button
          className={styles.deleteWorkoutBtn}
          onClick={handleDeleteWorkout}
        >
          Delete Workout
        </button>
      </div>

      <form onSubmit={handleAddExercise} className={styles.addExerciseForm}>
        <ExerciseSearch
          value={exerciseName}
          onChange={(text) => {
            setExerciseName(text);
            // typing invalidates whatever catalog match (if any) was previously selected
            setCatalogId(null);
          }}
          onSelectCatalogItem={(item) => {
            if (item) {
              setExerciseName(item.name);
              setCatalogId(item.id);
            } else {
              // "add as custom" — keep the typed name, explicitly confirm no catalog link
              setCatalogId(null);
            }
          }}
        />
        {/* disabled until a name is entered */}
        <button
          type="submit"
          className={styles.addBtn}
          disabled={!exerciseName}
        >
          Add Exercise
        </button>
      </form>

      {workout.exercises.length === 0 && (
        <p className={styles.emptyMessage}>No exercises yet.</p>
      )}

      {workout.exercises.map((exercise) => (
        <div key={exercise.id} className={styles.exerciseCard}>
          <div className={styles.exerciseHeader}>
            <h3 className={styles.exerciseName}>{exercise.name}</h3>
            <button
              className={styles.deleteExerciseBtn}
              onClick={() => handleDeleteExercise(exercise.id)}
            >
              Delete
            </button>
          </div>

          {exercise.sets.length === 0 && (
            <p className={styles.emptyMessage}>No sets yet.</p>
          )}

          {exercise.sets.map((set) => (
            <div key={set.id} className={styles.setRow}>
              <span>Set {set.set_number}</span>
              <span>{set.reps} reps</span>
              {/* weight stored as REAL in SQLite — supports decimals like 22.5kg */}
              <span>{set.weight} lbs</span>
              <button
                className={styles.deleteSetBtn}
                onClick={() => handleDeleteSet(set.id)}
              >
                ×
              </button>
            </div>
          ))}

          {/* only renders when this exercise has been logged in at least 2 workouts
              exerciseName prop is passed so the chart knows what data to fetch */}
          {/*<ExerciseChart exerciseName={exercise.name} > */}

          {/* conditional set form — only one exercise can have the form open at a time
              newSet.exerciseId tracks which exercise is currently being added to
              when it matches THIS exercise's id, show the form — otherwise show the button */}
          {newSet.exerciseId === exercise.id ? (
            <form onSubmit={handleAddSet} className={styles.addSetForm}>
              <input
                className={styles.input}
                type="number"
                placeholder="Reps"
                value={newSet.reps}
                onChange={(e) => setNewSet({ ...newSet, reps: e.target.value })}
                required
              />
              <input
                className={styles.input}
                type="number"
                placeholder="Weight (lbs)"
                value={newSet.weight}
                onChange={(e) =>
                  setNewSet({ ...newSet, weight: e.target.value })
                }
                required
              />
              <input
                className={styles.input}
                type="number"
                placeholder="Set #"
                value={newSet.set_number}
                onChange={(e) =>
                  setNewSet({ ...newSet, set_number: e.target.value })
                }
                required
              />
              <button type="submit" className={styles.addBtn}>
                Save
              </button>
              {/* type="button" prevents this from triggering the form's onSubmit */}
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() =>
                  setNewSet({
                    exerciseId: null,
                    reps: "",
                    weight: "",
                    set_number: "",
                  })
                }
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              className={styles.addSetBtn}
              onClick={() => setNewSet({ ...newSet, exerciseId: exercise.id })}
            >
              + Add Set
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
