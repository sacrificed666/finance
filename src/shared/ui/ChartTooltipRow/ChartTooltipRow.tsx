import styles from "./ChartTooltipRow.module.scss";

interface ChartTooltipRowProps {
  color?: string;
  label: string;
  value: string;
}

// One line of a chart tooltip: the series' colour, its name and its value
const ChartTooltipRow = ({ color, label, value }: ChartTooltipRowProps) => (
  <div className={styles.row}>
    <span className={styles.label}>
      {color && <span aria-hidden className={styles.swatch} style={{ background: color }} />}
      {label}
    </span>
    <span className={styles.value}>{value}</span>
  </div>
);

export default ChartTooltipRow;
