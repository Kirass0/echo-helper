# Project name: collisions and alternatives

Checked: 2026-11-20. Sources are GitHub (web pages and the public REST search API `api.github.com/search/repositories`), the npm registry (`registry.npmjs.org/<name>`), the tools' live sites, and Kuro Games' own guideline page. Star counts and "last push" dates come from the GitHub search API's `stargazers_count` / `pushed_at` fields on 2026-11-20. They will change.

## Summary

- **No Wuthering Waves tool called "Echo Helper" turned up.** Every GitHub repo named `echo-helper` / `EchoHelper` / `echoHelper` is an unrelated, dormant 0-star project (mostly helpers for the Go web framework labstack/echo). The npm names `echo-helper` and `echohelper` are free. `kirass.github.io/echo-helper/` currently returns 404.
- **The problem is that the name is generic, not that it is taken.** Almost every WuWa Echo tool is called "Echo + noun": Echo Scorer, Echo Value Calculator, Echo Studio, Echo Workshop, Echo Simulator, Echo Worth Calculator, Echo Substat Calculator, Echo Roll Potential. "Echo Helper" would blend in with them and doesn't say what the app does.
- **The closest tool in function is Echo Studio** (`2-07665/ww-echo-policy-calculator`). It gives DP-optimal upgrade/abandon/reroll advice with resource cost, which is what the Upgrade Strategy tab does. The Japanese/English `wuwa-echo-simulator` (target probability plus tuner cost) is also close. Neither is called "Echo Helper".
- **Recommendation: Tune or Toss (`tune-or-toss`).** It returned zero GitHub search hits, the npm name is free, and a web search for the phrase found nothing. It names the decision the app helps with and uses no Kuro trademark.

## 1. Existing projects with similar names

### Exact or near-exact "Echo Helper" names (all unrelated to WuWa)

GitHub search `echohelper` returned 5 repos and `echo-helper in:name` returned 33 ([API query](https://api.github.com/search/repositories?q=echohelper), [API query](https://api.github.com/search/repositories?q=echo-helper+in:name)). The relevant ones:

| Repo | What it is | Activity | Confusable? |
|---|---|---|---|
| [mohemohe/echoHelper](https://github.com/mohemohe/echoHelper) | "routing helper for labstack/echo" (Go) | 0 stars, last push 2019-09-05 | Low. Different domain, dormant. |
| [JinesD/echo-helper](https://github.com/JinesD/echo-helper) | Chinese description: common helper methods for the echo framework | 0 stars, last push 2017-08-25 | Low |
| [0x-echo/echo-helper](https://github.com/0x-echo/echo-helper) | No description | 0 stars, last push 2023-01-29 | Low |
| [bdottn/EchoHelper](https://github.com/bdottn/EchoHelper) | No description | 0 stars, last push 2015-10-16 | Low |
| [EchoHowardLam/EchoHelperScript](https://github.com/EchoHowardLam/EchoHelperScript) | Personal script collection | 0 stars, last push 2022-06-08 | Low |
| [houseofgood/echohelpers](https://github.com/houseofgood/echohelpers) | No description | 0 stars, last push 2022-12-02 | Low |
| [echohelper/echohelper.github.io](https://echohelper.github.io/) | "echohelper blog" (a Jekyll site; returns HTTP 200) | 0 stars, last push 2021-10-14 | Low to medium. It owns the `echohelper.github.io` user site, but has nothing to do with games. |
| [colakang/echoai_helper](https://github.com/colakang/echoai_helper) | AI conversation assistant (echo365.ai) | 17 stars, last push 2026-09-11 | Low |
| [Zendevve/Echoes-VK-Helper](https://github.com/Zendevve/Echoes-VK-Helper) | No description | 2 stars, last push 2026-06-06 | Low |

npm: `https://registry.npmjs.org/echo-helper`, `/echohelper` and `/echo-helpers` all return 404, so the names are unregistered (checked with curl). The target URL [kirass.github.io/echo-helper/](https://kirass.github.io/echo-helper/) returns 404, so it is not yet published.

A web search for `"Echo Helper" Wuthering Waves` found no tool by that name. All results were general Echo guides.

### Wuthering Waves Echo tools (the real competition for attention)

| Name | URL | What it does | Activity | Confusable with this app? |
|---|---|---|---|---|
| **Echo Studio · 声骸策略工坊** (repo `ww-echo-policy-calculator`) | [github.com/2-07665/ww-echo-policy-calculator](https://github.com/2-07665/ww-echo-policy-calculator) | Upgrade, Reroll and Combined modes. Advises continue/give up per step and gives the average resource cost per finished Echo, using DP. It has character presets and custom weights, a zh/en UI, runs as a local web app or Tauri desktop app, and has optional OCR. MIT licence. | 25 stars, last push 2026-11-15. There is also a solver repo, [2-07665/echo-policy](https://github.com/2-07665/echo-policy) (last push 2026-10-21). | **High in function**, low in name. It is the nearest equivalent to the Upgrade Strategy tab. |
| **Wuthering Waves Echo Upgrade Simulator** (`wuwa-echo-simulator`) | [github.com/sideriver81/wuwa-echo-simulator](https://github.com/sideriver81/wuwa-echo-simulator), live at [wuwa-echo-simulator.pages.dev](https://wuwa-echo-simulator.pages.dev/) | Probability of reaching target substats, plus Tuner, Sealed Tube and Echo consumption. Has per-level continuation conditions. Japanese/English UI. | 0 stars, last push 2026-10-06 | **High in function**, medium in name ("Echo ... Simulator"). |
| **Echo Value Calculator (EVC 4.1)** | [echovaluecalc.com](https://www.echovaluecalc.com), source [AstyuteChick/Echo-Value-Calculator](https://github.com/AstyuteChick/Echo-Value-Calculator) | Echo score and tier per character, team and ER. Also offers Build Score and Full Score. Non-commercial licence. Also has a Flutter client, [phnthnhnm/evc](https://github.com/phnthnhnm/evc). | 1 star, last push 2026-11-13. The older repo [-OLD-Echo-Value-Calculator](https://github.com/AstyuteChick/-OLD-Echo-Value-Calculator) last pushed 2026-04-09. | Medium. It is a well-known "Echo + noun" scorer in English. |
| **WuWa Tools – Echo Scorer** | [wuwa-tools.pages.dev/echo-scorer.html](https://wuwa-tools.pages.dev/echo-scorer.html) | Grades an Echo S–D from a build preset "to decide whether to spend Tuners". Also offers pull, material and build-card tools. Footer: "Not affiliated with Kuro Games". | No repo or date shown | **Medium-high.** Its pitch overlaps with the Echo Evaluation tab. |
| **Wuthering Insight** | [christopherklay.github.io/WutheringInsight](https://christopherklay.github.io/WutheringInsight) | Crit Value, weighted letter grade, substat roll-tier tables. No keep/discard probabilities. | No date shown | Low to medium. Also on github.io. |
| **WuWaBuilds** (wuwabuilds.moe, redirects to wuwa.build) | [wuwa.build](https://wuwa.build/) | Build cards, profiles, leaderboards, CV. "Independent fan tool, unaffiliated with Kuro Games". | Changelog has a Patch 3.8 entry dated November 11 | Low |
| **Wuthering Waves Build Scorer / wuwa-optimizer** | [wuwa-optimizer.nuxt.dev](https://wuwa-optimizer.nuxt.dev/) | Scorer, character builder showcase, OCR import (per its roadmap). Feedback repo: [Mikyan0207/wuwa-optimizer-feedback](https://github.com/Mikyan0207/wuwa-optimizer-feedback) | Not determined | Low |
| **Wuthering Waves Calculator & Optimizer** (wutheringtools.com) | [github.com/ryanbenson/wuthering-waves-optimizer](https://github.com/ryanbenson/wuthering-waves-optimizer), [wutheringtools.com](https://www.wutheringtools.com/) | Resonator, weapon and Echo optimizer (Vue). GPL-3.0. | 13 stars, last push 2026-11-20, 3,198 commits | Low |
| **WuWaOpt** | [github.com/EMCJava/WuWaOpt](https://github.com/EMCJava/WuWaOpt) | Echo scanner plus optimizer | 67 stars. Archived 2025-03-25 ("Unmaintained after Withering Waves 2.1") | Low |
| **WW-Echo Workshop** | [github.com/hxwd94666/WW-Echo-Workshop](https://github.com/hxwd94666/WW-Echo-Workshop) | Live Echo scoring, collection and loadouts (zh/en) | 5 stars, last push 2026-11-03 | Medium. Its name pattern is close to "Echo Studio". |
| **Echo-Roll-Potential** | [github.com/Johnypier/Echo-Roll-Potential](https://github.com/Johnypier/Echo-Roll-Potential), live at [johnypier.github.io/Echo-Roll-Potential](https://johnypier.github.io/Echo-Roll-Potential/index.html) | Probability of rolling target substats/values on up to 5 Echo cards | 1 star, last push 2026-10-14 | Medium. It also lives on github.io and computes probabilities. |
| **wuwa-echo-sim** | [github.com/Parksan404/wuwa-echo-sim](https://github.com/Parksan404/wuwa-echo-sim) | Tuning simulator with "exact-math odds" plus Monte Carlo. No scoring, no cost. | 0 stars, last push 2026-07-08 | Low to medium |
| **Echo-Worth-Calculator-for-Wuthering-Waves** | [github.com/Arfoire/Echo-Worth-Calculator-for-Wuthering-Waves](https://github.com/Arfoire/Echo-Worth-Calculator-for-Wuthering-Waves) | Evaluates an Echo for a character and team | 1 star, last push 2026-07-13 | Medium. Rules out "worth" names. |
| Other small "Echo" repos | [Waves-EchoScorer](https://github.com/WhisperingSea/Waves-EchoScorer), [Echo Substat Calculator](https://github.com/Erensia/Wuthering-Waves-Echo-Substat-Calculator), [Echo Upgrade Simulator](https://github.com/Pengibaby/Wuthering-Waves-Echo-Upgrade-Simulator), [WuwaEchoTool](https://github.com/GQin404/WuwaEchoTool), [wuwa-tools (Svelte)](https://github.com/ahmdilhaam/wuwa-tools), [Accurian/wuwa-tools](https://github.com/Accurian/wuwa-tools), [wuwa_echoCompare](https://github.com/Pino216/wuwa_echoCompare), [mingchao_echo_scorer](https://github.com/HMSDido/mingchao_echo_scorer) | Scorers, calculators and simulators. Most have 0–15 stars. | Last pushes between 2024 and 2026 | Low individually, but together they make "Echo + generic noun" crowded. |

The GitHub API search queries used were `wuthering echo`, `wuwa echo`, `echo scorer`, `echo wuthering upgrade`, `echo calculator wuthering`, `wuwa echo in:name` and `wuwa tuning`.

## 2. Naming conventions in WuWa Echo tools

Based on the table above:

1. **"Echo" + generic tool noun**, by far the most common: Echo Scorer, Echo Value Calculator, Echo Studio, Echo Workshop, Echo Simulator, Echo Worth Calculator, Echo Substat Calculator, EchoCompare, EchoTool. "Echo Helper" fits this pattern exactly, so it would be hard to tell apart.
2. **"WuWa"/"Wuthering" prefix**: WuWa Tools, WuWaBuilds, WuWaOpt, wuwa-optimizer, Wuthering Insight, wutheringtools.com, wuwa-echo-sim, wuwa-echo-simulator. These use the game's trademark or its common abbreviation in the brand itself.
3. **Chinese 声骸 (Echo) + 评分/策略 (score/strategy)** for zh-first tools.
4. Almost none names the **decision** (keep tuning vs. discard) or the **probability/cost** angle in the title, even though Echo Studio and wuwa-echo-simulator compute it.

To stand apart, the name should avoid both "Echo + generic noun" and a "WuWa" prefix, and instead name the tune/discard decision.

## 3. Alternative names

The collision checks were run on 2026-11-20: GitHub repo search via the API, npm registry lookup, and, for the top pick, a web search.

| # | Name | Repo slug | GitHub search | npm | Reason |
|---|---|---|---|---|---|
| 1 | **Tune or Toss** | `tune-or-toss` | [0 results](https://api.github.com/search/repositories?q=tune-or-toss) (also 0 for `tune or toss`) | free (404) | Names the exact decision the Upgrade Strategy tab makes. Short, memorable, no trademark. A web search for the phrase plus "Wuthering Waves" found no existing use. |
| 2 | **Echo Odds** | `echo-odds` | [5 results](https://api.github.com/search/repositories?q=echo-odds), none named exactly that. The closest is `wuwa-echo-sim`, whose description mentions "exact-math odds". | free | Says "probabilities for your Echo". Fits the Echo Evaluation tab. Slightly closer to existing simulators. |
| 3 | **Echo Verdict** | `echo-verdict` | [3 results](https://api.github.com/search/repositories?q=echo-verdict), all unrelated | free | Suggests a keep/discard judgement. Still uses the "Echo +" pattern, but with a decision word rather than a tool noun. |
| 4 | **Should I Tune?** | `should-i-tune` | [32 results](https://api.github.com/search/repositories?q=should-i-tune), all keyword noise, none game-related | free | The user's own question, and very clear. Longer, and the question mark only works in the display name. |
| 5 | **Tune Ahead** | `tune-ahead` | [65 results](https://api.github.com/search/repositories?q=tune-ahead), keyword noise (ML fine-tuning, load forecasting), none game-related | free | Suggests planning the tuning path across Tune Stages. Less clear about scoring. |
| 6 | **Worth Tuning?** | `worth-tuning` | [36 results](https://api.github.com/search/repositories?q=worth-tuning), keyword noise | free | Clear, but close to the existing Arfoire "Echo-Worth-Calculator" in the same niche. Second choice at best. |
| 7 | **Tune Odds** | `tune-odds` | [26 results](https://api.github.com/search/repositories?q=tune-odds), keyword noise. `wuwa-echo-sim` shows up via its description. | free | Short, but out of context it reads like LLM fine-tuning. |

Rejected: **Echo Forecast** (`echo-forecast`), which collides with weather-radar "echo forecast" repos ([search](https://api.github.com/search/repositories?q=echo-forecast)). **Keep Tuning** (`keep-tuning`), which brings up 259 noisy hits and reads like "keep fine-tuning" ([search](https://api.github.com/search/repositories?q=keep-tuning)). **Echo Studio / Echo Workshop**, which are taken in this niche. Any **"WuWa …"** or **"Wuthering …"** name, to stay off the trademark (see below).

### Trademark note

- The [Wuthering Waves Terms of Use](https://wutheringwaves.kurogames.com/p/language_en/terms_of_service.html) (as summarised by search) bar using Kuro's "brands, service marks, trade names…" without written consent. The trademark owner of record is Guangzhou Kuro Technology Co., Ltd ([Justia](https://trademark.justia.com/owners/guangzhou-kuro-technology-co-ltd-4328339)).
- The [Guidelines for Derivative Works](https://wutheringwaves.kurogames.com/p/en/produce.html) set no naming or disclaimer rules. They explicitly exclude "software" from their scope, so they neither permit nor forbid fan tools.
- Peer tools already carry a "not affiliated with Kuro Games" footer (for example [WuWa Tools](https://wuwa-tools.pages.dev/echo-scorer.html) and [WuWaBuilds](https://wuwa.build/)).
- A name without "Wuthering Waves"/"WuWa"/"Kuro" is the safest choice. The game can still be named in the page's description and subtitle (for example "an Echo tuning planner for Wuthering Waves") together with the disclaimer. "Echo", "Tune" and "Tuner" are ordinary English words used as game terms. I did not find them registered as Kuro marks, but I did not search trademark registers for them.

### Recommendation

1. **Tune or Toss**: repo `tune-or-toss`, URL `https://kirass.github.io/tune-or-toss/`. It is the most distinctive and has no collisions found. It names the keep-or-discard decision and sounds nothing like the "Echo + noun" crowd. Pair it with a subtitle such as "Echo scoring and tuning planner for Wuthering Waves (fan-made)" so search engines and players still find it by game terms.
2. Runner-up: **Echo Odds** (`echo-odds`), if a name containing "Echo" is wanted for discoverability.

## Not verified

- GitHub repo search is tokenised keyword search. It does not prove that no repo has an exact slug under some user. Only repos that are public and indexed are covered. A few API queries hit the unauthenticated rate limit and were re-run later. The `wuwa in:name`, `echo reroll`, `tacet` and `kirass` queries were not re-run.
- Tools that are not on GitHub or not found by search were not surveyed: Discord bots, Reddit-only spreadsheets, mobile apps, Chinese/Korean/Japanese sites beyond those listed. Neither were the in-game or official Kuro "Echo" features.
- Domain availability (e.g. `tuneortoss.com`) and app-store names were not checked.
- Last-update dates for sites without repos (WuWa Tools, Wuthering Insight, Echo Value Calculator site, wuwa-optimizer) could not be determined from the pages.
- The Kuro Terms of Use wording comes from a search-result summary, not a full page read. Trademark registers were not searched for "Echo"/"Tune".
