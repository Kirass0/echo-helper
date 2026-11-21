import styles from './App.module.css';

export interface PurposeLineProps {
  text: string;
  aboutSection: string;
}

/** The line under the tab bar saying what the tab is for, ending in a "How it works" link to About. */
export function PurposeLine({ text, aboutSection }: PurposeLineProps) {
  return (
    <p className={styles.purpose}>
      {text} <a href={`#${aboutSection}`}>How it works</a>
    </p>
  );
}
