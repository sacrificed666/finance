import type { ReactNode } from "react";

import styles from "./PageBody.module.scss";

// The blocks of a page under its header, rising into place one after another
const PageBody = ({ children }: { children: ReactNode }) => <div className={styles.body}>{children}</div>;

export default PageBody;
