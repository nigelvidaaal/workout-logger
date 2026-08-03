import { getFill } from "../utils/muscleFill";

// non-interactive background silhouette — same for both views, purely for context.
// plain shapes (circle/rect), not an anatomically traced path — no illustration skill needed.
const SILHOUETTE = [
  { shape: "circle", cx: 100, cy: 28, r: 18 }, // head
  { shape: "rect", x: 92, y: 44, width: 16, height: 12, rx: 4 }, // neck
  { shape: "rect", x: 68, y: 55, width: 64, height: 115, rx: 18 }, // torso
  { shape: "rect", x: 38, y: 60, width: 22, height: 60, rx: 10 }, // left upper arm
  { shape: "rect", x: 35, y: 118, width: 20, height: 55, rx: 9 }, // left forearm
  { shape: "rect", x: 140, y: 60, width: 22, height: 60, rx: 10 }, // right upper arm
  { shape: "rect", x: 145, y: 118, width: 20, height: 55, rx: 9 }, // right forearm
  { shape: "rect", x: 72, y: 168, width: 26, height: 70, rx: 12 }, // left thigh
  { shape: "rect", x: 102, y: 168, width: 26, height: 70, rx: 12 }, // right thigh
  { shape: "rect", x: 74, y: 236, width: 22, height: 65, rx: 10 }, // left shin
  { shape: "rect", x: 104, y: 236, width: 22, height: 65, rx: 10 }, // right shin
];

// colorable regions per view — each points at a muscle_group key.
// "shoulders" and "calves" appear in both arrays but share the same key,
// so they automatically pick up the same computed intensity below.
const FRONT_REGIONS = [
  { group: "shoulders", shape: "ellipse", cx: 52, cy: 66, rx: 16, ry: 13 },
  { group: "shoulders", shape: "ellipse", cx: 148, cy: 66, rx: 16, ry: 13 },
  { group: "chest", shape: "rect", x: 76, y: 62, width: 48, height: 28, rx: 8 },
  { group: "biceps", shape: "rect", x: 40, y: 72, width: 18, height: 32, rx: 7 },
  { group: "biceps", shape: "rect", x: 142, y: 72, width: 18, height: 32, rx: 7 },
  { group: "abs", shape: "rect", x: 80, y: 96, width: 40, height: 58, rx: 8 },
  { group: "quads", shape: "rect", x: 74, y: 172, width: 22, height: 62, rx: 10 },
  { group: "quads", shape: "rect", x: 104, y: 172, width: 22, height: 62, rx: 10 },
  { group: "calves", shape: "rect", x: 76, y: 240, width: 18, height: 56, rx: 8 },
  { group: "calves", shape: "rect", x: 106, y: 240, width: 18, height: 56, rx: 8 },
];

const BACK_REGIONS = [
  { group: "shoulders", shape: "ellipse", cx: 52, cy: 66, rx: 16, ry: 13 },
  { group: "shoulders", shape: "ellipse", cx: 148, cy: 66, rx: 16, ry: 13 },
  { group: "back", shape: "rect", x: 74, y: 60, width: 52, height: 70, rx: 10 },
  { group: "triceps", shape: "rect", x: 40, y: 72, width: 18, height: 32, rx: 7 },
  { group: "triceps", shape: "rect", x: 142, y: 72, width: 18, height: 32, rx: 7 },
  { group: "glutes", shape: "rect", x: 72, y: 166, width: 56, height: 26, rx: 12 },
  { group: "hamstrings", shape: "rect", x: 74, y: 196, width: 22, height: 38, rx: 9 },
  { group: "hamstrings", shape: "rect", x: 104, y: 196, width: 22, height: 38, rx: 9 },
  { group: "calves", shape: "rect", x: 76, y: 240, width: 18, height: 56, rx: 8 },
  { group: "calves", shape: "rect", x: 106, y: 240, width: 18, height: 56, rx: 8 },
];

export function MuscleBodyChart({ view, intensityByGroup }) {
  const regions = view === "back" ? BACK_REGIONS : FRONT_REGIONS;

  return (
    <svg viewBox="0 0 200 340" width="100%" height="100%" role="img" aria-label={`Muscle training volume, ${view} view`}>
      {SILHOUETTE.map((s, i) =>
        s.shape === "circle" ? (
          <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="var(--bg-card)" stroke="var(--border)" />
        ) : (
          <rect
            key={i}
            x={s.x}
            y={s.y}
            width={s.width}
            height={s.height}
            rx={s.rx}
            fill="var(--bg-card)"
            stroke="var(--border)"
          />
        )
      )}

      {regions.map((r, i) =>
        r.shape === "ellipse" ? (
          <ellipse
            key={i}
            data-muscle-group={r.group}
            cx={r.cx}
            cy={r.cy}
            rx={r.rx}
            ry={r.ry}
            style={{ fill: getFill(r.group, intensityByGroup) }}
          />
        ) : (
          <rect
            key={i}
            data-muscle-group={r.group}
            x={r.x}
            y={r.y}
            width={r.width}
            height={r.height}
            rx={r.rx}
            style={{ fill: getFill(r.group, intensityByGroup) }}
          />
        )
      )}
    </svg>
  );
}
