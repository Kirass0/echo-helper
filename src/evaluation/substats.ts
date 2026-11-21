import type { SubstatType } from '../core/gameData';

/** Each Substat type's name as the app shows it. */
export const SUBSTAT_NAMES: Readonly<Record<SubstatType, string>> = {
  Critical_Rate: 'Crit Rate',
  Critical_Damage: 'Crit Damage',
  Atk_Percent: 'ATK%',
  Atk_Flat: 'Flat ATK',
  Hp_Percent: 'HP%',
  Hp_Flat: 'Flat HP',
  Def_Percent: 'DEF%',
  Def_Flat: 'Flat DEF',
  Energy_Regen: 'Energy Regen',
  Basic_Attack: 'Basic Attack DMG Bonus',
  Heavy: 'Heavy Attack DMG Bonus',
  Skill: 'Resonance Skill DMG Bonus',
  Liberation: 'Resonance Liberation DMG Bonus',
};

/** The order Substat types are offered in: Crit first, then each stat's % before its flat form. */
export const SUBSTAT_DISPLAY_ORDER: readonly SubstatType[] = [
  'Critical_Rate',
  'Critical_Damage',
  'Atk_Percent',
  'Atk_Flat',
  'Hp_Percent',
  'Hp_Flat',
  'Def_Percent',
  'Def_Flat',
  'Energy_Regen',
  'Basic_Attack',
  'Heavy',
  'Skill',
  'Liberation',
];

const FLAT_TYPES: ReadonlySet<SubstatType> = new Set(['Atk_Flat', 'Hp_Flat', 'Def_Flat']);

/** Whether a Substat type's values are percentages; the flat types are whole numbers. */
export const isPercentType = (type: SubstatType) => !FLAT_TYPES.has(type);
