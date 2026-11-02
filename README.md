# lockscreen-maker

![](https://img.shields.io/github/repo-size/timburr1/lockscreen-maker)
![](https://img.shields.io/github/contributors/timburr1/lockscreen-maker)
![](https://img.shields.io/github/last-commit/timburr1/lockscreen-maker)

Lockscreen Maker is a static web site that composites user-supplied text (name, contact info, and similar) onto a background image sized for a chosen screen, and produces a single downloadable image so the result can be long-press saved and set as a phone lockscreen without a screenshot.

## Development

Requires Node 22 or newer.

```sh
npm install        # install dependencies
npm run dev        # start the dev server
npm run build      # typecheck, then build to dist/
npm run preview    # serve the production build locally
npm test           # run the unit tests
npm run lint       # lint and format check (Biome)
npm run typecheck  # tsc --noEmit
```

`npx biome check --write .` fixes formatting and safe lint issues.

## Backgrounds

Add images (`jpg`, `jpeg`, `png`, or `webp`, any filename) to `src/assets/backgrounds/`. They are picked up automatically. Use Creative Commons images only, and credit them in `src/assets/backgrounds/credits.json`.

## Docs

Design: [docs/design.md](docs/design.md).
