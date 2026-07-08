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
import { ExerciseChart } from "../components/ExerciseChart";

export function WorkoutDetail() {
  // workout — single object containing { id, name, date, exercises: [] }
  // starts null because we haven't fetched yet
  const [workout, setWorkout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // exerciseName — controlled input for adding a new exercise
  const [exerciseName, setExerciseName] = useState("");

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
      await createExercise(token, id, exerciseName);
      // refetch so the new exercise appears immediately
      await fetchWorkout();
      // clear the input
      setExerciseName("");
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
      await createSet(
        token,
        newSet.exerciseId,
        newSet.reps,
        newSet.weight,
        newSet.set_number,
      );
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
    <div>
      <button onClick={() => navigate("/workouts")}>← Back</button>

      {/* workout header */}
      <h1>{workout.name}</h1>
      <p>{workout.date}</p>
      <button onClick={handleDeleteWorkout}>Delete Workout</button>

      {/* add exercise form */}
      <form onSubmit={handleAddExercise}>
        <input
          value={exerciseName}
          onChange={(e) => setExerciseName(e.target.value)}
          placeholder="Exercise name (e.g. Bench Press)"
          required
        />
        <button type="submit" disabled={!exerciseName}>
          Add Exercise
        </button>
      </form>

      {/* exercise list — workout.exercises comes from the JOIN query on the server */}
      {workout.exercises.length === 0 && <p>No exercises yet.</p>}

      {workout.exercises.map((exercise) => (
        <div key={exercise.id}>
          <h3>{exercise.name}</h3>
          <button onClick={() => handleDeleteExercise(exercise.id)}>
            Delete Exercise
          </button>

          {/* sets for this exercise */}
          {exercise.sets.length === 0 && <p>No sets yet.</p>}

          {exercise.sets.map((set) => (
            <div key={set.id}>
              {/* set data comes from the sets table via the JOIN */}
              <span>Set {set.set_number}</span>
              <span>{set.reps} reps</span>
              <span>{set.weight}kg</span>
              <button onClick={() => handleDeleteSet(set.id)}>×</button>
            </div>
          ))}

          {/* progress chart — only shows if exercise has been logged at least twice */}
          <ExerciseChart exerciseName={exercise.name} />

          {/* add set form — clicking "Add Set" on an exercise sets exerciseId */}
          {newSet.exerciseId === exercise.id ? (
            // form is open for THIS exercise
            <form onSubmit={handleAddSet}>
              <input
                type="number"
                placeholder="Reps"
                value={newSet.reps}
                onChange={(e) => setNewSet({ ...newSet, reps: e.target.value })}
                required
              />
              <input
                type="number"
                placeholder="Weight (kg)"
                value={newSet.weight}
                onChange={(e) =>
                  setNewSet({ ...newSet, weight: e.target.value })
                }
                required
              />
              <input
                type="number"
                placeholder="Set number"
                value={newSet.set_number}
                onChange={(e) =>
                  setNewSet({ ...newSet, set_number: e.target.value })
                }
                required
              />
              <button type="submit">Save Set</button>
              {/* cancel — close the form without saving */}
              <button
                type="button"
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
            // form is closed — show the "Add Set" button instead
            // clicking it sets exerciseId to THIS exercise's id, opening the form
            <button
              onClick={() => setNewSet({ ...newSet, exerciseId: exercise.id })}
            >
              Add Set
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
