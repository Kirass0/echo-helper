import { stageName } from './StageEditor';

/** What the results say while a rule is unfinished, naming the first Tune Stage holding one. */
export const unfinishedMessage = (stage: number) =>
  `Results are from before your last change. Finish the highlighted rule at ${stageName(stage)} to update them.`;
