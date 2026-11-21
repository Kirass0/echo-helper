# The web app is a TypeScript port, not Blazor WebAssembly on the old Core

The web rewrite ports the calculation Core from C# to TypeScript instead of reusing `EchoHelper.Core` through Blazor WebAssembly. Blazor would have kept Core and its tests (about 2,480 lines, including the sampling oracle) untouched, but on GitHub Pages it costs every first-time visitor about 3.3 MB gzip (Pages serves no Brotli), and running calculations off the UI thread needs a second .NET runtime in a Web Worker with undocumented progress reporting. The audience is a player opening the tool for the first time, so first load won; a TypeScript build ships no runtime, and workers, progress and cancellation are standard browser features.

## Considered Options

- **Blazor WebAssembly reusing Core.** Rejected for the download size and the worker story above. It would have won if the owner had wanted to stay in C#; the owner chose to own a TypeScript codebase.
- **Benchmarking interpreted WASM, AOT WASM and JS first.** Skipped: JS is estimated at 1 to 3 times native speed and a worker is cheap if it is slower, so no plausible result would have changed the choice.

## Consequences

- Core and its tests are rewritten, so the port must be proven equal to the C# Core. The source project stays the reference for that.
- Two known port hazards: the `TunedEcho` struct used as a dictionary key must become a composite numeric or string key, and `Math.Round(x, 12)` with the 1e-9 equality tolerance must be reproduced exactly.

Facts behind this decision: `.scratch/web-rewrite/research/01-blazor-wasm-vs-typescript-facts.md`.
