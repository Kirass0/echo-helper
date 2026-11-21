# THROWAWAY: calculation speed benchmark

For [How fast the ported calculation runs in a browser](../../issues/13-calculation-speed-in-the-browser.md); findings in [research/13](../../research/13-calculation-speed-in-the-browser.md).

- `core.ts`: naive TypeScript port of the hot paths. `sorted.ts`: the distribution with sorted arrays instead of a `Map`.
- `bench.ts`: workloads. `index.html` + `bench.js`: open in a browser (freezes for ~15 minutes). `node node-run.mjs`: the same in Node.
- `csharp/`: the same workloads on copies of the source Core; `dotnet run -c Release -- ../valueTables.json`.
- `*-result.json`: raw results (per table in `perTable`). `sorted-probe.html`: Map vs sorted arrays.
- Rebuild the JS: `npx esbuild@0.25 browser-run.ts --bundle --format=iife --target=es2022 --outfile=bench.js`.
