# CLAUDE.md

Guidance for Claude Code (claude.ai/code) in this repository.

## Project Overview

Lockscreen Maker is a static web site that composites user-supplied text (name, contact info, and similar) onto a background image sized for a chosen screen, and produces a single downloadable image, so the result can be long-press saved and set as a phone lockscreen without a screenshot. It updates the 2023 tool described at https://github.com/timburr1/timburr1.github.io/blob/master/_posts/2023-08-05-lockscreen.md.

- Stack: TypeScript (strict), React, Vite, Node.js tooling. No backend; everything runs in the browser and no user data leaves the page.
- Deployment target: static hosting on the Azure free tier (Azure Static Web Apps).
- Design documents live in `docs/`.

## Commands

- `npm run dev`: Vite dev server.
- `npm test`: Vitest, single run (Node environment, no DOM).
- `npm run lint`: Biome check (markdown is excluded). `npx biome check --write .` fixes formatting.
- `npm run typecheck`: `tsc --noEmit`. `npm run build` typechecks, then builds to `dist/`.

Background images go in `src/assets/backgrounds/` (any filename; jpg, jpeg, png, webp). Architecture lives in `docs/design.md`.

## Interaction Guidelines

**Answer questions before coding**: When asked a question, provide an actual answer first. Don't leap straight to writing code.

**Never commit unless explicitly told to**: Complete the work and leave it uncommitted in the working tree. Only `git commit` when the current request explicitly asks for it ("commit this", "make a checkin"); a phrase like "let's make that a separate checkin" describes how the work should eventually be grouped, not permission to commit it yourself, and permission granted for one task never carries over to the next.

**Split significant work into small self-contained commits**: A significant change lands as a sequence of minimal commits, not one lump. Split along seams that carry meaning, each commit with a one-sentence story — never mechanically per-file or per-layer. The seams that matter:

- A pure refactor of existing code that the feature merely motivated is its own commit, landing *before* the feature that wanted it.
- A pre-existing bug fixed along the way is its own commit, however small.
- A behavior change to an existing system is separate from both the refactor that enabled it and the feature that exposed it — behavior changes are the commits people hunt for later.
- A vendored third-party drop stands alone.
- Conversely, keep together what only works together: the halves of a feature that can't be exercised separately, data plus the code that loads it.

Tests go in the commit that makes them meaningful, written against subjects the series doesn't later mutate. Every commit must build and pass the suite on its own — the history should be bisectable. Late fixes (review feedback included) get folded into the commit they belong to via fixup/autosquash, not appended as cleanup commits.

When I've told you to commit the work, apply this by default. When the work stays uncommitted, still build it as one unit in the working tree — but when you finish, point out that it's a good candidate for splitting and propose the commit sequence.

**Evaluate, don't assume**: "Why don't we X?" is a request for evaluation, not a suggestion to do X. Explain the tradeoffs, potential issues, or reasons why X might or might not be a good idea.

**Debug by evidence, not by guess**: When investigating a bug you don't fully understand, prefer adding diagnostic instrumentation or asking focused questions over making speculative changes. A confident theory backed by reading the code is fine to act on; a vibe is not. If a fix doesn't solve the user's problem, that's a signal that the theory was wrong — gather more data before trying again. Two consecutive failed fixes mean stop guessing entirely: pause, instrument, and ask.

**Err on the side of more diagnostic data, not less**: When you ask the user to run something — a probe build, a manual test, a copy-paste session — the expensive part is the round trip itself. When you instrument, instrument generously: log every variable that could plausibly disambiguate the bug, exercise every endpoint of the parameter space, include both the suspected-correct prediction *and* the alternatives so residuals are immediately visible.

**Waiting on background work is not a tool call**: When you've backgrounded a long command and have nothing else productive to do, just end the turn — its completion notification will re-invoke you automatically. Don't emit no-op commands to stay "active". Conversely, if a command fits the foreground timeout and you'd only wait for it anyway, run it in the foreground. Backgrounding *and* polling is the worst of both.

## Workflow

**Step 1 — Plan.** Enter plan mode (the actual `EnterPlanMode` tool — not a freeform text plan) and research the task and produce a plan. Skippable for trivial changes (under ~a dozen lines). Include unit tests in the plan whenever they're plausible to add — UI generally can't be tested, most other things can.

**Step 2 — Hostile-review the plan.** Before leaving plan mode, spawn a hostile-review agent (run it on Opus — `model: "opus"`) against the plan itself. Brief it like a design reviewer: explain the problem being solved, point it at CLAUDE.md (and the rest of the tree — it can read whatever it needs to research), give it the plan, but do not justify the plan's choices. Give it enough feedback space to actually push back on the approach. Apply the same adjudication rules as the final review (below). Fold valid objections into the plan, then exit plan mode.

**Step 3 — Tests first (when applicable).** For bugfixes, or any feature whose tests can be sensibly written before the implementation exists, write the tests first and verify they fail. Then complete the implementation.

**Step 4 — Run all tests.** Always, even when the change seems unrelated. If anything breaks, return to step 3 — or step 1 if the fix requires significant redesign. For UI changes that can't be unit-tested, explicitly say so rather than claiming success.

Don't treat a failing test as a hard veto on the change. Tests exist to catch *unintentional* drift — a test that pins behavior the change deliberately replaced should be updated alongside the code, not worked around to preserve the old behavior. Only fall back to step 3 / step 1 when the failure exposes an actual regression.

**Step 5 — Hostile review.** Spawn a hostile-review agent (run it on Opus — `model: "opus"`). Brief it like a PR reviewer: explain the problem being solved, point it at CLAUDE.md (and the rest of the tree — it can read whatever it needs to research), but do not explain or justify the implementation. Explicitly ask it to **review the general architecture** too, not just the diff — does the chosen approach fit the surrounding code, are there cleaner factorings, does it introduce abstractions that don't pay rent, etc. Give it enough feedback space to cover both the local change and the architectural read effectively. Then:
  - If it raises valid objections, fix them. Significant redesign → back to step 1; code changes → back to step 3.
  - If I disagree with an objection, push back once. If it still objects and I'm still confident, surface the disagreement to the user for adjudication rather than looping.
  - Either way — adjudication needed or not — give the user a quick summary of the review at the end.

(There is no CHANGELOG yet. If one is added, add a step requiring an `[unreleased]` entry for every user-facing change.)

## Coding Guidelines

**KISS / YAGNI / MVP**: Keep it simple. Write the simplest code that solves the current problem. Include what's necessary, not more. Don't build abstractions, features, or speculative generality that aren't immediately needed. Three similar lines is better than a premature abstraction.

**No backwards compatibility for its own sake**: Remove stubs and dead code completely. If something is unused or being replaced, delete it outright — don't leave shims, renamed `_unused` vars, `// removed` comments, or compatibility re-exports behind. The git history is the backwards compatibility.

**Error handling**:
- Don't add excessive or preemptive error handling. Trust internal code and framework guarantees; only validate at system boundaries (user input, uploaded files, external APIs).
- **Silent error handling is banned.** Never swallow exceptions or ignore error conditions. If something fails, it must be reported (via the project's logging facility) or thrown.
- Distinguish bugs from user mistakes. A user submitting bad input (an unreadable image, an absurd custom size) should get a specific, helpful message, not a generic failure. Reserve "internal error" for actual bugs. When adding features, ask: "Can a user trigger this exception through normal usage?" If yes, return a specific error with a helpful message.

**Don't hand-wrap lines**: One thought, one line — however long. Editors soft-wrap; you don't need to. The only exceptions are:
- **Distinct paragraphs** in a comment: separate with a **blank line**, not just a `\n`.
- **Structurally-aligned expressions**: one argument per line, one chained call per line, etc.

A multi-sentence single-thought comment is still one line.

**Composition over inheritance**: Prefer building behavior out of small composable pieces (functions, components, hooks, modules) over deep class hierarchies.

**Data-driven where it pays**: When a category of behavior is open-ended (device presets, background images, text layouts), prefer data files and a small interpreter over hardcoded code paths. When it's closed and unlikely to grow, just write the code.

## Commenting

A comment earns its place by saying something the code cannot: a non-obvious "why", a subtle constraint, a surprising choice or tradeoff — or signposting the flow of a long linear process. A one-line summary of what the next chunk of a long function is doing is genuinely useful, and often cleaner than extracting that chunk into a function called exactly once. A comment that restates what the name or a single line of code already makes plain is noise.

**Write for a reader who never saw the old code.** A comment that earns its place only by contrast with a previous version ("now done differently", "no longer does X") is history in disguise. State only what's true now, and delete the rest. The one exception is history that constrains the present — a warning against a change someone might actually make, or a deliberate deviation to reconcile later. Police this mainly in your own new comments — don't strip others' on suspicion alone.

**Adding — be conservative, but signpost freely.** Don't narrate the obvious. Reach first for self-explanatory code (good names, clear structure), and comment the part code can't carry — usually the *why*, not the *what*. When you explain a "why", keep it tight; one good line beats a paragraph. Don't reference the current task, fix, or callers ("used by X", "added for the Y flow", "handles the case from issue #123") — those belong in the commit message and rot as the codebase evolves.

**Removing — be generous about keeping.** Existing comments are there for a reason. If one is out of date or actively misleading, fix or remove it. Otherwise leave it alone.

## Naming

**Category-instance prefix**: When a name combines a category with an instance, put the category first so related names group alphabetically and the category reads as the classification. `DevicePresetIphone15`, `textLayoutCentered`, `exportPng()` — not `Iphone15DevicePreset`, `centeredTextLayout`, `pngExport()`. The category is the "kind of thing"; the instance is the specific variant. Apply this to types, functions, files, and config keys alike.

Standard TypeScript conventions otherwise: camelCase for functions, variables, and properties; PascalCase for types, classes, enums, and React components; SCREAMING_SNAKE_CASE only for true module-level constants. No `I` prefix on interfaces. File names are kebab-case, named for what the file exports (React component files too: `device-picker.tsx`). Node builtins are imported with the `node:` prefix; import order is the formatter's job.

## Critical Rules

1. **Always use absolute paths** in file operations. Relative paths break under tooling that runs from a different working directory than expected.
2. **Tests live next to the code they test.** New code without tests is a debt that compounds.

## Types

The "trust internal code, validate at system boundaries" rule only works if the types are honest, so the compiler is the first line of enforcement.

- `strict: true`, always. No `any`; use `unknown` at a boundary and narrow it. No `as` casts except immediately after validation at a boundary, and no non-null `!` except where the invariant is stated in a comment on the same line. `@ts-expect-error` with a reason where the compiler is genuinely wrong; never `@ts-ignore`.
- Boundaries are uploaded files, URL parameters, `localStorage`, JSON, and anything else from outside the program. Parse and validate there, once, into a typed value; downstream code trusts the type and does not re-check.
- Model variants as discriminated unions and exhaust them with a `switch` whose `default` asserts `never`. Prefer string-literal unions to `enum`.
- `undefined` is the absent value; `null` only where an external API demands it. Mark data that isn't meant to be mutated `readonly`.

## Parameters

The deciding axis is the *nature of the parameter*, not the mechanism.

- **A new parameter the function genuinely needs is mandatory.** Add it without `?` or a default and update the call sites. Don't reflexively make every new parameter optional just to avoid touching callers.
- **A default value is for a *conceptually optional* parameter** — one with a principled "absent" value: an optional callback or override, or a natural identity like `steepness = 1`. It is *not* for an arbitrary tuning constant that merely happens to suit most callers; make that mandatory or a named constant.
- **An options object is not an escape hatch.** A field the function needs is a required field of the options type; `?` on an options field passes the same conceptually-optional test as a parameter default.
- **Overload signatures are for genuinely different shapes** that can't collapse into one signature. Don't write an overload pair whose only difference is a trailing optional argument — use a default.
- **A behavior-switching bool may be a default-`false` parameter only when it's a rider on the same operation** — the result is the same kind of thing, the flag just tweaks a side aspect, and it's almost always off. When the flag changes *what the function fundamentally means*, make it a separate, differently-named function. Name any split function category first.

## Error Handling (TypeScript)

- An empty `catch {}` is a bug, and so is `.catch(() => {})`. If something fails, it must be reported via the project's logging facility, surfaced to the user, or rethrown.
- **Every promise is awaited, returned, or explicitly handled.** A floating promise is a swallowed error; enable the lint rule that forbids it and treat it as an error, not a warning.
- Turning an error into a default value with `??` or `||` is a silent swallow wearing a funny hat.
- Throw `Error` subclasses for failures a caller or user must distinguish (`ErrorImageDecode`), named category first; plain `Error` is for bugs. Never throw strings or bare objects. Set `cause` when wrapping.

## Composition and Dependency Injection

- Prefer modules of functions over classes, and plain data over class instances. A class earns its place when it owns a resource with a lifecycle. No inheritance hierarchies, no abstract base classes, no decorators, no DI containers.
- Keep logic (layout math, device presets, text fitting) in pure modules with no DOM access, so it is unit-testable in Node. Browser effects (canvas, `Image` decoding, file input, download) sit behind thin functions that take their dependencies as parameters; production code wires in the real implementations at the entry point, tests pass fakes.

## Async

- `async`/`await` throughout; no callback style, and no `.then` chains where `await` reads linearly. Sequential awaits in a loop are correct when the operations must be sequential; reach for `Promise.all` only when they genuinely are independent.
- Cancellation via `AbortSignal` only where a caller actually needs to cancel — YAGNI otherwise.

## Style

- A formatter and a linter are non-negotiable and their defaults win over taste. Biome, one tool for both, is the default choice. Set the line width wide (160 or more) so the formatter isn't hand-wrapping on your behalf.
- Always braces on `if`, `else`, `for`, and `while` bodies, even single-line ones.
- `function` declarations for named module-level functions; arrow functions for callbacks and inline closures.
- ES modules only. Named exports; a default export only where a framework or config file demands one.
- `const` by default; `let` only when reassigned; never `var`.
- React: function components and hooks only. State lives as low as it can; derive instead of syncing.

## Testing

Run the full test suite on every change, not just the tests you think are related. If the project ships with a watch mode or a fast subset, prefer that during the inner loop, but the final pre-commit step is the full run.

Vitest. A test file sits beside the module it tests (`stack.ts`, `stack.test.ts`); keep shared fakes and fixtures in a common support directory and extend those instead of hand-rolling per-file copies.

Write tests against the *seam* you actually want to defend — pure functions, deterministic state machines, parsers — and don't try to retrofit unit tests around UI or canvas rendering that has no testable seam. For those, say so explicitly when reporting status, and rely on a manual smoke instead of pretending coverage you don't have.

**Don't pin user-facing copy in tests.** Test text-producing logic relationally instead of asserting exact strings: non-empty, distinct across states that should read differently, equal across states that should read the same, exact match only for sentinels like `""`. Exact-match assertions remain correct when the exact output *is* the contract (serialization, parsers, formatters) or when the string is fixture data the test itself authored.

## Executing Actions with Care

Carefully consider the reversibility and blast radius of actions. Local, reversible actions (editing files, running tests, running ephemeral scripts) are fine to take freely. But for actions that are hard to reverse, affect shared systems beyond the local environment, or touch production, **confirm first**.

- Destructive: deleting files/branches, `rm -rf`, overwriting uncommitted changes.
- Hard to reverse: force-push, `git reset --hard`, amending published commits, dependency downgrades, CI/CD changes.
- Visible to others: pushing code, creating/closing PRs or issues, deploying, posting to external services.
- Uploading content to third-party tools (pastebins, diagram renderers): may be cached or indexed even if later deleted.

When you encounter an obstacle, do not use destructive actions as a shortcut to make it go away. Don't bypass safety checks (`--no-verify`, `--no-gpg-sign`) unless explicitly asked. If you discover unexpected state — unfamiliar files, branches, locks — investigate before deleting; it may be the user's in-progress work.

## Tone for Updates

Match response length to the task. A simple question gets a direct answer, not headers and sections. End-of-turn summaries should be one or two sentences — what changed and what's next. Don't narrate internal deliberation; state results and decisions directly.
