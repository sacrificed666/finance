import styles from "./HealthCard.module.scss";

interface ScoreRingProps {
  score: number;
  tone: string;
}

// The ring's radius and length in the SVG's units
const RADIUS = 42;
const LENGTH = 2 * Math.PI * RADIUS;

// A score out of a hundred drawn as a ring in the grade's colour
const ScoreRing = ({ score, tone }: ScoreRingProps) => {
  const dash = (Math.max(0, Math.min(100, score)) / 100) * LENGTH;
  return (
    <span className={styles.ring}>
      <span className={styles.hidden}>{`${String(score)}/100`}</span>
      <svg aria-hidden width={108} height={108} viewBox="0 0 108 108">
        <circle cx={54} cy={54} r={RADIUS} fill="none" stroke="var(--color-fill)" strokeWidth={10} />
        <circle
          cx={54}
          cy={54}
          r={RADIUS}
          fill="none"
          stroke={tone}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={`${String(dash)} ${String(LENGTH - dash)}`}
          transform="rotate(-90 54 54)"
          className={styles.arc}
        />
        <text
          x={54}
          y={54}
          textAnchor="middle"
          dominantBaseline="central"
          className={styles.score}
          fontSize={28}
          fontWeight={800}
        >
          {score}
        </text>
      </svg>
    </span>
  );
};

export default ScoreRing;
