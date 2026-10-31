import styles from "./ChartColumn.module.scss";

interface ChartColumnProps {
  x: number;
  w: number;
  y0: number;
  y1: number;
  color: string;
  index?: number;
  rounded?: boolean;
}

// A chart column from y0 up to y1 with round top corners, growing in turn
const ChartColumn = ({ x, w, y0, y1, color, index = 0, rounded = true }: ChartColumnProps) => {
  const h = Math.max(0, y0 - y1);
  if (h < 0.5) return null;
  const r = rounded ? Math.min(4, w / 2, h) : 0;
  const path = `M${String(x)},${String(y0)} L${String(x)},${String(y1 + r)} Q${String(x)},${String(y1)} ${String(x + r)},${String(y1)} L${String(x + w - r)},${String(y1)} Q${String(x + w)},${String(y1)} ${String(x + w)},${String(y1 + r)} L${String(x + w)},${String(y0)} Z`;
  return <path d={path} fill={color} className={styles.bar} style={{ "--i": index }} />;
};

export default ChartColumn;
