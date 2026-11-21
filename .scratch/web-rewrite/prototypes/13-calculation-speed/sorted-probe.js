(() => {
  // valueTables.json
  var valueTables_default = [
    {
      name: "Cartethyia",
      weights: {
        Critical_Rate: 4.89,
        Critical_Damage: 4.84,
        Energy_Regen: 0,
        Atk_Percent: 0.09,
        Atk_Flat: 0.05,
        Hp_Percent: 2.34,
        Hp_Flat: 0.79,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 2.19,
        Heavy: 0,
        Skill: 0.4,
        Liberation: 1.08
      }
    },
    {
      name: "Qingxiao",
      weights: {
        Critical_Rate: 4.92,
        Critical_Damage: 5.33,
        Energy_Regen: 0,
        Atk_Percent: 2.73,
        Atk_Flat: 1.32,
        Hp_Percent: 0,
        Hp_Flat: 0,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 0.66,
        Heavy: 0.86,
        Skill: 0.05,
        Liberation: 0.86
      }
    },
    {
      name: "Suoming (mDPS)",
      weights: {
        Critical_Rate: 5.84,
        Critical_Damage: 4.06,
        Energy_Regen: 0,
        Atk_Percent: 2.58,
        Atk_Flat: 1.14,
        Hp_Percent: 0,
        Hp_Flat: 0,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 2.07,
        Heavy: 0,
        Skill: 0.04,
        Liberation: 0.21
      }
    },
    {
      name: "Suoming (subDPS)",
      weights: {
        Critical_Rate: 5.09,
        Critical_Damage: 5.33,
        Energy_Regen: 0,
        Atk_Percent: 2.63,
        Atk_Flat: 1.16,
        Hp_Percent: 0,
        Hp_Flat: 0,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 2.14,
        Heavy: 0,
        Skill: 0,
        Liberation: 0.57
      }
    },
    {
      name: "Hsin (Unison)",
      weights: {
        Critical_Rate: 5.09,
        Critical_Damage: 5.34,
        Energy_Regen: 0,
        Atk_Percent: 2.54,
        Atk_Flat: 1.13,
        Hp_Percent: 0,
        Hp_Flat: 0,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 0.21,
        Heavy: 0,
        Skill: 2.27,
        Liberation: 0.04
      }
    },
    {
      name: "Hsin (EF)",
      weights: {
        Critical_Rate: 4.3,
        Critical_Damage: 4.51,
        Energy_Regen: 0,
        Atk_Percent: 2.18,
        Atk_Flat: 0.97,
        Hp_Percent: 0,
        Hp_Flat: 0,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 0.19,
        Heavy: 0,
        Skill: 1.85,
        Liberation: 0.04
      }
    },
    {
      name: "Jinhsi",
      weights: {
        Critical_Rate: 5.24,
        Critical_Damage: 5.15,
        Energy_Regen: 0,
        Atk_Percent: 3.07,
        Atk_Flat: 1.44,
        Hp_Percent: 0,
        Hp_Flat: 0,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 0,
        Heavy: 0,
        Skill: 2.65,
        Liberation: 0.31
      }
    },
    {
      name: "Electro Rover (mDPS)",
      weights: {
        Critical_Rate: 5.46,
        Critical_Damage: 4.67,
        Energy_Regen: 0,
        Atk_Percent: 2.57,
        Atk_Flat: 1.17,
        Hp_Percent: 0,
        Hp_Flat: 0,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 0.21,
        Heavy: 0,
        Skill: 2.08,
        Liberation: 0.71
      }
    },
    {
      name: "Electro Rover (subDPS)",
      weights: {
        Critical_Rate: 5.52,
        Critical_Damage: 5.04,
        Energy_Regen: 0,
        Atk_Percent: 3.22,
        Atk_Flat: 1.46,
        Hp_Percent: 0,
        Hp_Flat: 0,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 0.53,
        Heavy: 0,
        Skill: 2.02,
        Liberation: 1.45
      }
    },
    {
      name: "Jingran",
      weights: {
        Critical_Rate: 5.81,
        Critical_Damage: 4.2,
        Energy_Regen: 0,
        Atk_Percent: 2,
        Atk_Flat: 1.28,
        Hp_Percent: 0,
        Hp_Flat: 0,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 0.02,
        Heavy: 2.15,
        Skill: 0.1,
        Liberation: 0
      }
    },
    {
      name: "Xuanling",
      weights: {
        Critical_Rate: 5.61,
        Critical_Damage: 4.13,
        Energy_Regen: 0,
        Atk_Percent: 2.69,
        Atk_Flat: 1.24,
        Hp_Percent: 0,
        Hp_Flat: 0,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 0.14,
        Heavy: 2.64,
        Skill: 0,
        Liberation: 0
      }
    },
    {
      name: "Lucy",
      weights: {
        Critical_Rate: 4.51,
        Critical_Damage: 4.22,
        Energy_Regen: 0,
        Atk_Percent: 2.45,
        Atk_Flat: 1.12,
        Hp_Percent: 0,
        Hp_Flat: 0,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 0.11,
        Heavy: 2.04,
        Skill: 0.14,
        Liberation: 0
      }
    },
    {
      name: "Phrolova",
      weights: {
        Critical_Rate: 5.46,
        Critical_Damage: 4.43,
        Energy_Regen: 0,
        Atk_Percent: 2.96,
        Atk_Flat: 1.34,
        Hp_Percent: 0,
        Hp_Flat: 0,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 0.14,
        Heavy: 0,
        Skill: 1.6,
        Liberation: 0
      }
    },
    {
      name: "Hiyuki",
      weights: {
        Critical_Rate: 3.3,
        Critical_Damage: 3.18,
        Energy_Regen: 0,
        Atk_Percent: 1.7,
        Atk_Flat: 0.75,
        Hp_Percent: 0,
        Hp_Flat: 0,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 0.03,
        Heavy: 0,
        Skill: 0.24,
        Liberation: 1.73
      }
    },
    {
      name: "Carlotta",
      weights: {
        Critical_Rate: 5.69,
        Critical_Damage: 4.57,
        Energy_Regen: 0,
        Atk_Percent: 3.08,
        Atk_Flat: 1.49,
        Hp_Percent: 0,
        Hp_Flat: 0,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 0.04,
        Heavy: 0,
        Skill: 2.63,
        Liberation: 0
      }
    },
    {
      name: "Sigrika",
      weights: {
        Critical_Rate: 5.42,
        Critical_Damage: 4.57,
        Energy_Regen: 2.23,
        Atk_Percent: 2.46,
        Atk_Flat: 1.17,
        Hp_Percent: 0,
        Hp_Flat: 0,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 0.14,
        Heavy: 0,
        Skill: 0.03,
        Liberation: 0
      }
    },
    {
      name: "Luuk Herssen",
      weights: {
        Critical_Rate: 5.73,
        Critical_Damage: 4.8,
        Energy_Regen: 0,
        Atk_Percent: 2.85,
        Atk_Flat: 1.26,
        Hp_Percent: 0,
        Hp_Flat: 0,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 2.8,
        Heavy: 0,
        Skill: 0,
        Liberation: 0
      }
    },
    {
      name: "Aemeath (TB)",
      weights: {
        Critical_Rate: 4.28,
        Critical_Damage: 3.4,
        Energy_Regen: 0,
        Atk_Percent: 2.29,
        Atk_Flat: 1.05,
        Hp_Percent: 0,
        Hp_Flat: 0,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 0.26,
        Heavy: 0,
        Skill: 0,
        Liberation: 2.01
      }
    },
    {
      name: "Aemeath (FB)",
      weights: {
        Critical_Rate: 3.51,
        Critical_Damage: 3.01,
        Energy_Regen: 0,
        Atk_Percent: 1.92,
        Atk_Flat: 0.88,
        Hp_Percent: 0,
        Hp_Flat: 0,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 0.24,
        Heavy: 0,
        Skill: 0,
        Liberation: 1.77
      }
    },
    {
      name: "Galbrena",
      weights: {
        Critical_Rate: 5.49,
        Critical_Damage: 4.44,
        Energy_Regen: 0,
        Atk_Percent: 2.69,
        Atk_Flat: 1.19,
        Hp_Percent: 0,
        Hp_Flat: 0,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 0,
        Heavy: 0.32,
        Skill: 0,
        Liberation: 0
      }
    },
    {
      name: "Iuno (mDPS)",
      weights: {
        Critical_Rate: 5.48,
        Critical_Damage: 4.79,
        Energy_Regen: 0,
        Atk_Percent: 2.84,
        Atk_Flat: 1.39,
        Hp_Percent: 0,
        Hp_Flat: 0,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 0,
        Heavy: 0,
        Skill: 0.13,
        Liberation: 2.64
      }
    },
    {
      name: "Iuno (subDPS)",
      weights: {
        Critical_Rate: 4.99,
        Critical_Damage: 5.22,
        Energy_Regen: 0,
        Atk_Percent: 3.17,
        Atk_Flat: 1.56,
        Hp_Percent: 0,
        Hp_Flat: 0,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 0,
        Heavy: 0,
        Skill: 0,
        Liberation: 3.37
      }
    },
    {
      name: "Augusta",
      weights: {
        Critical_Rate: 4.9,
        Critical_Damage: 5.47,
        Energy_Regen: 0,
        Atk_Percent: 3.09,
        Atk_Flat: 1.27,
        Hp_Percent: 0,
        Hp_Flat: 0,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 0,
        Heavy: 3.07,
        Skill: 0.37,
        Liberation: 0
      }
    },
    {
      name: "Zani",
      weights: {
        Critical_Rate: 5.09,
        Critical_Damage: 5.47,
        Energy_Regen: 0,
        Atk_Percent: 3.4,
        Atk_Flat: 1.54,
        Hp_Percent: 0,
        Hp_Flat: 0,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 0.03,
        Heavy: 2.67,
        Skill: 0.25,
        Liberation: 0.45
      }
    },
    {
      name: "Phoebe (subDPS)",
      weights: {
        Critical_Rate: 3.87,
        Critical_Damage: 3.38,
        Energy_Regen: 0,
        Atk_Percent: 2.34,
        Atk_Flat: 1.2,
        Hp_Percent: 0,
        Hp_Flat: 0,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 0.86,
        Heavy: 0.68,
        Skill: 0.43,
        Liberation: 0.55
      }
    },
    {
      name: "Brant",
      weights: {
        Critical_Rate: 4.96,
        Critical_Damage: 5.64,
        Energy_Regen: 0,
        Atk_Percent: 1.87,
        Atk_Flat: 1.11,
        Hp_Percent: 0,
        Hp_Flat: 0,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 2.66,
        Heavy: 0,
        Skill: 0,
        Liberation: 0.25
      }
    },
    {
      name: "Changli",
      weights: {
        Critical_Rate: 5.67,
        Critical_Damage: 4.91,
        Energy_Regen: 0,
        Atk_Percent: 2.9,
        Atk_Flat: 1.28,
        Hp_Percent: 0,
        Hp_Flat: 0,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 0.14,
        Heavy: 0.06,
        Skill: 2.18,
        Liberation: 0.79
      }
    },
    {
      name: "Cantarella",
      weights: {
        Critical_Rate: 6.26,
        Critical_Damage: 4.29,
        Energy_Regen: 0,
        Atk_Percent: 3.39,
        Atk_Flat: 1.76,
        Hp_Percent: 0.22,
        Hp_Flat: 0.09,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 3.21,
        Heavy: 0.12,
        Skill: 0.22,
        Liberation: 0
      }
    },
    {
      name: "Camellya",
      weights: {
        Critical_Rate: 5.8,
        Critical_Damage: 4.62,
        Energy_Regen: 0,
        Atk_Percent: 2.93,
        Atk_Flat: 1.31,
        Hp_Percent: 0,
        Hp_Flat: 0,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 1.98,
        Heavy: 0,
        Skill: 0,
        Liberation: 0.46
      }
    },
    {
      name: "Xiangli Yao",
      weights: {
        Critical_Rate: 5.39,
        Critical_Damage: 4.81,
        Energy_Regen: 0,
        Atk_Percent: 3.12,
        Atk_Flat: 1.57,
        Hp_Percent: 0,
        Hp_Flat: 0,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 0.3,
        Heavy: 0,
        Skill: 0.47,
        Liberation: 2.43
      }
    },
    {
      name: "Jiyan",
      weights: {
        Critical_Rate: 5.44,
        Critical_Damage: 5,
        Energy_Regen: 0,
        Atk_Percent: 2.97,
        Atk_Flat: 1.35,
        Hp_Percent: 0,
        Hp_Flat: 0,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 0,
        Heavy: 2.36,
        Skill: 0.36,
        Liberation: 0
      }
    },
    {
      name: "Shorekeeper",
      weights: {
        Critical_Rate: 4.67,
        Critical_Damage: 6.01,
        Energy_Regen: 0,
        Atk_Percent: 0.81,
        Atk_Flat: 0.53,
        Hp_Percent: 2.81,
        Hp_Flat: 0.84,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 0.36,
        Heavy: 0.48,
        Skill: 0.22,
        Liberation: 5.19
      }
    },
    {
      name: "Verina",
      weights: {
        Critical_Rate: 5.8,
        Critical_Damage: 4.22,
        Energy_Regen: 0,
        Atk_Percent: 3,
        Atk_Flat: 2.05,
        Hp_Percent: 0,
        Hp_Flat: 0,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 2.33,
        Heavy: 0,
        Skill: 1.42,
        Liberation: 1.57
      }
    },
    {
      name: "Spectro Rover",
      weights: {
        Critical_Rate: 4.74,
        Critical_Damage: 4.43,
        Energy_Regen: 0,
        Atk_Percent: 2.91,
        Atk_Flat: 1.41,
        Hp_Percent: 0.19,
        Hp_Flat: 0.09,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 0.01,
        Heavy: 0.88,
        Skill: 1.01,
        Liberation: 1.15
      }
    },
    {
      name: "Sanhua",
      weights: {
        Critical_Rate: 5.71,
        Critical_Damage: 4.78,
        Energy_Regen: 0,
        Atk_Percent: 3.16,
        Atk_Flat: 1.71,
        Hp_Percent: 0,
        Hp_Flat: 0,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 0.25,
        Heavy: 0.57,
        Skill: 1.29,
        Liberation: 1.25
      }
    },
    {
      name: "Mornye",
      weights: {
        Critical_Rate: 5.76,
        Critical_Damage: 3.74,
        Energy_Regen: 0,
        Atk_Percent: 1.06,
        Atk_Flat: 0.7,
        Hp_Percent: 0,
        Hp_Flat: 0,
        Def_Percent: 3.32,
        Def_Flat: 1.13,
        Basic_Attack: 0.36,
        Heavy: 0.33,
        Skill: 0.19,
        Liberation: 4.97
      }
    },
    {
      name: "Lily (Unison)",
      weights: {
        Critical_Rate: 5.71,
        Critical_Damage: 3.92,
        Energy_Regen: 0,
        Atk_Percent: 0.88,
        Atk_Flat: 0.58,
        Hp_Percent: 2.88,
        Hp_Flat: 0.86,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 0.41,
        Heavy: 3.47,
        Skill: 0.14,
        Liberation: 0
      }
    },
    {
      name: "Lily (Echo)",
      weights: {
        Critical_Rate: 5.7,
        Critical_Damage: 3.99,
        Energy_Regen: 0,
        Atk_Percent: 0.66,
        Atk_Flat: 0.44,
        Hp_Percent: 2.95,
        Hp_Flat: 0.88,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 0.44,
        Heavy: 3.34,
        Skill: 0.15,
        Liberation: 0
      }
    },
    {
      name: "Lynae",
      weights: {
        Critical_Rate: 3.96,
        Critical_Damage: 3.63,
        Energy_Regen: 0,
        Atk_Percent: 2.34,
        Atk_Flat: 1.13,
        Hp_Percent: 0,
        Hp_Flat: 0,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 1.22,
        Heavy: 0,
        Skill: 0.16,
        Liberation: 0.5
      }
    },
    {
      name: "Rebecca",
      weights: {
        Critical_Rate: 3.76,
        Critical_Damage: 2.86,
        Energy_Regen: 0,
        Atk_Percent: 1.82,
        Atk_Flat: 0.94,
        Hp_Percent: 0,
        Hp_Flat: 0,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 1.62,
        Heavy: 0.17,
        Skill: 0.11,
        Liberation: 0
      }
    },
    {
      name: "Suisui",
      weights: {
        Critical_Rate: 3.54,
        Critical_Damage: 4.8,
        Energy_Regen: 0,
        Atk_Percent: 0.51,
        Atk_Flat: 0.34,
        Hp_Percent: 2.16,
        Hp_Flat: 0.64,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 0.52,
        Heavy: 0,
        Skill: 0.39,
        Liberation: 0
      }
    },
    {
      name: "Buling",
      weights: {
        Critical_Rate: 2.85,
        Critical_Damage: 1.78,
        Energy_Regen: 0,
        Atk_Percent: 1.46,
        Atk_Flat: 1.22,
        Hp_Percent: 0,
        Hp_Flat: 0,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 0.45,
        Heavy: 0.15,
        Skill: 0.19,
        Liberation: 1.41
      }
    },
    {
      name: "Yinlin",
      weights: {
        Critical_Rate: 4.94,
        Critical_Damage: 5.32,
        Energy_Regen: 0,
        Atk_Percent: 2.99,
        Atk_Flat: 1.55,
        Hp_Percent: 0,
        Hp_Flat: 0,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 0.25,
        Heavy: 0.33,
        Skill: 1.9,
        Liberation: 0.78
      }
    },
    {
      name: "Zhezhi",
      weights: {
        Critical_Rate: 5.61,
        Critical_Damage: 4.7,
        Energy_Regen: 0,
        Atk_Percent: 3.01,
        Atk_Flat: 1.6,
        Hp_Percent: 0,
        Hp_Flat: 0,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 2.33,
        Heavy: 0.22,
        Skill: 0.27,
        Liberation: 0
      }
    },
    {
      name: "Chisa",
      weights: {
        Critical_Rate: 5.21,
        Critical_Damage: 5.25,
        Energy_Regen: 0,
        Atk_Percent: 3.24,
        Atk_Flat: 1.61,
        Hp_Percent: 0,
        Hp_Flat: 0,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 0.14,
        Heavy: 0,
        Skill: 0.17,
        Liberation: 3.12
      }
    },
    {
      name: "Lupa",
      weights: {
        Critical_Rate: 5.68,
        Critical_Damage: 4.9,
        Energy_Regen: 0,
        Atk_Percent: 3.29,
        Atk_Flat: 1.58,
        Hp_Percent: 0,
        Hp_Flat: 0,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 0.23,
        Heavy: 0.29,
        Skill: 0.51,
        Liberation: 2.14
      }
    },
    {
      name: "Mortefi",
      weights: {
        Critical_Rate: 4.83,
        Critical_Damage: 5.77,
        Energy_Regen: 0,
        Atk_Percent: 3.15,
        Atk_Flat: 1.75,
        Hp_Percent: 0,
        Hp_Flat: 0,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 0.45,
        Heavy: 0,
        Skill: 0.87,
        Liberation: 2.48
      }
    },
    {
      name: "Denia (TB)",
      weights: {
        Critical_Rate: 5.75,
        Critical_Damage: 4.7,
        Energy_Regen: 0,
        Atk_Percent: 3.02,
        Atk_Flat: 1.52,
        Hp_Percent: 0,
        Hp_Flat: 0,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 0.13,
        Heavy: 0,
        Skill: 0.22,
        Liberation: 3.04
      }
    },
    {
      name: "Denia (FB)",
      weights: {
        Critical_Rate: 3.82,
        Critical_Damage: 3.34,
        Energy_Regen: 0,
        Atk_Percent: 2.28,
        Atk_Flat: 1.15,
        Hp_Percent: 0,
        Hp_Flat: 0,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 0.07,
        Heavy: 0,
        Skill: 0.12,
        Liberation: 1.75
      }
    },
    {
      name: "Ciaccona",
      weights: {
        Critical_Rate: 3.27,
        Critical_Damage: 2.85,
        Energy_Regen: 0,
        Atk_Percent: 1.92,
        Atk_Flat: 1.02,
        Hp_Percent: 0,
        Hp_Flat: 0,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 0.58,
        Heavy: 0.39,
        Skill: 0.1,
        Liberation: 0.74
      }
    },
    {
      name: "Jianxin",
      weights: {
        Critical_Rate: 4.69,
        Critical_Damage: 5.98,
        Energy_Regen: 0,
        Atk_Percent: 3.15,
        Atk_Flat: 2.17,
        Hp_Percent: 0,
        Hp_Flat: 0,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 0,
        Heavy: 1.8,
        Skill: 0.86,
        Liberation: 1.8
      }
    },
    {
      name: "Lucilla (Chafe)",
      weights: {
        Critical_Rate: 4.83,
        Critical_Damage: 4.41,
        Energy_Regen: 0,
        Atk_Percent: 2.56,
        Atk_Flat: 1.24,
        Hp_Percent: 0,
        Hp_Flat: 0,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 2.16,
        Heavy: 0,
        Skill: 0.51,
        Liberation: 0
      }
    },
    {
      name: "Lucilla (Echo)",
      weights: {
        Critical_Rate: 5.63,
        Critical_Damage: 4.69,
        Energy_Regen: 0,
        Atk_Percent: 3.11,
        Atk_Flat: 1.51,
        Hp_Percent: 0,
        Hp_Flat: 0,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 0.56,
        Heavy: 0,
        Skill: 0.51,
        Liberation: 0
      }
    },
    {
      name: "Aero Rover",
      weights: {
        Critical_Rate: 4.92,
        Critical_Damage: 5.65,
        Energy_Regen: 0,
        Atk_Percent: 3.31,
        Atk_Flat: 1.5,
        Hp_Percent: 0,
        Hp_Flat: 0,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 0.4,
        Heavy: 0,
        Skill: 1.66,
        Liberation: 0.59
      }
    },
    {
      name: "Danjin (subDPS)",
      weights: {
        Critical_Rate: 5.66,
        Critical_Damage: 4.93,
        Energy_Regen: 0,
        Atk_Percent: 2.88,
        Atk_Flat: 1.58,
        Hp_Percent: 0.1,
        Hp_Flat: 0.05,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 0.23,
        Heavy: 1.04,
        Skill: 0.88,
        Liberation: 0.93
      }
    },
    {
      name: "Qiuyuan",
      weights: {
        Critical_Rate: 4.86,
        Critical_Damage: 5.53,
        Energy_Regen: 0,
        Atk_Percent: 3.17,
        Atk_Flat: 1.54,
        Hp_Percent: 0.19,
        Hp_Flat: 0.08,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 0,
        Heavy: 2.19,
        Skill: 0,
        Liberation: 0
      }
    },
    {
      name: "Roccia",
      weights: {
        Critical_Rate: 4.82,
        Critical_Damage: 5.78,
        Energy_Regen: 0,
        Atk_Percent: 3.2,
        Atk_Flat: 1.55,
        Hp_Percent: 0,
        Hp_Flat: 0,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 0.25,
        Heavy: 2.87,
        Skill: 0,
        Liberation: 0
      }
    },
    {
      name: "Encore",
      weights: {
        Critical_Rate: 4.08,
        Critical_Damage: 4.93,
        Energy_Regen: 0,
        Atk_Percent: 2.71,
        Atk_Flat: 1.36,
        Hp_Percent: 0,
        Hp_Flat: 0,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 1.73,
        Heavy: 0,
        Skill: 0.44,
        Liberation: 0.3
      }
    },
    {
      name: "Lingyang",
      weights: {
        Critical_Rate: 5.94,
        Critical_Damage: 4.14,
        Energy_Regen: 0,
        Atk_Percent: 3.6,
        Atk_Flat: 1.63,
        Hp_Percent: 0,
        Hp_Flat: 0,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 0.96,
        Heavy: 0.1,
        Skill: 1.31,
        Liberation: 0
      }
    },
    {
      name: "Calcharo",
      weights: {
        Critical_Rate: 4.21,
        Critical_Damage: 6.03,
        Energy_Regen: 0,
        Atk_Percent: 3.65,
        Atk_Flat: 1.66,
        Hp_Percent: 0,
        Hp_Flat: 0,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 0.5,
        Heavy: 0.07,
        Skill: 0.66,
        Liberation: 1.91
      }
    },
    {
      name: "Havoc Rover (mDPS)",
      weights: {
        Critical_Rate: 5.09,
        Critical_Damage: 5.32,
        Energy_Regen: 0,
        Atk_Percent: 3.16,
        Atk_Flat: 1.47,
        Hp_Percent: 0,
        Hp_Flat: 0,
        Def_Percent: 0,
        Def_Flat: 0,
        Basic_Attack: 1.39,
        Heavy: 0.09,
        Skill: 0.41,
        Liberation: 0.76
      }
    }
  ];

  // core.ts
  var TYPES = [
    "Atk_Percent",
    "Atk_Flat",
    "Def_Percent",
    "Def_Flat",
    "Hp_Percent",
    "Hp_Flat",
    "Basic_Attack",
    "Skill",
    "Heavy",
    "Liberation",
    "Energy_Regen",
    "Critical_Rate",
    "Critical_Damage"
  ];
  var ER = TYPES.indexOf("Energy_Regen");
  var MAX = 5;
  var TOL = 1e-9;
  var REF = {
    Atk_Percent: 8.6,
    Atk_Flat: 40,
    Def_Percent: 10.9,
    Def_Flat: 50,
    Hp_Percent: 8.6,
    Hp_Flat: 430,
    Basic_Attack: 8.6,
    Skill: 8.6,
    Heavy: 8.6,
    Liberation: 8.6,
    Energy_Regen: 9.2,
    Critical_Rate: 7.5,
    Critical_Damage: 15
  };
  var W = [680, 777, 2039, 2428, 1748, 1457, 582, 291];
  var WC = [2333, 2333, 2333, 800, 800, 800, 300, 300];
  var STD = [6.4, 7.1, 7.9, 8.6, 9.4, 10.1, 10.9, 11.6];
  var VALUES = {
    Critical_Rate: [6.3, 6.9, 7.5, 8.1, 8.7, 9.3, 9.9, 10.5],
    Critical_Damage: [12.6, 13.8, 15, 16.2, 17.4, 18.6, 19.8, 21],
    Hp_Flat: [320, 360, 390, 430, 470, 510, 540, 580],
    Def_Percent: [8.1, 9, 10, 10.9, 11.8, 12.8, 13.8, 14.7],
    Energy_Regen: [6.8, 7.6, 8.4, 9.2, 10, 10.8, 11.6, 12.4],
    Atk_Flat: [30, 30, 40, 40, 50, 50, 60, 60],
    Def_Flat: [40, 40, 50, 50, 60, 60, 70, 70],
    Atk_Percent: STD,
    Hp_Percent: STD,
    Liberation: STD,
    Skill: STD,
    Heavy: STD,
    Basic_Attack: STD
  };
  var POSSIBLE = TYPES.map((t) => {
    const w = t === "Critical_Rate" || t === "Critical_Damage" ? WC : W;
    const total = w.reduce((a, b) => a + b, 0);
    const byValue = /* @__PURE__ */ new Map();
    VALUES[t].forEach((v, tier) => byValue.set(v, (byValue.get(v) ?? 0) + w[tier]));
    return [...byValue].map(([value, sum]) => ({ value, chance: sum / total }));
  });
  function tableOf(name, weights) {
    return { name, weights: Float64Array.from(TYPES, (t) => weights[t] ?? 0) };
  }
  var echoValueOf = (type, value, table) => table.weights[type] * (value / REF[TYPES[type]]);
  function echoValueRolls(type, table) {
    const m = /* @__PURE__ */ new Map();
    for (const r of POSSIBLE[type]) {
      const ev = echoValueOf(type, r.value, table);
      m.set(ev, (m.get(ev) ?? 0) + r.chance);
    }
    return [...m].map(([ev, chance]) => ({ ev, chance }));
  }
  function lowerBound(xs, x) {
    let lo = 0, hi = xs.length;
    while (lo < hi) {
      const mid = lo + hi >>> 1;
      if (xs[mid] < x) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }
  var clamp01 = (x) => Math.min(1, Math.max(0, x));
  var EchoValueDistribution = class _EchoValueDistribution {
    constructor(echoValues, atOrAbove, withErAtOrAbove) {
      this.echoValues = echoValues;
      this.atOrAbove = atOrAbove;
      this.withErAtOrAbove = withErAtOrAbove;
    }
    static of(table) {
      const bySize = [/* @__PURE__ */ new Map([[0, 1]])];
      for (let s = 1; s <= MAX; s++) bySize.push(/* @__PURE__ */ new Map());
      const order = [...TYPES.keys()].filter((t) => t !== ER).concat(ER);
      const withEr = /* @__PURE__ */ new Map();
      for (const type of order) {
        const rolls = echoValueRolls(type, table);
        if (type === ER) {
          for (const [ev, c] of bySize[MAX - 1]) for (const r of rolls) {
            const k = ev + r.ev;
            withEr.set(k, (withEr.get(k) ?? 0) + c * r.chance);
          }
        }
        for (let size = MAX; size >= 1; size--) {
          const larger = bySize[size];
          for (const [ev, c] of bySize[size - 1]) for (const r of rolls) {
            const k = ev + r.ev;
            larger.set(k, (larger.get(k) ?? 0) + c * r.chance);
          }
        }
      }
      const full = bySize[MAX];
      const entries = [...full].sort((a, b) => a[0] - b[0]);
      const n = entries.length;
      const evs = new Float64Array(n);
      let setCount = 0;
      for (let i = 0; i < n; i++) {
        evs[i] = entries[i][0];
        setCount += entries[i][1];
      }
      const above = new Float64Array(n + 1), aboveEr = new Float64Array(n + 1);
      for (let i = n - 1; i >= 0; i--) {
        above[i] = above[i + 1] + entries[i][1] / setCount;
        aboveEr[i] = aboveEr[i + 1] + (withEr.get(evs[i]) ?? 0) / setCount;
      }
      return new _EchoValueDistribution(evs, above, aboveEr);
    }
    firstHigher(ev) {
      return lowerBound(this.echoValues, ev + TOL);
    }
    topPercent(ev) {
      return clamp01(this.atOrAbove[this.firstHigher(ev)]);
    }
    erTopPercent(ev) {
      return clamp01(this.withErAtOrAbove[this.firstHigher(ev)]);
    }
    // The lowest Echo Score whose Top Percent is at most p, to one decimal (how example strategies set thresholds).
    topScore(p) {
      for (let i = 0; i < this.echoValues.length; i++) if (this.atOrAbove[i + 1] <= p) return Math.round(this.echoValues[i] * 10) / 10;
      return Math.round(this.echoValues[this.echoValues.length - 1] * 10) / 10;
    }
  };

  // bench.ts
  var T = (name) => TYPES.indexOf(name);
  var CR = T("Critical_Rate");
  var CD = T("Critical_Damage");
  var TABLES = valueTables_default.map((t) => tableOf(t.name, t.weights));
  var FULL = [[CR, 8.1], [CD, 16.2], [T("Atk_Percent"), 9.4], [T("Liberation"), 8.6]];

  // sorted.ts
  var EMPTY = { keys: new Float64Array(0), vals: new Float64Array(0), n: 0 };
  function merge(a, b) {
    const keys = new Float64Array(a.n + b.n), vals = new Float64Array(a.n + b.n);
    let i = 0, j = 0, n = 0;
    const ak = a.keys, av = a.vals, bk = b.keys, bv = b.vals;
    while (i < a.n || j < b.n) {
      let k, v;
      if (j >= b.n || i < a.n && ak[i] < bk[j]) {
        k = ak[i];
        v = av[i++];
      } else if (i >= a.n || bk[j] < ak[i]) {
        k = bk[j];
        v = bv[j++];
      } else {
        k = ak[i];
        v = av[i++] + bv[j++];
      }
      if (n > 0 && keys[n - 1] === k) vals[n - 1] += v;
      else {
        keys[n] = k;
        vals[n++] = v;
      }
    }
    return { keys: keys.subarray(0, n), vals: vals.subarray(0, n), n };
  }
  function shift(t, ev, chance) {
    const keys = new Float64Array(t.n), vals = new Float64Array(t.n);
    for (let i = 0; i < t.n; i++) {
      keys[i] = t.keys[i] + ev;
      vals[i] = t.vals[i] * chance;
    }
    return { keys, vals, n: t.n };
  }
  function mergeAll(parts) {
    while (parts.length > 1) {
      const next = [];
      for (let i = 0; i < parts.length; i += 2) next.push(i + 1 < parts.length ? merge(parts[i], parts[i + 1]) : parts[i]);
      parts = next;
    }
    return parts[0] ?? EMPTY;
  }
  function distributionSorted(table) {
    const bySize = [{ keys: Float64Array.of(0), vals: Float64Array.of(1), n: 1 }];
    for (let s = 1; s <= MAX; s++) bySize.push(EMPTY);
    const order = [...TYPES.keys()].filter((t) => t !== ER).concat(ER);
    let withEr = EMPTY;
    for (const type of order) {
      const rolls = echoValueRolls(type, table);
      if (type === ER) withEr = mergeAll(rolls.map((r) => shift(bySize[MAX - 1], r.ev, r.chance)));
      for (let size = MAX; size >= 1; size--) {
        if (bySize[size - 1].n === 0) continue;
        bySize[size] = mergeAll([bySize[size], ...rolls.map((r) => shift(bySize[size - 1], r.ev, r.chance))]);
      }
    }
    const full = bySize[MAX];
    let setCount = 0;
    for (let i = 0; i < full.n; i++) setCount += full.vals[i];
    const above = new Float64Array(full.n + 1), aboveEr = new Float64Array(full.n + 1);
    let j = withEr.n - 1;
    for (let i = full.n - 1; i >= 0; i--) {
      above[i] = above[i + 1] + full.vals[i] / setCount;
      let er = 0;
      while (j >= 0 && withEr.keys[j] > full.keys[i]) j--;
      if (j >= 0 && withEr.keys[j] === full.keys[i]) er = withEr.vals[j];
      aboveEr[i] = aboveEr[i + 1] + er / setCount;
    }
    return { echoValues: full.keys, atOrAbove: above, withErAtOrAbove: aboveEr };
  }

  // sorted-probe.ts
  var pick = ["Mornye", "Lily (Echo)", "Calcharo", "Hsin (EF)", "Jinhsi", "Iuno (subDPS)"];
  var time = (fn) => {
    fn();
    const t0 = performance.now();
    fn();
    return performance.now() - t0;
  };
  var rows = [];
  for (const name of pick) {
    const table = TABLES.find((t) => t.name === name);
    const a = EchoValueDistribution.of(table), b = distributionSorted(table);
    let maxDiff = 0;
    for (let i = 0; i < a.echoValues.length; i += 97) {
      const ev = a.echoValues[i];
      maxDiff = Math.max(maxDiff, Math.abs(a.topPercent(ev) - b.atOrAbove[i + 1]), Math.abs(a.erTopPercent(ev) - b.withErAtOrAbove[i + 1]));
    }
    rows.push({
      table: name,
      distinct: a.echoValues.length,
      sameCount: a.echoValues.length === b.echoValues.length,
      maxDiff,
      mapMs: +time(() => EchoValueDistribution.of(table)).toFixed(1),
      sortedMs: +time(() => distributionSorted(table)).toFixed(1)
    });
  }
  var out = JSON.stringify(rows, null, 1);
  if (typeof document !== "undefined") document.getElementById("out").textContent = navigator.userAgent + "\n" + out;
  else console.log(out);
})();
