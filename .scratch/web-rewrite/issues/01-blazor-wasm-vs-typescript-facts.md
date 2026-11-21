# Blazor WebAssembly versus TypeScript: the facts

Type: research
Status: resolved
Map: [Echo Helper web rewrite](../map.md)

## Question

What are the hard facts that separate reusing the C# Core through Blazor WebAssembly from porting it to TypeScript, for a static app on GitHub Pages?

Surface, from primary sources (Microsoft Learn, GitHub Pages docs, the .NET repos) and from reading the source project at `%USERPROFILE%\source\repos\EchoHelperClaude` (read-only):

- Download size and time-to-interactive of a current-.NET Blazor WebAssembly standalone app on GitHub Pages, with and without trimming, AOT and Brotli (check what compression GitHub Pages actually serves and what pre-compressed files require).
- What GitHub Pages needs for a Blazor WASM app (base path under `/<repo>/`, `.nojekyll`, the 404 fallback for client routing) versus for a Vite-style static build.
- Expected calculation speed of the exact algorithm (source ADR 0003: about 150 ms for a whole Value Table natively) under interpreted WASM, AOT WASM, and plain JavaScript, and what running it off the UI thread takes in each (Blazor web workers versus JS Web Workers).
- How much of the source is actually reusable: which parts of `EchoHelper.Core` carry over untouched under Blazor, and what in `EchoHelper.Wpf` (view models, charts, settings) would be rewritten either way. Give line counts.
- The state of the UI and charting ecosystem on each side for this kind of app (forms, a rule editor, a distribution chart, a bar chart): named libraries only, no recommendation.

This ticket gathers facts. It does not pick the stack; that is [Which stack the web app is built on](02-stack.md).

## Answer

Full findings with a source for each claim: [research/01-blazor-wasm-vs-typescript-facts.md](../research/01-blazor-wasm-vs-typescript-facts.md). The findings file labels each claim as measured, from a primary source, an estimate, or unverified.

- **.NET version:** .NET 11 (STS) shipped on 2026-11-10, and .NET 10 is the current LTS. .NET 9, which the source project targets, went out of support on 2026-11-10.
- **Compression on GitHub Pages:** Pages serves gzip only, including `.wasm` files (measured). Brotli needs the JS `decode.js` decoder plus a `loadBootResource` hook (Microsoft Learn).
- **Download size:** Microsoft's own small interpreted `net10.0` Blazor sample on Pages downloads about 3.3 MB gzip, 2.6 MB with Brotli via `decode.js`, or 8.3 MB uncompressed (measured).
  - AOT is documented as "about twice the size", so roughly 4 to 6 MB gzip (estimate).
  - A Vite/TS build has no runtime to download. It is likely tens to a few hundred KB (estimate).
- **Time-to-interactive:** no primary source gives a Blazor time-to-interactive figure, and none was measured.
- **Pages setup for Blazor:**
  - a `<base href="/<repo>/">` rewrite at deploy time;
  - `.nojekyll`, because `_framework` starts with an underscore;
  - `*.js binary` in `.gitattributes` to avoid SRI failures;
  - the `404.html` SPA redirect if routes are deep-linked.
- **Pages setup for Vite:** set `base: '/<repo>/'` and use the standard Actions workflow. The SPA 404 trick is only needed for deep-linked routes.
- **Calculation speed:** native is about 150 ms per Value Table (ADR 0003). Microsoft says interpreted WASM is "slower" and that AOT gives "dramatic improvements", but gives no factors. Every WASM and JS speed figure is an estimate. A benchmark prototype is needed.
- **Blazor's UI thread:** Blazor WASM runs on the UI thread and `Task.Run` doesn't help. Multithreading is still experimental and needs COOP/COEP headers, which GitHub Pages cannot send.
- **Blazor Web Workers:** .NET 11 adds `dotnet new blazorwebworker` with `WebWorkerClient.InvokeAsync`.
  - Arguments and results are `[JSExport]` primitives, strings or JSON.
  - Each worker boots its own .NET runtime.
  - Progress reporting isn't documented.
- **TS Web Workers:** standard browser workers, bundled by Vite, with structured clone and `postMessage` for progress. They need no special headers.
- **Reusable code under Blazor:**
  - `EchoHelper.Core` (1,050 lines) and its tests, including the sampling oracle (1,432 lines), carry over nearly untouched.
  - The exceptions are file IO in `ValueTableFile` and a `Parallel.For` in `UpgradeStrategyPass.PrepareChances`. Its browser behaviour is unverified, so a prototype must check it.
- **Rewritten either way:** the WPF view models (1,416), views (688), settings (143), shell (83) and WPF tests (3,564), about 5,970 lines in total.
- **A TS port has to rewrite the ~2,480 lines of Core and Core tests.** Two hazards to note:
  - a struct dictionary key that has to become a composite key;
  - `Math.Round(x, 12)` and the 1e-9 tolerance, which have to be reproduced exactly.
- **Blazor UI and charting:** built-in `EditForm`/`QuickGrid`, MudBlazor (MIT, SVG charts including bar and line), Radzen (MIT), Fluent UI Blazor (MIT), Blazor-ApexCharts (MIT), Blazorise (commercial licence), and ScottPlot.Blazor (MIT, pulls in SkiaSharp's native WASM).
- **TS UI and charting:** React, Vue, Svelte, Solid or Preact with Vite; charts from Chart.js, ECharts, uPlot, Observable Plot, Recharts or D3.
