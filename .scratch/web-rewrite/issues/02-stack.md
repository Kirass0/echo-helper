# Which stack the web app is built on

Type: grilling
Status: resolved
Blocked by: 01
Map: [Echo Helper web rewrite](../map.md)

## Question

Is the web app built with Blazor WebAssembly reusing `EchoHelper.Core`, or as a TypeScript port, and with which UI framework, build tool, test runner and charting approach?

Decide from the facts in [Blazor WebAssembly versus TypeScript: the facts](01-blazor-wasm-vs-typescript-facts.md), weighed against the first-load experience for a new visitor, the owner's comfort maintaining it, and how well agents can build and verify it.

## Answer

Decided with the owner in a grilling session on 2026-11-16. The lock-in part is recorded as [ADR 0001](../../../docs/adr/0001-typescript-port-instead-of-blazor-webassembly.md).

- **Language and stack:** a TypeScript port, not Blazor WebAssembly. First-load size for a new visitor (about 3.3 MB gzip for Blazor on Pages against an estimated tens to a few hundred KB) and simple Web Workers outweighed reusing Core and its tests.
  - The owner is comfortable owning a TypeScript codebase that agents mostly write and the owner reviews.
  - Decided without a benchmark. Measured speed is handled by [How fast the ported calculation runs in a browser](13-calculation-speed-in-the-browser.md).
- **Language settings:** TypeScript in `strict` mode.
- **UI framework:** React, chosen for agent reliability and its testing ecosystem.
- **State:** React's built-in state (`useState`, `useReducer`, context), no state library. [What the browser remembers](10-persistence.md) may add a small store if saving and restoring needs it.
- **Styling:** plain CSS with CSS Modules and custom properties. No component library and no Tailwind. A headless accessibility library (such as Radix) may be added by the UX tickets if dialogs, popovers or tooltips need it.
- **Build tool:** Vite, with npm as the package manager.
- **Core:** a plain TypeScript module with no React or DOM imports, so its tests run in Node and it can run inside a Web Worker.
- **Tests:**
  - Vitest for the Core, including the ported sampling oracle.
  - Vitest with React Testing Library for components.
  - Playwright for a handful of smoke tests per tab in a real browser, including a phone-width check.
- **Charts:** own SVG components using only `d3-scale` and `d3-shape`, with no chart library. Observable Plot is the fallback if owning axes and tooltips proves too costly.
- **Routing:** no router library. The open tab lives in the URL hash (`#evaluation`, `#strategy`), which avoids the GitHub Pages `404.html` redirect.
- **Quality checks:** ESLint (TypeScript and React hooks rules) and Prettier, run with type checking and tests in CI. The CI wiring belongs to [Hosting and delivery on GitHub Pages](12-hosting-and-delivery.md).
