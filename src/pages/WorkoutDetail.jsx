import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MoreHorizontal, Check } from "lucide-react";
import {
  getWorkout,
  deleteWorkout,
  renameWorkout,
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
import { ConfirmModal } from "../components/ConfirmModal";
import { MUSCLE_GROUPS } from "../constants/muscleGroups";

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
  // for custom exercises made by user
  const [muscleGroup, setMuscleGroup] = useState("");

  // links to catalogIg and verifies that there should be an input
  const isCustomExercise = catalogId === null && exerciseName.trim() !== "";

  // isEditing — toggles the workout name between display (<h1>) and edit (input) mode
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState("");

  // confetti effect when hitting a PR
  const [celebration, setCelebration] = useState(null);

  // CLAUDE CODE — exercise-card redesign: the old always-visible "Delete"
  // text button on every card is now tucked behind a "..." menu (matches
  // Nigel's reference). openMenuId tracks which exercise's menu is open (an
  // id, or null) — only one at a time. confirmingDeleteExercise holds the
  // {id, name} pending confirmation once "Delete Exercise" is tapped in that
  // menu; reuses the same ConfirmModal built for the logout confirmation.
  const [openMenuId, setOpenMenuId] = useState(null);
  const [confirmingDeleteExercise, setConfirmingDeleteExercise] =
    useState(null);

  // close the open exercise menu on any click outside it — checks for the
  // data-exercise-menu marker (see the JSX below) rather than a ref, since
  // this lives inside a .map() and a plain ref would only ever point at
  // whichever card rendered last
  useEffect(() => {
    if (openMenuId === null) return;
    function handleClickOutside(e) {
      if (!e.target.closest("[data-exercise-menu]")) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openMenuId]);

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

  function handleStartEdit() {
    setEditedName(workout.name);
    setIsEditing(true);
  }

  function handleCancelEdit() {
    // no need to reset editedName — it's re-seeded from workout.name next time
    setIsEditing(false);
  }

  async function handleSaveRename() {
    try {
      await renameWorkout(token, id, editedName);
      // refetch rather than merge the PATCH response locally — same pattern as
      // every other mutation in this file, and the response has no `exercises`
      // field anyway so a manual merge would still need this refetch
      await fetchWorkout();
      setIsEditing(false);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAddExercise(e) {
    e.preventDefault();
    try {
      // create the exercise — workout.id tells the server which workout it belongs to
      await createExercise(
        token,
        id,
        exerciseName,
        catalogId,
        isCustomExercise ? muscleGroup : null,
      );
      // refetch so the new exercise appears immediately
      await fetchWorkout();
      // clear the inputs
      setExerciseName("");
      setCatalogId(null);
      setMuscleGroup("");
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

  // CLAUDE CODE — "repeating sets" (punch list): opens the add-set form for
  // an exercise pre-filled from that exercise's own last set, instead of
  // always starting blank. Most sets on the same exercise use the same
  // reps/weight as the one before it (3 sets of the same bench press weight,
  // for example) — this means tapping Save is usually enough, no retyping.
  // exercise.sets is already ordered by set_number ASC (see the server's
  // /:id query), so the last element is the most recently added set.
  // set_number auto-increments too — you're always adding the NEXT set.
  // A brand-new exercise with no sets yet still opens fully blank, same as
  // before, since there's nothing to repeat from.
  function handleOpenAddSet(exercise) {
    const lastSet = exercise.sets[exercise.sets.length - 1];
    setNewSet({
      exerciseId: exercise.id,
      reps: lastSet ? String(lastSet.reps) : "",
      weight: lastSet ? String(lastSet.weight) : "",
      set_number: lastSet ? String(lastSet.set_number + 1) : "1",
    });
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
          {isEditing ? (
            <div className={styles.renameRow}>
              <div className={styles.renameInputWrap}>
                <input
                  className={styles.renameInput}
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onKeyDown={(e) => {
                    // no visible Cancel button anymore (see CSS comment) —
                    // Escape still backs out, Enter still confirms, same as
                    // before, just off the keyboard instead of a click
                    if (e.key === "Escape") handleCancelEdit();
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSaveRename();
                    }
                  }}
                  autoFocus
                />
                <span className={styles.renameInputIcon} aria-hidden="true">
                  ✎
                </span>
              </div>
              <button
                type="button"
                className={styles.confirmRenameBtn}
                onClick={handleSaveRename}
                disabled={!editedName.trim()}
                aria-label="Save workout name"
              >
                ✓
              </button>
            </div>
          ) : (
            <div className={styles.nameRow}>
              <h1>{workout.name}</h1>
              <button
                type="button"
                className={styles.editBtn}
                onClick={handleStartEdit}
                aria-label="Rename workout"
              >
                ✎
              </button>
            </div>
          )}
          <p>
            {workout.date
              ? new Date(workout.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
              : "Saved Workout (no date until logged)"}
          </p>
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
              setMuscleGroup("");
            } else {
              // "add as custom" — keep the typed name, explicitly confirm no catalog link
              setCatalogId(null);
            }
          }}
        />
        {isCustomExercise && (
          <select
            className={styles.muscleGroupSelect}
            value={muscleGroup}
            onChange={(e) => setMuscleGroup(e.target.value)}
            required
            aria-label="Muscle group"
          >
            <option value="" disabled>
              Muscle group…
            </option>
            {MUSCLE_GROUPS.map((group) => (
              <option key={group.value} value={group.value}>
                {group.label}
              </option>
            ))}
          </select>
        )}
        {/* disabled until a name is entered, and — for a custom exercise —
            until a muscle group is picked too */}
        <button
          type="submit"
          className={styles.addBtn}
          disabled={!exerciseName || (isCustomExercise && !muscleGroup)}
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
            <div className={styles.exerciseTitleWrap}>
              <h3 className={styles.exerciseName}>{exercise.name}</h3>
              {/* CLAUDE CODE — muscle_group is now populated for EVERY
                  exercise (custom or catalog — see the server's GET /:id),
                  equipment only ever for a catalog one. Either tag is
                  simply omitted rather than shown empty/fake when its data
                  isn't there (e.g. a custom exercise never has equipment). */}
              {(exercise.muscle_group || exercise.equipment) && (
                <div className={styles.tagRow}>
                  {exercise.muscle_group && (
                    <span className={styles.tag}>{exercise.muscle_group}</span>
                  )}
                  {exercise.equipment && (
                    <span className={styles.tag}>{exercise.equipment}</span>
                  )}
                </div>
              )}
            </div>
            <div className={styles.menuWrap} data-exercise-menu>
              <button
                type="button"
                className={styles.menuBtn}
                onClick={() =>
                  setOpenMenuId(openMenuId === exercise.id ? null : exercise.id)
                }
                aria-label="Exercise options"
              >
                <MoreHorizontal size={18} strokeWidth={2} />
              </button>
              {openMenuId === exercise.id && (
                <div className={styles.menuDropdown}>
                  <button
                    type="button"
                    className={`${styles.menuItem} ${styles.menuItemDanger}`}
                    onClick={() => {
                      setOpenMenuId(null);
                      setConfirmingDeleteExercise({
                        id: exercise.id,
                        name: exercise.name,
                      });
                    }}
                  >
                    Delete Exercise
                  </button>
                </div>
              )}
            </div>
          </div>

          {exercise.sets.length === 0 && (
            <p className={styles.emptyMessage}>No sets yet.</p>
          )}

          {/* CLAUDE CODE — set rows redesigned to match Nigel's reference:
              a numbered badge, reps/weight as their own boxed fields, and a
              checkmark badge in the app's accent color instead of the
              reference's green (explicitly asked for). The checkmark is
              NOT a button — every set rendered here already exists in the
              database, so it's always "logged" by definition; there's no
              draft/unconfirmed state in this app's data model the way the
              reference's 3rd row implies, so making it clickable would be a
              button that does nothing. Delete still needs to live
              somewhere, so a small muted × sits after the checkmark —
              not in the reference image, but the only way to remove a
              mis-entered set, so it stays. */}
          {exercise.sets.map((set) => (
            <div key={set.id} className={styles.setRow}>
              <span className={styles.setNumberBadge}>{set.set_number}</span>
              <div className={styles.setValueBox}>
                <span className={styles.setValueNum}>{set.reps}</span>
                <span className={styles.setValueUnit}>reps</span>
              </div>
              {/* weight stored as REAL — supports decimals like 22.5kg */}
              <div className={styles.setValueBox}>
                <span className={styles.setValueNum}>{set.weight}</span>
                <span className={styles.setValueUnit}>lbs</span>
              </div>
              <span className={styles.setCheck} aria-label="Set logged">
                <Check size={15} strokeWidth={3} />
              </span>
              <button
                type="button"
                className={styles.setDeleteBtn}
                onClick={() => handleDeleteSet(set.id)}
                aria-label="Delete set"
              >
                ×
              </button>
            </div>
          ))}
          {/* templates hold exercises only, never sets, sets belong to a
              specific dated session, and a template has no date.*/}
          {workout.is_template ? (
            <p className={styles.emptyMessage}>
              Sets aren't logged on saved workouts — use "Set as Workout for
              Today" from the list to start logging.
            </p>
          ) : /* conditional set form — only one exercise can have the form open at a time
              newSet.exerciseId tracks which exercise is currently being added to
              when it matches THIS exercise's id, show the form — otherwise show the button */
          newSet.exerciseId === exercise.id ? (
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
              onClick={() => handleOpenAddSet(exercise)}
            >
              + Add Set
            </button>
          )}
        </div>
      ))}

      {confirmingDeleteExercise && (
        <ConfirmModal
          title="Delete exercise?"
          message={`"${confirmingDeleteExercise.name}" and all of its logged sets will be gone for good.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          danger
          onConfirm={() => {
            handleDeleteExercise(confirmingDeleteExercise.id);
            setConfirmingDeleteExercise(null);
          }}
          onCancel={() => setConfirmingDeleteExercise(null)}
        />
      )}
    </div>
  );
}
