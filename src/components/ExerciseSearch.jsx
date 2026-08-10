import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { searchCatalog } from "../api/workouts";
import styles from "../styles/ExerciseSearch.module.css";

// controlled combobox: parent owns the text value, this owns the search/dropdown state.
// value/onChange behave like a normal controlled input; onSelectCatalogItem fires when
// the user picks a real catalog match (item) or confirms the free-text value as a
// custom exercise (null) via the trailing "add as custom" row.
export function ExerciseSearch({ value, onChange, onSelectCatalogItem }) {
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const { token } = useAuth();

  // guards against out-of-order fetch responses when the user types faster
  // than a round trip — only the most recently fired search may apply its results
  const searchIdRef = useRef(0);
  // when a selection sets `value` programmatically (see handleSelectMatch), the
  // effect below would otherwise treat that as new typing and fire a pointless
  // re-search for the name that was just selected. this flag skips that one run.
  const justSelectedRef = useRef(false);

  useEffect(() => {
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }

    // nothing to search — the render below hides the dropdown whenever
    // value is empty regardless of stale isOpen/results, so no setState here
    if (!value.trim()) return;

    const currentId = ++searchIdRef.current;

    const timeoutId = setTimeout(async () => {
      const data = await searchCatalog(token, value);
      // stale response from an earlier keystroke — drop it, including the
      // isOpen flip, so it can't silently reopen a dropdown the user already closed
      if (currentId === searchIdRef.current) {
        setResults(data);
        setIsOpen(true);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [value, token]);

  function handleSelectMatch(item) {
    justSelectedRef.current = true;
    setIsOpen(false);
    onSelectCatalogItem(item);
  }

  function handleConfirmCustom() {
    setIsOpen(false);
    // explicitly re-assert catalogId = null rather than relying on onChange
    // having already cleared it — cheap insurance if that ever changes
    onSelectCatalogItem(null);
  }

  return (
    <div className={styles.wrapper}>
      <input
        className={styles.input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => results.length > 0 && setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        placeholder="Exercise name (e.g. Bench Press)"
        required
      />

      {isOpen && value.trim() && (
        <div className={styles.dropdown}>
          {results.map((item) => (
            <div
              key={item.id}
              className={styles.option}
              // onMouseDown fires (and completes) before the input's onBlur,
              // so the click registers instead of the dropdown closing first
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelectMatch(item);
              }}
            >
              <span className={styles.optionName}>{item.name}</span>
              {item.primary_muscles?.length > 0 && (
                <span className={styles.optionMuscles}>
                  {item.primary_muscles.join(", ")}
                </span>
              )}
            </div>
          ))}

          {results.length === 0 && (
            <p className={styles.noResults}>No matches</p>
          )}

          <div
            className={styles.customOption}
            onMouseDown={(e) => {
              e.preventDefault();
              handleConfirmCustom();
            }}
          >
            + Add &quot;{value}&quot; as a custom exercise
          </div>
        </div>
      )}
    </div>
  );
}
