import Body from "react-muscle-highlighter";
import { buildMuscleHighlighterData } from "../utils/buildMuscleHighlighterData";
import styles from "../styles/MuscleBodyChart.module.css";

// Renders the actual anatomical body diagram. react-muscle-highlighter's
//  this component's only job is handing it colored muscle data in the shape it expects. See
// buildMuscleHighlighterData.js for how this app's tonnage-derived intensity gets
// turned into that shape.
export function MuscleBodyChart({ view, intensityByGroup }) {
  const data = buildMuscleHighlighterData(intensityByGroup);

  return (
    <div className={styles.wrap}>
      <Body
        data={data}
        side={view}
        gender="male"
        defaultFill="var(--bg-card)"
        border="var(--border)"
      />
    </div>
  );
}
