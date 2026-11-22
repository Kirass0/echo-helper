import { useId, useLayoutEffect, useRef } from 'react';
import { possibleRolls, type SubstatType } from '../core/gameData';
import { formatRate, formatSubstatValue } from '../evaluation/format';
import { SUBSTAT_DISPLAY_ORDER, SUBSTAT_NAMES } from '../evaluation/substats';
import { IconButton } from '../ui/IconButton';
import { CrossIcon } from '../ui/icons';
import { Term } from '../ui/Term';
import {
  addBox,
  addRule,
  removeRule,
  ruleProblem,
  updateRule,
  type RuleDraft,
  type RuleKind,
  type RuleProblem,
  type StageDraft,
  type StrategyDraft,
} from './strategyDraft';
import type { PendingThreshold, ThresholdField } from './examples';
import { SubstatPicker } from './SubstatPicker';
import { STRATEGY_TOOLTIPS } from './termTooltips';
import styles from './StageEditor.module.css';

/** "Tune Stage 2/5 (+10)". */
export const stageName = (tuneStage: number) => `Tune Stage ${tuneStage}/5 (+${tuneStage * 5})`;

const KINDS: readonly [RuleKind, string][] = [
  ['substatCount', 'Substat Count'],
  ['substatRoll', 'Substat Roll'],
  ['echoScore', 'Echo Score'],
  ['targetChance', 'Target Chance'],
];

export interface StageEditorProps {
  draft: StrategyDraft;
  /** Each Tune Stage's Discard Rate, 1/5 first, from the latest results; null before any. */
  discardRates: readonly number[] | null;
  /** Whether the results are from before the last change: the Discard Rates fade with them. */
  stale: boolean;
  /** A loaded example's Top x% thresholds still being worked out: those fields wait, empty. */
  calculating: readonly PendingThreshold[];
  onChange(draft: StrategyDraft): void;
}

/**
 * Where focus goes once the strategy has changed: a new rule's first field, or past a removed rule. `index` is the
 * rule's place among all the rules of its Tune Stage, in reading order.
 */
type FocusAfter =
  | { readonly kind: 'added'; readonly tuneStage: number; readonly index: number }
  | { readonly kind: 'removed'; readonly tuneStage: number; readonly index: number };

/** The five Tune Stages in one column, each with its Discard Rate and its rules (spec §8, "One strategy"). */
export function StageEditor({
  draft,
  discardRates,
  stale,
  calculating,
  onChange,
}: StageEditorProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const focusAfter = useRef<FocusAfter | null>(null);

  // A new rule focuses its first field; a rule's × moves focus to the × of the rule before it in that stage, or to
  // "+ add a rule" once the stage is empty (spec §15).
  useLayoutEffect(() => {
    const after = focusAfter.current;
    focusAfter.current = null;
    const section = listRef.current?.querySelector(`[data-stage="${after?.tuneStage}"]`);
    if (!after || !section) return;
    if (after.kind === 'added') {
      section.querySelectorAll('[data-rule]')[after.index]?.querySelector('select')?.focus();
      return;
    }
    const removes = section.querySelectorAll<HTMLElement>('[data-remove-rule]');
    const target =
      removes[after.index - 1] ?? removes[0] ?? section.querySelector('[data-add-rule]');
    (target as HTMLElement | null)?.focus();
  }, [draft]);

  function change(next: StrategyDraft, after: FocusAfter | null = null) {
    focusAfter.current = after;
    onChange(next);
  }

  return (
    <div ref={listRef} className={styles.stages}>
      {draft.stages.map((boxes, index) => {
        const tuneStage = index + 1;
        return (
          <Stage
            key={tuneStage}
            tuneStage={tuneStage}
            boxes={boxes}
            discardRate={discardRates?.[index] ?? 0}
            stale={stale}
            calculating={calculating}
            onAddBox={() =>
              change(addBox(draft, tuneStage), {
                kind: 'added',
                tuneStage,
                index: boxes.flat().length,
              })
            }
            onAddRule={(box) =>
              change(addRule(draft, tuneStage, box), {
                kind: 'added',
                tuneStage,
                index: flatIndex(boxes, box, boxes[box]?.length ?? 0),
              })
            }
            onRemoveRule={(box, rule) =>
              change(removeRule(draft, tuneStage, box, rule), {
                kind: 'removed',
                tuneStage,
                index: flatIndex(boxes, box, rule),
              })
            }
            onUpdateRule={(box, rule, fields) =>
              change(updateRule(draft, tuneStage, box, rule, fields))
            }
          />
        );
      })}
    </div>
  );
}

/** A rule's place among all the rules of its Tune Stage, in reading order. */
const flatIndex = (boxes: StageDraft, box: number, rule: number) =>
  boxes.slice(0, box).reduce((count, rules) => count + rules.length, 0) + rule;

function Stage({
  tuneStage,
  boxes,
  discardRate,
  stale,
  calculating,
  onAddBox,
  onAddRule,
  onRemoveRule,
  onUpdateRule,
}: {
  tuneStage: number;
  boxes: StageDraft;
  discardRate: number;
  stale: boolean;
  calculating: readonly PendingThreshold[];
  onAddBox(): void;
  onAddRule(box: number): void;
  onRemoveRule(box: number, rule: number): void;
  onUpdateRule(box: number, rule: number, fields: Partial<Omit<RuleDraft, 'id'>>): void;
}) {
  const headingId = useId();
  return (
    <section className={styles.stage} aria-labelledby={headingId} data-stage={tuneStage}>
      <div>
        <h3 id={headingId} className={styles.stageName}>
          <span
            className={styles.dot}
            style={{ background: `var(--st${tuneStage})` }}
            aria-hidden="true"
          />
          {stageName(tuneStage)}
        </h3>
        <div className={stale ? styles.stale : undefined}>
          <div className={styles.discardBar} aria-hidden="true">
            <span style={{ width: `${discardRate * 100}%`, background: `var(--st${tuneStage})` }} />
          </div>
          <span className={styles.small}>
            {discardRate > 0 ? (
              <>
                {formatRate(discardRate)}{' '}
                <Term tooltip={STRATEGY_TOOLTIPS['Discard Rate']}>discarded here</Term>
              </>
            ) : (
              <span className={styles.mute}>nothing discarded</span>
            )}
          </span>
        </div>
      </div>
      <div>
        {boxes.length === 0 ? (
          <button
            type="button"
            className={`${styles.link} ${styles.small}`}
            data-add-rule
            onClick={onAddBox}
          >
            + add a rule
          </button>
        ) : (
          <>
            {boxes.map((rules, box) => (
              // Boxes have no id of their own; their first rule's stands for them.
              <div key={rules[0]?.id ?? box}>
                {box > 0 && <span className={styles.or}>or</span>}
                <div className={styles.box}>
                  {rules.map((rule, index) => (
                    <RuleRow
                      key={rule.id}
                      rule={rule}
                      calculating={calculating
                        .filter(({ ruleId }) => ruleId === rule.id)
                        .map(({ field }) => field)}
                      joined={index > 0}
                      onRemove={() => onRemoveRule(box, index)}
                      onUpdate={(fields) => onUpdateRule(box, index, fields)}
                    />
                  ))}
                  <button
                    type="button"
                    className={`${styles.link} ${styles.small}`}
                    onClick={() => onAddRule(box)}
                  >
                    + and
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              className={`${styles.link} ${styles.small} ${styles.addOr}`}
              onClick={onAddBox}
            >
              + or
            </button>
          </>
        )}
      </div>
    </section>
  );
}

function RuleRow({
  rule,
  calculating,
  joined,
  onRemove,
  onUpdate,
}: {
  rule: RuleDraft;
  /** The fields waiting for a Top x% threshold. */
  calculating: readonly ThresholdField[];
  joined: boolean;
  onRemove(): void;
  onUpdate(fields: Partial<Omit<RuleDraft, 'id'>>): void;
}) {
  // A rule waiting for its thresholds isn't unfinished: they come by themselves.
  const problem = calculating.length > 0 ? null : ruleProblem(rule);
  const problemId = useId();
  const describedBy = (field: RuleProblem['field']) =>
    problem?.field === field ? problemId : undefined;
  const invalid = (field: RuleProblem['field']) => problem?.field === field && problem.invalid;

  const numberInput = (
    label: string,
    field: 'echoScore' | 'chance' | 'targetScore',
    text: string,
    key: 'echoScoreText' | 'chanceText' | 'targetScoreText',
  ) =>
    calculating.includes(key as ThresholdField) ? (
      // Empty and faded until the threshold is worked out; "Calculating…" is never announced (spec §15).
      <span className={styles.calculating}>
        <input className={styles.number} aria-label={label} value="" disabled />
        <span aria-hidden="true">Calculating…</span>
      </span>
    ) : (
      <input
        className={styles.number}
        inputMode="decimal"
        aria-label={label}
        aria-invalid={invalid(field) || undefined}
        aria-describedby={describedBy(field)}
        value={text}
        onChange={(event) => onUpdate({ [key]: event.target.value })}
      />
    );

  let phrase;
  switch (rule.kind) {
    case 'substatCount':
      phrase = (
        <>
          at least{' '}
          <select
            aria-label="How many"
            value={rule.count}
            onChange={(event) => onUpdate({ count: Number(event.target.value) })}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>{' '}
          of{' '}
          <SubstatPicker
            picked={rule.substatTypes}
            onChange={(substatTypes) => onUpdate({ substatTypes })}
            describedBy={describedBy('substatTypes')}
          />
        </>
      );
      break;
    case 'substatRoll':
      phrase = (
        <>
          <select
            aria-label="Substat"
            value={rule.substatType}
            onChange={(event) => onUpdate({ substatType: event.target.value as SubstatType })}
          >
            {SUBSTAT_DISPLAY_ORDER.map((type) => (
              <option key={type} value={type}>
                {SUBSTAT_NAMES[type]}
              </option>
            ))}
          </select>{' '}
          at least{' '}
          <select
            aria-label="Lowest value"
            value={rule.minValue}
            onChange={(event) => onUpdate({ minValue: Number(event.target.value) })}
          >
            {possibleRolls(rule.substatType).map(({ value }) => (
              <option key={value} value={value}>
                {formatSubstatValue(rule.substatType, value)}
              </option>
            ))}
          </select>
        </>
      );
      break;
    case 'echoScore':
      phrase = (
        <>at least {numberInput('Echo Score', 'echoScore', rule.echoScoreText, 'echoScoreText')}</>
      );
      break;
    case 'targetChance':
      phrase = (
        <>
          at least {numberInput('Chance in %', 'chance', rule.chanceText, 'chanceText')}% chance to
          reach a Target Score of{' '}
          {numberInput('Target Score', 'targetScore', rule.targetScoreText, 'targetScoreText')}
        </>
      );
      break;
  }

  return (
    <div className={`${styles.rule} ${problem ? styles.unfinished : ''}`} data-rule>
      {joined && <span className={styles.and}>and</span>}
      <select
        aria-label="Kind of rule"
        value={rule.kind}
        onChange={(event) => onUpdate({ kind: event.target.value as RuleKind })}
      >
        {KINDS.map(([kind, label]) => (
          <option key={kind} value={kind}>
            {label}
          </option>
        ))}
      </select>{' '}
      {phrase}
      <IconButton
        label="Remove this rule"
        icon={<CrossIcon />}
        danger
        data-remove-rule
        onClick={onRemove}
      />
      {problem && (
        <span id={problemId} className={styles.problem}>
          {problem.message}
        </span>
      )}
    </div>
  );
}
