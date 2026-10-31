import styles from "./Backdrop.module.scss";

// An aurora of lime and the page's colour, a dot grid that fades out
const Backdrop = () => (
  <div className={styles.backdrop} aria-hidden="true">
    <div className={styles.glow} />
    <div className={styles.grid} />
  </div>
);

export default Backdrop;
