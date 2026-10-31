"use client";

import { useEffect, useState, type MouseEvent } from "react";

import styles from "./SectionNav.module.scss";

export interface Section {
  id: string;
  label: string;
}

interface SectionNavProps {
  label: string;
  sections: readonly Section[];
}

// Whether the person asked for less motion
const still = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Chips that jump to a page's sections and mark the one being read
const SectionNav = ({ label, sections }: SectionNavProps) => {
  const [current, setCurrent] = useState(sections[0]?.id);
  const ids = sections.map((section) => section.id).join(" ");

  // Follows the section in the reading band of the screen as the page scrolls
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const seen = entries.find((entry) => entry.isIntersecting);
        if (seen) setCurrent(seen.target.id);
      },
      { rootMargin: "-25% 0px -65% 0px" },
    );
    for (const id of ids.split(" ")) {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [ids]);

  // Glides to a section and keeps its address, so the link can be shared
  const jump = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: still() ? "auto" : "smooth", block: "start" });
    window.history.replaceState(null, "", `#${id}`);
    setCurrent(id);
  };

  return (
    <nav aria-label={label} className={styles.nav}>
      <ul className={styles.list}>
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              aria-current={current === section.id ? "location" : undefined}
              onClick={(event) => jump(event, section.id)}
              className={styles.chip}
            >
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default SectionNav;
