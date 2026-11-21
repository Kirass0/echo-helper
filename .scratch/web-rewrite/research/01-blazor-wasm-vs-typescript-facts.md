# Blazor WebAssembly versus TypeScript: the facts

Research for [ticket 01](../issues/01-blazor-wasm-vs-typescript-facts.md). Facts only, with no stack recommendation; [ticket 02](../issues/02-stack.md) makes the decision.

Gathered 2026-11-16. Each web claim cites its source. The labels mean:

- **[measured]**: I observed it today, with the command or source given.
- **[source]**: it comes from primary documentation or code.
- **[estimate]**: my own reasoning. Nobody has measured it, so do not treat it as a number.
- **[unverified]**: I looked and could not confirm it.

## 0. Which .NET is current

- **.NET 11** (STS) was released on 2026-11-10. Its latest patch is 11.0.0 and it is supported until 2028-11-14. **.NET 10** (LTS, 10.0.15) is supported until the same date. [source] https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core
- **.NET 9 and .NET 8 reached end of support on 2026-11-10** [source, same page]. The source project targets `net9.0` and `net9.0-windows`, read from `EchoHelper.Core.csproj` and `EchoHelper.Wpf.csproj`. Whichever stack is picked, the C# would at least need to be retargeted to stay supported.
- Microsoft Learn still serves the `aspnetcore-10.0` moniker by default, and every 10.0 page carries a note pointing to a ".NET 11 version of this article". Most pages quoted below were served at 10.0 with 11.0 content in moniker blocks. Where 10 and 11 differ, I say so.

## 1. Download size and time-to-interactive (Blazor WASM on GitHub Pages)

### What GitHub Pages actually serves

- **GitHub Pages compresses on the fly with gzip only. It does not serve Brotli.** [measured] I sent `curl -I -H "Accept-Encoding: br, gzip"` to `https://dotnet.github.io/blazor-samples/`, Microsoft's own Blazor sample on Pages. The response for both `index.html` and `_framework/*.wasm` (`Content-Type: application/wasm`) was `Content-Encoding: gzip` with `Vary: Accept-Encoding`. The sample's `index.html` has a comment saying GitHub Pages doesn't gzip `.dll` files. That is outdated for .NET 8+ output, because assemblies now ship as `.wasm` (Webcil) and were gzipped today.
- Microsoft says the same thing: "GitHub Pages doesn't natively support using Brotli-compressed resources." [source] https://learn.microsoft.com/en-us/aspnet/core/blazor/host-and-deploy/webassembly/github-pages
- Blazor publish pre-compresses everything to `.br` (highest level) and `.gz`, and "Blazor relies on the host to serve the appropriate compressed files" [source] https://learn.microsoft.com/en-us/aspnet/core/blazor/host-and-deploy/webassembly/ (Compression section).
- **To use the pre-compressed `.br` files on Pages, three things are needed:**
  - ship the JS Brotli decoder (`decode.min.js` from `google/brotli`);
  - set `autostart="false"` on the Blazor script;
  - add a `Blazor.start({ loadBootResource })` hook that fetches `<file>.br`, decodes it in JS and builds a `Response`.

  [source] Same Learn page, and the live sample's `index.html` does exactly this. The decoding runs in JavaScript on the page. I did not measure its CPU cost. [unverified]
- GitHub Pages documents no way to set custom HTTP headers. Its limits page covers size, bandwidth, builds and timeout, and says nothing on headers, compression or MIME types. [source] https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits

### Measured size of a real, small, current Blazor WASM app on Pages

Microsoft's `BlazorWebAssemblyXrefGenerator` is a one-page tool. It targets `net10.0` (package 10.0.15), is interpreted (no `RunAOTCompilation`), uses the default Release trimming and sharded ICU globalization (`"globalizationMode": "sharded"` in its boot config), and loads Bootstrap CSS. Sources: [csproj](https://github.com/dotnet/blazor-samples/blob/main/BlazorWebAssemblyXrefGenerator/BlazorWebAssemblyXrefGenerator.csproj) and the [live site](https://dotnet.github.io/blazor-samples/). I downloaded every `_framework` file listed in its boot manifest: 46 `.wasm` files and 6 JS files, plus the English-locale ICU shard `icudt_EFIGS.dat`. [measured]

| Content | Uncompressed | As GitHub Pages serves it (gzip) | Pre-compressed `.br` (needs `decode.js`) |
|---|---|---|---|
| `_framework` wasm and JS (52 files) | 7.79 MB | 3.08 MB | 2.45 MB |
| ICU shard `icudt_EFIGS.dat` | 0.55 MB | 0.20 MB | 0.14 MB |
| **Total runtime payload** | **~8.3 MB** | **~3.27 MB** | **~2.60 MB** |

The largest items are `dotnet.native.wasm` (the runtime) at 3.0 MB raw, 1.20 MB gzip and 0.98 MB br, and `System.Private.CoreLib` at 1.8 MB raw, 0.69 MB gzip and 0.56 MB br. App CSS and Bootstrap are not included.

### Knobs and their documented direction (no official numbers)

- **Trimming (IL trimming)** runs on every Release build [source] (Learn, "Configure the Trimmer"). The table above is already trimmed.
- **Runtime relinking** needs the `wasm-tools` workload. It runs on a Release publish and "the size reduction is particularly dramatic when disabling globalization" [source] https://learn.microsoft.com/en-us/aspnet/core/blazor/performance/webassembly-runtime-performance. Note that the sample above was published without the workload, so it is not relinked. I have not measured how much `InvariantGlobalization=true` with relinking saves. [unverified] It would at least drop the ICU file (~0.2 MB gzip) [estimate].
- **AOT** (`RunAOTCompilation`): "most AOT-compiled apps are about twice the size of their IL-compiled versions". AOT "doesn't trim out managed DLLs". `WasmStripILAfterAOT` removes the IL of most AOT-compiled methods, which shrinks the size again. AOT runs only on publish and "usually takes several minutes on small projects". [source] https://learn.microsoft.com/en-us/aspnet/core/blazor/webassembly-build-tools-and-aot and the runtime-performance page above.
  - **Estimate:** an AOT build of an app this size would download roughly 4 to 6 MB gzip on Pages. This comes from the "about twice" figure applied to the measured 3.27 MB, softened for IL stripping. [estimate]
- **Mobile memory:** the default max heap is 2 GB, and Learn advises lowering `EmccMaximumHeapSize` (for example to 256 MB) for Safari on iOS [source] (host-and-deploy/webassembly page).

### Time-to-interactive

- **No primary source gives a Blazor WASM time-to-interactive figure, and I did not measure one.** [unverified]
- Arithmetic only [estimate]:
  - 3.3 MB at 10 Mbit/s is about 2.6 s of transfer, and at 50 Mbit/s about 0.5 s.
  - Runtime start-up and JIT/interpreter warm-up come on top of that.
  - Later visits are served from the browser cache. GitHub Pages sent `Cache-Control: max-age=600` [measured], and Blazor's fingerprinted file names allow long-lived caching.
- A Vite/TypeScript static build has no runtime download. Its size is the app code plus whatever UI and chart libraries it uses. That is typically in the tens to low hundreds of KB gzip, so 1 to 2 orders of magnitude less than Blazor's ~3 MB floor [estimate]. Bundle size has to be measured once the libraries are chosen.

## 2. What GitHub Pages needs

### Blazor WebAssembly standalone

All of the following is from [source] https://learn.microsoft.com/en-us/aspnet/core/blazor/host-and-deploy/webassembly/github-pages, and the live sample matches it.

- **Pages source:** GitHub Actions. Microsoft's template is `dotnet/blazor-samples/.github/workflows/static.yml`.
  - It runs `actions/setup-dotnet` (`dotnet-version` can't be "latest") and then `dotnet publish -c Release`.
  - It publishes `bin/Release/net1x.0/publish/wwwroot`.
- **Base path:** `<base href="/<repo>/" />` in `wwwroot/index.html`. Microsoft rewrites it at deploy time with the third-party action `SteveSandersonMS/ghaction-rewrite-base-href`, pinned by SHA. The live sample has `<base href="/blazor-samples/" />` [measured]. Locally, the `--pathbase` option without a trailing slash mirrors it.
- **`.nojekyll`:** "The default GitHub Action, which deploys pages, skips deployment of folders starting with underscore, the `_framework` folder for example." The fix is an empty `.nojekyll`. GitHub's Jekyll docs confirm that Jekyll doesn't build files or folders that "Start with `_`, `.`, or `#`" [source] https://docs.github.com/en/pages/setting-up-a-github-pages-site-with-jekyll/about-github-pages-and-jekyll. GitHub's docs don't say directly whether Jekyll runs under a custom Actions workflow [unverified]. Microsoft's guidance adds the file regardless.
- **`.gitattributes` with `*.js binary`:** this stops Git from rewriting line endings in JS files, which would break Blazor's integrity (SRI hash) checks. It matters only when the publish output passes through Git.
- **SPA routing 404 fallback:** a `wwwroot/404.html` redirect script plus a matching script in `index.html` `<head>`, from `rafrex/spa-github-pages`. It is needed only if the app uses client-side routes that can be deep-linked. GitHub itself only documents that a `404.html` at the publishing source is served for missing paths [source] https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-custom-404-page-for-your-github-pages-site.
- **Optional:** Brotli via `decode.js` and `loadBootResource` (section 1).

### Vite-style static build

- Set `base: '/<REPO>/'` in the Vite config, or `'/'` for a `<user>.github.io` repo or a custom domain.
- Set Settings → Pages → Source to "GitHub Actions". The workflow runs `npm run build`, uploads `./dist` and deploys with `actions/deploy-pages`.
- [source] https://vite.dev/guide/static-deploy
- Vite's guide does not mention `.nojekyll` or SPA 404s. Vite's output folder is `assets/` (no underscore), so the Jekyll underscore rule does not bite [estimate, based on Vite's default `build.assetsDir`]. The same 404 trick, or hash routing, is needed only if the app uses deep-linkable client routes.
- **Common to both:** published sites can be at most 1 GB, the soft bandwidth limit is 100 GB per month, and deployments time out after 10 minutes [source] (Pages limits page). Neither stack comes close.

## 3. Calculation speed and running off the UI thread

### What the source says it costs natively

- ADR 0003 (source project, `docs/adr/0003-results-are-calculated-exactly.md`) says the exact tables take "about 150 ms for a whole Value Table" (the Top Percent calculation) on native .NET. I found no native timing in the docs for the Upgrade Strategy pass. Its Chance rules build `FinishingEchoValues` tables for many Substat type sets, and that is the heavy part.
- The algorithm is dominated by:
  - `Dictionary` inserts and merges keyed by `double`, or by the struct `TunedEcho(int Types, double EchoValue, ulong Rolls)`;
  - `Math.Round`;
  - small arrays.

  It is not SIMD or vector code. It uses `CollectionsMarshal.GetValueRefOrAddDefault` and `BitOperations.PopCount` (read from `UpgradeStrategyPass.cs`, `EchoValueDistribution.cs` and `FinishingEchoValues.cs`).
- `UpgradeRuleContext.PrepareChances` uses **`Parallel.For`** to build Chance-rule tables in parallel (`UpgradeStrategyPass.cs`, around line 215). The WPF app also pushes work to the thread pool with `Task.Run` (`CalculationRun.cs`, `EchoEvaluationViewModel.cs`, `ValueTableEvaluationViewModel.cs`).

### Speed in each engine

- **Interpreted WASM (Blazor default):** Microsoft says IL runs on "an IL interpreter implemented in WebAssembly with partial JIT runtime support, informally referred to as the Jiterpreter", and that "apps typically run slower than they would on a server-side .NET JIT runtime" [source] (AOT page). Microsoft gives no factor.
  - **Estimate:** dictionary-heavy managed code is commonly several times to 10× or more slower than native .NET under the interpreter. That would put 150 ms native somewhere around 0.5 to 2 s or more. [estimate, unverified]
- **AOT WASM:** "The AOT performance improvement can yield dramatic improvements for apps that execute CPU-intensive tasks" [source] (AOT page). Microsoft gives no factor.
  - **Estimate:** within roughly 1.5 to 3× of native for this kind of code. [estimate, unverified]
- **Plain JavaScript or TypeScript (V8, SpiderMonkey, JSC JITs):** I found no primary benchmark for this algorithm.
  - **Estimate:** a careful port with numeric keys in `Map` or typed arrays, avoiding string keys and BigInt in the hot loop, would land within roughly 1 to 3× of native .NET. [estimate, unverified]
  - Port hazards I read from the code:
    - The `TunedEcho` struct key has to become a numeric or string composite key. JS `Map` compares object keys by reference.
    - `ulong Rolls` packs 4 bits per StatValue-named Substat type. Thirteen slots would need 52 bits, which still fits a JS double exactly, since 2^53 is the integer-precision limit. Fewer slots fit trivially.
    - The 1e-9 equality tolerance and `Math.Round(x, 12)` have to be reproduced exactly. JS has no decimal-places round, so it would need to be emulated.
- **None of the three numbers above is a measurement.** A throwaway benchmark (same Value Table, same machine, all three engines) is the only way to turn them into facts.

### Running it off the UI thread

- **Blazor WASM runs on the browser UI thread** ("The app is executed directly on the browser UI thread") [source] (host-and-deploy/webassembly page). `Task.Run` does not move work off it.
  - Blocking waits throw `PlatformNotSupportedException` ("Cannot wait on monitors on this runtime"). This is widely reported, but I did not confirm it in a primary doc. [unverified]
  - A January 2026 runtime PR adds `ThrowIfSingleThreaded` guards for blocking waits in single-threaded browser builds [source] https://github.com/dotnet/runtime/pull/123329.
- **`Parallel.For` in single-threaded WASM:** dotnet/runtime issue #43411, titled "Blazor client developers can use Parallel.For in their applications to share more code with server", was closed in 2021 [source] https://github.com/dotnet/runtime/issues/43411. That suggests it runs serially on the calling thread rather than throwing. I did not verify how it behaves in .NET 11 after PR 123329 [unverified], so a prototype must check it.
- **Multithreading (`WasmEnableThreads`)** is still an "experiment" and "currently disabled by default". It needs the `Cross-Origin-Embedder-Policy: require-corp` and `Cross-Origin-Opener-Policy: same-origin` response headers [source] https://github.com/dotnet/runtime/blob/main/src/mono/wasm/features.md. **GitHub Pages cannot set custom headers** (section 1), so this route is closed on Pages unless a service-worker header shim is used. I did not investigate such shims. [unverified]
- **Blazor plus Web Workers (.NET 11):**
  - The new `dotnet new blazorwebworker` template generates a worker class library with a C# `WebWorkerClient` (`CreateAsync`, `InvokeAsync<T>(method, args, timeoutMs, cancellationToken)`, `InvokeVoidAsync`, `DisposeAsync`), plus JS worker scripts.
  - Worker methods are `[JSExport]` static methods. "Due to `[JSExport]` limitations, worker methods should use JS interop-friendly types such as primitives and strings. For complex data, serialize to JSON".
  - `CreateAsync` "waits for the .NET runtime to be ready inside the worker thread", so the worker boots its own runtime instance.
  - Learn advises "prefer persistent workers over frequent creation/destruction" because of start-up overhead.
  - On .NET 10 and earlier the same thing is done by hand with `wasmbrowser`, `JSImport`/`JSExport` and a handwritten `worker.js`.
  - [source] https://learn.microsoft.com/en-us/aspnet/core/blazor/blazor-with-dotnet-on-web-workers?view=aspnetcore-11.0 and https://learn.microsoft.com/en-us/aspnet/core/client-side/dotnet-on-webworkers?view=aspnetcore-11.0
  - **Not documented:** progress reporting from the worker back to the UI (the WPF app uses `IProgress<double>`), and whether the `CancellationToken` actually interrupts running worker code or only abandons the wait. [unverified] It also takes extra memory to hold a second runtime. [estimate]
- **TypeScript plus Web Workers:** a standard browser API, MDN Web Workers.
  - Vite bundles workers with `new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })`, which it calls the recommended way. A `?worker` import suffix is the alternative. [source] https://vite.dev/guide/features (Web Workers section).
  - Structured clone carries plain objects and typed arrays without JSON.
  - Progress is a `postMessage` from the worker. Cancellation is `worker.terminate()` or a flag checked between steps. A worker can be many workers to mirror `Parallel.For`, with no special headers needed (only `SharedArrayBuffer` needs COOP/COEP).

## 4. How much of the source is reusable

Line counts come from `wc -l` (all lines, blank lines included) on `.cs` and `.xaml` files, excluding `bin` and `obj`, read-only in `EchoHelperClaude`.

| Area | Files | Lines | Under Blazor WASM | Under a TypeScript port |
|---|---|---|---|---|
| `EchoHelper.Core` (C#) | 11 | **1,050** (814 non-blank, non-comment) | Carries over almost entirely (see the notes below) | Rewritten in TS |
| `EchoHelper.Core.Tests` (xUnit, includes the sampling simulators that ADR 0003 calls the oracle) | 10 | **1,432** | Carries over: runs as a normal `net11.0` test project, no browser needed | Rewritten (e.g. Vitest), including the simulators |
| `EchoHelper.Wpf/ViewModels` | 17 | **1,416** | Logic partly adaptable to Razor components. INotifyPropertyChanged/`RelayCommand` plumbing is WPF-style and Blazor doesn't need it. | Rewritten |
| `EchoHelper.Wpf/Views` (XAML, ScottPlot charts, converters) | 10 | **688** | Rewritten (Razor/HTML/CSS) | Rewritten |
| `EchoHelper.Wpf/Settings` (JSON file in `%AppData%`) | 3 | **143** | Rewritten (localStorage/IndexedDB via JS interop) | Rewritten |
| `EchoHelper.Wpf` app shell (`App`, `MainWindow`) | 4 | 83 | Rewritten | Rewritten |
| `EchoHelper.Wpf.Tests` | 11 | **3,564** | Mostly rewritten. They test WPF view models and views (`ViewSmokeTests` is 873 lines). | Rewritten |
| `data/valueTables.json` | 1 | 506 | Data carries over as-is | Data carries over as-is |

Notes on Core under Blazor, read from the code:

- **Pure computation, no WPF references.** It targets `net9.0` (not `-windows`) and has no package references (`EchoHelper.Core.csproj`). Retargeting to `net10.0` or `net11.0` should be a one-line change [estimate].
- **`ValueTableFile` (150 lines) does file IO** (`File.ReadAllText`, `File.Create`), and its error text speaks of "the file". The JSON `Parse` part carries over. Load and save would be rewritten for the browser, and the map has already decided that Value Tables ship built in, which reverses ADR 0002.
- **`Parallel.For` in `PrepareChances`** has an unverified browser behaviour (section 3). The method might need a serial path or a move into a worker.
- **Cancellation and progress:** `CancellationToken` and `IProgress<double>` are in the Core signatures. They work in-process, but inside a `[JSExport]` worker method they don't cross the boundary as-is [estimate, from the `[JSExport]` type limits above].
- **Library features in the browser:** `System.Text.Json` and `CollectionsMarshal` are standard BCL and run in browser WASM. `System.Text.Json` is one of the 46 assemblies in the measured sample.

For scale: of the roughly 8,450 lines in the solution, about 2,480 (Core plus Core tests) are what Blazor would reuse untouched. The other roughly 5,970 lines (WPF and WPF tests) are rewritten under either stack.

## 5. UI and charting ecosystem (named libraries only, no recommendation)

The app needs: forms (Substat rows, numeric inputs), a Rule Group editor (nested, dynamic lists), a distribution (cumulative or line) chart, and a bar chart (discard rates). Stars, licences and last-push dates come from the GitHub API on 2026-11-16 [measured].

### Blazor (C#)

- **Built into the framework:**
  - `EditForm`, `InputNumber`, `InputSelect` and `DataAnnotationsValidator` cover forms;
  - `QuickGrid` covers tables.
  - [source] https://learn.microsoft.com/en-us/aspnet/core/blazor/forms/
- **MudBlazor**: MIT, about 10.7k stars, active. Material component set with built-in SVG charts: `Bar`, `StackedBar`, `Line`, `TimeSeries`, `ScatterPlot`, `Pie`, `Donut`, `Radar`, `Rose`, `HeatMap` and `Sankey` (from the repo's `src/MudBlazor/Components/Chart/Charts`). Source: https://github.com/MudBlazor/MudBlazor
- **Radzen Blazor Components**: MIT, about 4.4k stars, active. A component suite that includes charts. Source: https://github.com/radzenhq/radzen-blazor
- **Microsoft Fluent UI Blazor**: MIT, about 4.9k stars, active. Components only, with no first-party charts that I confirmed [unverified]. Source: https://github.com/microsoft/fluentui-blazor
- **Blazor-ApexCharts**: MIT, about 1.1k stars, active. A wrapper around the ApexCharts JS library. Source: https://github.com/apexcharts/Blazor-ApexCharts
- **Blazorise**: the repo licence is a custom commercial SLA ("By accessing the Blazorise code here, you are agreeing to…") rather than MIT. Source: https://github.com/Megabit/Blazorise
- **ScottPlot.Blazor** (ScottPlot is what the WPF app uses today, `ScottPlot.WPF` 5.1.59): MIT, about 6.8k stars. A `ScottPlot.Blazor` control exists. It depends on `SkiaSharp.Views.Blazor` 3.119 (from the csproj in https://github.com/ScottPlot/ScottPlot), so SkiaSharp's native WASM ships to the browser. I did not measure how big that is, but it is a large native library. [unverified]
- Commercial suites such as Syncfusion, Telerik and DevExpress also exist (not investigated).

### TypeScript / JavaScript

- **UI frameworks:** React, Vue, Svelte, Solid and Preact are all usable with Vite. Vite's own scaffolds cover them [source] https://vite.dev/guide/. Plain TS with no framework is also possible.
- **Forms:** each framework has its own (e.g. React Hook Form for React). The Rule Group editor is a custom component on either side. No off-the-shelf "rule editor" is assumed.
- **Charts:**
  - **Chart.js**: MIT, about 67.8k stars, canvas. https://github.com/chartjs/Chart.js
  - **Apache ECharts**: Apache-2.0, about 67.7k stars, canvas and SVG. https://github.com/apache/echarts
  - **uPlot**: MIT, about 10.6k stars, small and fast, canvas, line and bar series. https://github.com/leeoniya/uPlot
  - **Observable Plot**: ISC, about 5.4k stars, SVG, built on D3. https://github.com/observablehq/plot
  - **Recharts**: MIT, about 27.7k stars, React and SVG. https://github.com/recharts/recharts
  - **D3** itself for fully custom SVG.

## Could not verify (open for a prototype)

1. Time-to-interactive of a Blazor WASM app on GitHub Pages, whether interpreted, AOT or invariant-globalization/relinked.
2. The calculation time of `EchoCalculator` and `UpgradeStrategyPass` under interpreted WASM, AOT WASM and a TS port. All the figures in section 3 are estimates.
3. Whether `Parallel.For` runs serially or throws in .NET 11 single-threaded browser WASM.
4. Whether `WebWorkerClient` cancellation interrupts running worker code, and how to report progress from a worker.
5. The size of the AOT, relinked and invariant builds, and of `SkiaSharp.Views.Blazor` (for ScottPlot.Blazor).
6. Whether Jekyll runs under a custom Actions Pages workflow. It doesn't matter for Vite's `assets/`, and Microsoft's guidance adds `.nojekyll` regardless.
