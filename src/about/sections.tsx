import type { ReactNode } from 'react';
import { referenceRoll } from '../core/gameData';
import { formatEchoScore, formatSubstatValue } from '../evaluation/format';
import { SUBSTAT_DISPLAY_ORDER, SUBSTAT_NAMES } from '../evaluation/substats';
import styles from './About.module.css';

export interface AboutSection {
  /** Its anchor, `about-<section>`: the target of "How it works" links. */
  id: `about-${string}`;
  title: string;
  body: ReactNode;
}

const REPO = 'https://github.com/Kirass0/echo-helper';

/** A link that leaves the app, opened in a new tab. */
function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

// The worked example (spec §9): Crit Rate 8.1 at weight W adds W × 8.1 / 7.5.
const EXAMPLE_VALUE = 8.1;
const EXAMPLE_WEIGHT = 2;
const CRIT_RATE_ROLL = referenceRoll('Critical_Rate');

/** The seven About sections, in order (spec §9). */
export const ABOUT_SECTIONS: readonly AboutSection[] = [
  {
    id: 'about-what-echo-helper-does',
    title: 'What Echo Helper does',
    body: (
      <>
        <p>
          Echo Helper helps you decide which Echoes are worth tuning in Wuthering Waves.{' '}
          <strong>Echo Evaluation</strong> shows how good an Echo is for a Resonator, and how likely
          it is to reach the Echo Score you want once fully tuned. <strong>Upgrade Strategy</strong>{' '}
          works out, for rules about which Echoes you keep tuning at each Tune Stage, how many
          Echoes are discarded and what one Successful Echo costs on average.
        </p>
      </>
    ),
  },
  {
    id: 'about-evaluating-an-echo',
    title: 'Evaluating an Echo',
    body: (
      <>
        <ol>
          <li>
            Pick a Substat Weight Table for your Resonator under “Substat Weight Tables”. You can
            list several; click or tap a row to put its table in focus, and the results above show
            that table.
          </li>
          <li>
            Under “Your Echo”, enter the Substats the Echo has revealed so far, from +5 up to +25.
          </li>
          <li>
            Set a Target Score, the Echo Score you aim for, in the table’s row. If you want an Echo
            that also has Energy Regen, set an ER Target Score as well. Each table keeps its own
            targets.
          </li>
        </ol>
        <p>
          Every result updates as you type. Results are calculated exactly, over every way the
          remaining tunes can turn out, not by tuning random Echoes.
        </p>
        <dl className={styles.terms}>
          <dt>Target Chance</dt>
          <dd>
            The chance that this Echo, once fully tuned, reaches your Target Score. At 5/5 it reads
            Reached or Not reached instead.
          </dd>
          <dt>ER Target Chance</dt>
          <dd>
            The chance that this Echo, once fully tuned, has Energy Regen and reaches your ER Target
            Score. It reads “No Energy Regen” when it can’t apply.
          </dd>
          <dt>Echo Score</dt>
          <dd>The Echo Score of the Substats revealed so far.</dd>
          <dt>Top Percent</dt>
          <dd>
            The share of all fully tuned Echoes with a higher Echo Score than this one has now. Top
            5% means only 1 in 20 is better.
          </dd>
          <dt>ER Top Percent</dt>
          <dd>
            The share of all fully tuned Echoes that have Energy Regen and a higher Echo Score than
            this one has now.
          </dd>
          <dt>Median, Average and Best Echo Score</dt>
          <dd>
            Where this Echo’s final Echo Score lands once fully tuned: the middle outcome, the
            average and the highest possible. At 5/5 they are its final Echo Score.
          </dd>
        </dl>
        <p>
          <strong>The Echo distribution chart</strong> shows where this Echo’s final Echo Score may
          end up, for every listed table at once. Across is the Final Echo Score; up is the chance
          per band. The range from the lowest to the highest possible final Echo Score of all the
          listed tables, and their targets, is cut into 60 equal bands, the same for every table, so
          the curves can be compared. Each point is the chance that the final Echo Score falls in
          that band. The table in focus is drawn in colour and filled, the other tables as grey
          lines. Its Target Score is the dashed line and its ER Target Score the dotted one.
        </p>
      </>
    ),
  },
  {
    id: 'about-echo-score-and-reference-rolls',
    title: 'Echo Score and Reference Rolls',
    body: (
      <>
        <p>
          An Echo Score adds up an Echo’s Substats, each counted by its weight in the Substat Weight
          Table:
        </p>
        <p className={styles.formula}>Echo Score = Σ weight × value / Reference Roll</p>
        <p>
          A <strong>Reference Roll</strong> is the size of a typical roll of a Substat type: its
          chance-weighted median roll, the lowest of its possible values that a roll has at least a
          50% chance to be at or below. Dividing by it counts each Substat in typical rolls, so
          Substats that roll in different sizes can be compared, and a weight is the worth of one
          Reference Roll.
        </p>
        <p>
          For example, Crit Rate {EXAMPLE_VALUE}% at weight W adds W × {EXAMPLE_VALUE} /{' '}
          {CRIT_RATE_ROLL} to the Echo Score: at weight {EXAMPLE_WEIGHT}, that is{' '}
          {formatEchoScore((EXAMPLE_WEIGHT * EXAMPLE_VALUE) / CRIT_RATE_ROLL)}.
        </p>
        <table className={styles.rolls}>
          <thead>
            <tr>
              <th scope="col">Substat</th>
              <th scope="col">Reference Roll</th>
            </tr>
          </thead>
          <tbody>
            {SUBSTAT_DISPLAY_ORDER.map((type) => (
              <tr key={type}>
                <td>{SUBSTAT_NAMES[type]}</td>
                <td>{formatSubstatValue(type, referenceRoll(type))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    ),
  },
  {
    id: 'about-substat-weight-tables',
    title: 'Substat Weight Tables',
    body: (
      <>
        <p>
          A Substat Weight Table says how much one Reference Roll of each Substat is worth for a
          Resonator. A Built-in table is a baseline for one team, rotation and setup, not the
          correct answer for every build. If yours differs, open the table’s weights with its
          sliders button and duplicate it to make your own.
        </p>
        <p>
          <strong>How the weights are worked out.</strong> A weight is the average gain in a full
          rotation’s damage from one Reference Roll of that Substat, with team buffs and the enemy’s
          resistances included. For every number of useful Substat lines a build can have, the best
          spread of those lines is found, with at most 5 lines of one Substat since a build has 5
          Echoes. At each, the gain from one more roll of each Substat is measured, and the gains
          are averaged, so a weight is the Substat’s worth over the whole build-up, from no Substats
          to a finished build. Energy Regen is left out: the rotation’s Energy needs are met by a
          fixed number of Energy Regen lines.
        </p>
        <p>
          <strong>Crit Rate.</strong> The Crit Rate weight is the worth of one roll while Crit Rate
          is below 100%. Crit Rate past 100% is worth nothing.
        </p>
        <p>
          <strong>Notes on some tables.</strong>
        </p>
        <ul>
          <li>
            Jingran: the HP weights are 0, because the HP bonus caps at 50,000 HP, which is normally
            easy to reach.
          </li>
          <li>
            Sigrika: keeps an Energy Regen weight (2.23), because the damage grows with Energy Regen
            and it is hard to max out.
          </li>
        </ul>
        <p>
          <strong>Custom tables.</strong> Make your own with “New Custom Weight Table…” in any table
          picker, or by duplicating a table. Custom tables can be edited, renamed and deleted, carry
          a “Custom” tag, and are kept only in this browser.
        </p>
      </>
    ),
  },
  {
    id: 'about-upgrade-strategies',
    title: 'Upgrade Strategies',
    body: (
      <>
        <p>
          An Upgrade Strategy decides at each Tune Stage which Echoes you keep tuning. An Echo that
          doesn’t pass a stage’s rules is discarded there; a stage with no rules lets every Echo
          through.
        </p>
        <p>
          Rules in one box are joined by “and”: all of them must hold. Another box, after “or”, is
          another way to pass. There are four kinds of rule:
        </p>
        <dl className={styles.terms}>
          <dt>Substat Count</dt>
          <dd>The Echo has at least N of the Substats you pick.</dd>
          <dt>Substat Roll</dt>
          <dd>The Echo has a Substat at a value of at least the one you pick.</dd>
          <dt>Echo Score</dt>
          <dd>The Echo’s Echo Score, for the selected table, is at least a value.</dd>
          <dt>Target Chance</dt>
          <dd>The Echo has at least a given chance to reach a Target Score once fully tuned.</dd>
        </dl>
        <p>
          <strong>Discard Rate</strong> is the share of all Echoes started that are discarded at a
          Tune Stage, not of those that reached it, so the Discard Rates and the Success Rate add up
          to 100%. <strong>Success Rate</strong> is the share of all Echoes started that pass every
          Tune Stage: these are Successful Echoes.
        </p>
        <p>
          Discarding an Echo refunds 75% of its Echo EXP and 30% of its Tuners, but no Shell
          Credits.
        </p>
        <p>
          <strong>Cost per Successful Echo</strong> is what one Successful Echo costs on average:
          everything spent tuning all the Echoes started, the discarded ones included, after
          refunds, divided by the number of Successful Echoes. It is shown as Echoes started, Echo
          EXP, Tuners and Shell Credits. Compare two strategies to see which one is cheaper.
        </p>
      </>
    ),
  },
  {
    id: 'about-credits',
    title: 'Credits',
    body: (
      <>
        <p>
          Thanks to ChemX32 (
          <ExternalLink href="https://docs.google.com/spreadsheets/d/1eoCTrwYIsRpacvL3KrcQpR5rwY3pbJ6gEljZdBj_DHs">
            DPR spreadsheet
          </ExternalLink>
          ), Maygi (
          <ExternalLink href="https://docs.google.com/spreadsheets/d/1vTbG2HfkVxyqvNXF2taikStK-vJJf40QrWa06Fgj17c">
            DPS Calculator spreadsheet
          </ExternalLink>
          ) and riley (
          <ExternalLink href="https://riley31415.github.io/wuwa_calc/">calculator</ExternalLink>)
          for sharing their work on Wuthering Waves damage calculation.
        </p>
        <p>
          Echo Helper is open source on <ExternalLink href={REPO}>GitHub</ExternalLink>. Feedback,
          bug reports and requests for new tables go to its{' '}
          <ExternalLink href={`${REPO}/issues`}>Issues</ExternalLink>.
        </p>
      </>
    ),
  },
  {
    id: 'about-disclaimer',
    title: 'Disclaimer',
    body: (
      <p>
        Echo Helper is a fan-made tool. It is not affiliated with or endorsed by Kuro Games.
        Wuthering Waves and its game data belong to Kuro Games. Results are calculated from game
        data as of the app&apos;s last update, and the built-in Substat Weight Tables are baselines,
        not correct answers. Use them as guidance.
      </p>
    ),
  },
];
