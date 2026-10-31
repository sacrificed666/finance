import styles from "./Slider.module.scss";

interface SliderProps {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  label?: string;
}

// A range slider whose track fills with the accent up to the thumb
const Slider = ({ min, max, step = 1, value, onChange, label }: SliderProps) => {
  const filled = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <input
      type="range"
      className={styles.slider}
      min={min}
      max={max}
      step={step}
      value={value}
      aria-label={label}
      onChange={(event) => onChange(Number(event.target.value))}
      style={{ "--fill": `${String(filled)}%` }}
    />
  );
};

export default Slider;
