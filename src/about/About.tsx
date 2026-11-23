import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { subscribeToHash } from '../app/useHashTab';
import { currentSection } from './currentSection';
import { ABOUT_SECTIONS } from './sections';
import { usePhoneLayout } from '../ui/usePhoneLayout';
import styles from './About.module.css';

/** The index of the section the URL hash points to, or null. */
function useLinkedSection(): number | null {
  const hash = useSyncExternalStore(
    subscribeToHash,
    () => window.location.hash,
    () => '',
  );
  const index = ABOUT_SECTIONS.findIndex((section) => `#${section.id}` === hash);
  return index === -1 ? null : index;
}

// A section counts as reached once its top is this close to the top of the viewport, in px.
const REACHED = 80;

const reducedMotion = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * The About tab (spec §9): seven sections, each at its `#about-<section>` anchor. On desktop a sticky side panel lists
 * them and marks the current one; on a phone they are an accordion, and a link to a section opens it.
 */
export function About() {
  const phone = usePhoneLayout();
  const linked = useLinkedSection();
  // Where the scroll last put the mark, and for which link: a new link marks its own section until the next scroll.
  const [scrolled, setScrolled] = useState<{ linked: number | null; index: number } | null>(null);
  const current = scrolled?.linked === linked ? scrolled.index : (linked ?? 0);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  // A link to a section scrolls to it, opening it on a phone; plain #about starts at the top.
  useEffect(() => {
    if (linked === null) {
      if (window.scrollY > 0) window.scrollTo(0, 0);
      return;
    }
    const element = sectionRefs.current[linked];
    if (!element) return;
    if (element instanceof HTMLDetailsElement) element.open = true;
    element.scrollIntoView?.({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
  }, [linked]);

  // The side panel follows the scroll.
  useEffect(() => {
    if (phone) return;
    function follow() {
      const tops = sectionRefs.current.map((element) => element?.getBoundingClientRect().top ?? 0);
      const root = document.documentElement;
      const index = currentSection(tops, {
        threshold: REACHED,
        viewportHeight: window.innerHeight,
        atBottom: window.scrollY + window.innerHeight >= root.scrollHeight - 2,
        linked,
      });
      setScrolled((last) =>
        last?.linked === linked && last.index === index ? last : { linked, index },
      );
    }
    window.addEventListener('scroll', follow, { passive: true });
    window.addEventListener('resize', follow);
    return () => {
      window.removeEventListener('scroll', follow);
      window.removeEventListener('resize', follow);
    };
  }, [phone, linked]);

  if (phone)
    return (
      <div className={styles.about}>
        {ABOUT_SECTIONS.map((section, index) => (
          <details
            key={section.id}
            id={section.id}
            className={styles.fold}
            ref={(element) => {
              sectionRefs.current[index] = element;
            }}
          >
            <summary>{section.title}</summary>
            <div className={styles.body}>{section.body}</div>
          </details>
        ))}
      </div>
    );

  return (
    <div className={styles.grid}>
      <nav className={styles.panel} aria-label="About sections">
        {ABOUT_SECTIONS.map((section, index) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            aria-current={index === current ? 'true' : undefined}
          >
            {section.title}
          </a>
        ))}
      </nav>
      <div className={styles.about}>
        {ABOUT_SECTIONS.map((section, index) => (
          <section
            key={section.id}
            id={section.id}
            className={styles.section}
            aria-labelledby={`${section.id}-title`}
            ref={(element) => {
              sectionRefs.current[index] = element;
            }}
          >
            <h2 id={`${section.id}-title`}>{section.title}</h2>
            {section.body}
          </section>
        ))}
      </div>
    </div>
  );
}
