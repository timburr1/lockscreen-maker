# Lockscreen Maker: Prototype Design

Status: draft for the initial functional prototype. Decisions marked **Open** need confirmation; everything else is a working decision.

## 1. Goal

A static web page where a user picks a screen size and a background image, types a few lines of text (name, phone, "if found, call…"), and gets back one finished image with the text baked in. On a phone they long-press the image and choose "Save Image" (or "Add to Photos"), then set it as the wallpaper. No screenshot, no cropping.

This replaces the 2023 version (https://github.com/timburr1/timburr1.github.io/blob/master/_posts/2023-08-05-lockscreen.md), which had fixed Burning Man fields, a random pick from 15 backgrounds, text in HTML over an image, and a screenshot step. Differences:

| 2023 tool | This tool |
| --- | --- |
| Fixed fields (name, playa address, camp, email, emergency contact) | Free-form lines |
| Random background | Pick from a bundled set, or upload your own |
| One layout, screenshot and trim | Output sized exactly to the chosen screen |
| Text colour hardcoded per image | Auto-chosen from the image, user can override |

### Non-goals for the prototype

- Accounts, a backend, analytics, or any network call after the page loads.
- Persisting anything (see §9).
- Drag-and-drop text positioning, per-line styling, custom fonts, filters, stickers, or any general image editing.
- Native lockscreen widget fidelity. We approximate the area the OS clock covers; we don't mimic iOS or Android.

## 2. Decisions

| Question | Decision |
| --- | --- |
| Backgrounds | Bundled CC set plus user upload (upload stays in the browser) |
| Text | Free-form lines, one shared style |
| Sizes | Preset list plus custom width×height, plus "this device" |
| Overlap with OS clock/widgets | Per-device-class safe area, vertical position control, non-exported guide overlay |
| Hosting | Azure Static Web Apps, Free plan, deployed from GitHub Actions |
| Stack | TypeScript (strict), React, Vite, Vitest, Biome, npm |

## 3. The core constraint: long-press to save

This drives the architecture, so it comes first.

- iOS Safari offers "Save to Photos" on long-press for `<img>`, not reliably for `<canvas>`. Android Chrome behaves best with `<img>` too.
- So the canvas is never shown to the user. The pipeline is: **canvas (off-screen, at target pixel size) → `toBlob` → object URL → `<img src>`**. The `<img>` is the preview *and* the export.
- The `<img>` has the full target resolution as its intrinsic size and is scaled down by CSS to fit the viewport. A long-press saves the full-resolution file, not the shrunken rendering.
- A **Share/Save** button calls `navigator.share({ files: [file] })` when `navigator.canShare({ files })` is true. The iOS share sheet includes "Save Image" (to Photos) and works in in-app browsers (Instagram, Facebook, Gmail) where long-press often offers no image menu. This is in the prototype, not deferred.
- A "Download" button (`<a download>` on the same blob URL) is shown on non-touch devices only. On iOS `download` saves to the Files app, not Photos, so on a phone it would look right and be wrong.
- Anything that must not be in the saved file (the safe-area guide) is a DOM overlay positioned in percentages on top of the `<img>` with `pointer-events: none`, so long-press still reaches the image.
- Output format: JPEG at quality ~0.92 by default. A photographic PNG at 1290×2796 is roughly 5-10 MB, slow to encode and to save, and JPEG at 0.92 shows little ringing around text at this size. **Measure both on a device in step 4**; switch to PNG only if text edges visibly suffer. `toBlob('image/jpeg')` needs an opaque canvas, which a full-bleed background already gives.

**Risk:** iOS long-press and Photos behaviour changes between releases. If long-press on a `blob:` `<img>` fails on hardware, the fallback is a `data:` URL, and if that fails the preview architecture changes. So the real-device check happens right after the first render works (§10 step 4), not at the end.

The OS may still crop or scale an exactly-sized wallpaper (iOS perspective zoom, Android home-screen scrolling). The UI copy must not promise an exact fit.

## 4. Architecture

Everything runs in the browser. Pure logic is separated from browser effects so the logic can be tested in Node.

```
 UI (React) ──state──▶ LockscreenSpec ──▶ render pipeline ──▶ Blob ──▶ <img> + Download
                              │                 │
                              │        pure: layout, crop, colour
                              └──────── effects: canvas, image decode
```

### 4.1 Data model

One immutable spec describes everything needed to render. React state holds it (a `useReducer`); the renderer is a function of it.

```ts
type LockscreenSpec = {
  readonly size: { readonly width: number; readonly height: number } // output pixels
  readonly deviceClass: 'phone' | 'tablet' | 'desktop'              // selects the safe area; §4.4 says how custom sizes get one
  readonly deviceSelection: DeviceSelection                          // preset id | this device | custom: where the size came from, so the picker is derived from the spec
  readonly background: BackgroundRef
  readonly focus: { readonly x: number; readonly y: number }          // 0..1, which part of the image survives the crop (cover only)
  readonly backgroundFit: 'cover' | 'contain'                         // cover crops to fill the screen; contain shows the whole image
  readonly backgroundRotation: 0 | 90 | 180 | 270                     // clockwise degrees
  readonly backgroundColor: ColorHex                                  // fills the screen around a contain image
  readonly text: string                                               // one textarea; split on newlines at layout time
  readonly style: {
    readonly align: 'left' | 'center'
    readonly sizeScale: number                                        // multiplier on the base font size
    readonly color: 'auto' | 'white' | 'black'
    readonly scrim: number                                            // 0..1 darkening/lightening behind the text
    readonly position: number                                         // 0..1 vertical placement inside the safe area
  }
}

type BackgroundRef =
  | { readonly kind: 'bundled'; readonly id: string }
  | { readonly kind: 'upload'; readonly file: File }   // added with uploads in step 6; only 'bundled' exists until then
```

Choosing a different background resets `focus`, `backgroundRotation`, and `backgroundFit` (bundled images default to `cover`, uploads to `contain`, since an upload is often a photo of a card that should be seen whole) and keeps `backgroundColor`. Re-selecting the current background changes nothing.

The decoded `ImageBitmap` is not in the spec. `browser/image-decode.ts` decodes once per background change, a small cache next to the spec holds the bitmap, and it is `close()`d when replaced. Re-decoding a 12-24 MP upload per edit would be unusable.

### 4.2 Modules

Category-first naming per CLAUDE.md. Directory layout:

```
src/
  main.tsx                     entry; creates the one app-lifetime renderer and passes real browser effects into App
  errors.ts                    ErrorRender, ErrorImageDecode
  log.ts                       thin wrapper over console.error; the project's logging facility
  app.tsx                      top-level layout and state
  state/
    spec.ts                    LockscreenSpec and defaults
    spec-reduce.ts             pure reducer over spec actions
    spec-initial.ts            first spec from the detected screen and the first background
  data/
    device-presets.ts          DevicePreset[] (typed const, not JSON)
    backgrounds.ts             discovers images in src/assets/backgrounds/ via import.meta.glob
  logic/                       pure; no DOM access; all unit-tested
    size-validate.ts           custom size → ok | specific error
    device-screen.ts           window.screen values, pixel ratio, touch → "this device" size and class (main.tsx does the window reads)
    image-crop.ts              cover-crop rectangle from source size, target size, focus
    image-fit.ts               the largest centred rectangle of an image's aspect ratio inside a box (contain)
    image-rotation.ts          quarter-turn cycle, rotated size, and the focus mapping from the rotated view back to the source
    text-layout.ts             wrap and shrink-to-fit given a measure function
    render-plan.ts             spec + background (cover, or contain with image size and colour) + measure + luminance reader → overlay plan (font, lines, placement, colour, backdrop) and, for contain, the image rectangle
    latest.ts                  "latest wins": drops superseded async results, including failures
    preview-controller.ts      debounce, latest-wins, and object-URL lifetime; adapter hooks stay thin
    color-pick.ts              average luminance of a pixel buffer or a `#rrggbb` colour → white | black; the validated `ColorHex` type
    safe-area.ts               device class + position → text block rectangle
  browser/                     effects behind small functions
    image-decode.ts            File/URL → ImageBitmap (EXIF-aware), with specific errors
    lockscreen-renderer.ts     executes a render plan on a reused canvas → Blob (the only code that touches canvas)
  ui/
    device-picker.tsx          preset select, orientation swap, custom W×H, "this device"
    background-picker.tsx      thumbnail grid + upload button
    image-controls.tsx         fill/fit, rotate, and the colour around a fitted image
    slider-commit.tsx          range input that reports on release; color-commit.tsx is the colour equivalent, both over use-change-commit.ts
    text-editor.tsx            one textarea (newlines are lines, blank lines are gaps)
    error-boundary.tsx         generic "internal error" for bugs; typed user errors are shown inline instead
    style-controls.tsx         align, size, colour, scrim, position, focus
    preview-image.tsx          <img> + guide overlay + Download
    about.tsx                  credits and the privacy statement
public/
  backgrounds/                 full-size and thumbnail JPEGs
docs/
  design.md
```

`lockscreen-renderer.ts` is deliberately the only canvas user and contains no decisions: it fills the canvas, draws the image (before the plan for cover, in the plan's rectangle for contain), then executes the overlay plan that the pure `render-plan.ts` returns. The only choices it makes are mechanical: the fill colour and the draw order follow the background kind, and rotation is a canvas transform. Text block, layout, colour, scrim, and image-placement decisions (where the bugs will be) are therefore unit-testable with a fake monospace `measure` and a fake luminance reader.

### 4.3 Render pipeline

The renderer fills the canvas, and in `cover` mode draws the cropped background next, because the colour pick reads it back. `renderPlan(spec, imageSize, measure, luminanceMean)` (pure) then returns the overlay plan (and, in `contain` mode, where the image goes), and the renderer draws it and encodes the blob.

1. **Crop (`cover`):** `image-crop` computes the source rectangle that covers the target aspect ratio, shifted toward `spec.focus`. If the source is smaller than the target it upscales; the UI warns when the factor exceeds ~1.5×. Rotation is applied by turning the canvas, so the crop is taken on the unrotated source: the target size and focus are mapped into source orientation by `image-rotation`.
   - **Fit (`contain`) instead:** the canvas is filled with `backgroundColor` and the whole image is placed below the text, never over it. The text and the image form one group, text on top, that `style.position` slides through the safe area. The text may use at most half the text area so the image keeps room (above that, the plan is `overflow`). The image gets the safe-area width, so it lines up with the backdrop and the on-screen guide, and the safe-area height the text leaves. Turning the image resets the crop focus, which is expressed in the on-screen frame. The image is drawn after the plan, so auto text colour is computed from `backgroundColor` instead of read back from pixels.
2. **Font size:** base size = `output width × 0.06` (tunable constant) × `style.sizeScale`. Text wraps to the safe-area width at that size. If the wrapped height exceeds the safe-area height, shrink until it fits, down to a floor (~`output width × 0.025`). Below the floor the plan is a typed `TextOverflow` result and the UI says the text is too long; nothing is drawn at an unreadable size. Short text stays at the base size and does not grow to fill the area.
3. **Placement:** the block height is the *laid-out* text height. Desktop gets only a small margin: lock-screen layouts differ too much between OSes to model, and the core use case is phones. `style.position` slides that block (in contain mode, the text and image together) between the top and bottom of the safe area, so the slider has travel whenever the content is shorter than the area.
4. **Colour:** for `color: 'auto'`, the mean relative luminance of the safe area (via the `luminanceMean` reader, backed by `getImageData` on a 32×32 downsample on a context created with `willReadFrequently`) picks white or black through `color-pick`. Sampling the whole safe area rather than the moving block keeps the colour from flipping as the position slider moves. This generalises the 2023 tool's per-image override. `getImageData` is safe because bundled images are same-origin and uploads are blob-backed, so the canvas is never tainted.
5. **Scrim (optional):** a translucent rectangle in the opposite colour at `style.scrim` opacity behind the block, for busy backgrounds. The text is laid out in the safe area inset by the backdrop padding, so the backdrop never leaves the safe area and the on-screen guide always contains it.
6. **Text:** weight 600 on the system font stack (`-apple-system`/`system-ui` first; confirm Safari canvas resolves `system-ui`).

**Canvas lifecycle.** iOS Safari frees canvas memory late; creating a new full-size canvas per render eventually hits "Total canvas memory use exceeds the maximum limit" and yields blank output or a `null` blob with no exception. So one canvas is created and reused, and resized to 0×0 on teardown. `toBlob` returning `null` rejects with `ErrorRender`; it is never swallowed.

**When to render.** Encoding is not free on mid-range phones. Text input renders debounced (~200 ms); slider controls render on release (`onChange`) rather than every `input` event. `preview-controller.ts` owns the debounce, drops results that are no longer the latest (a superseded failure included, via `latest.ts`), and revokes replaced object URLs; it is tested with fake timers and injected render and URL functions. The ready state carries the size the blob was rendered at.

### 4.4 Device presets

`DevicePreset = { id, group, name, width, height, deviceClass }` in `device-presets.ts`, in physical pixels, portrait orientation. A swap-orientation toggle exchanges width and height, offered only for tablet and desktop presets; the phone safe area only makes sense in portrait, so phones are portrait-only. This is data, so adding a phone is a one-line change.

- Safe area is per **device class**, not per device. Maintaining insets for every model is a treadmill; a class default is right for most.
- **Keep the list short** for the prototype. Chosen from StatCounter's mobile viewport ranking (October 2026: 414×896, 360×800, 384×832, 390×844, 393×873, 360×780), which reports CSS pixels, multiplied by each family's pixel ratio to get physical pixels: iPhone 11/XR 828×1792; iPhone 12-14 1170×2532; iPhone 15/16 1179×2556; iPhone 16 Pro/17 1206×2622; iPhone Pro Max 1320×2868; Android FHD+ (Galaxy A/S, many others) 1080×2400; Pixel 1080×2424; Galaxy Ultra 1440×3120; iPad 1640×2360; iPad Pro 11" 1668×2420; desktop 1920×1080, 2560×1440, 3840×2160. These come from web searches and derivations, so each still gets checked against the manufacturer's spec page when `device-presets.ts` is written. A long list is a treadmill; add rows on request. **The numbers must be copied from the manufacturers' spec pages when the file is written, not typed from memory**; the file gets a comment with the source per group.
- **Custom size:** two number inputs plus a device-class select (phone/tablet/desktop), since the class can't be inferred reliably. `size-validate` rejects non-integers, anything below 200 px, anything over 8192 px per side, and anything over 16,777,216 px total (the iOS canvas area limit, which is what actually binds). The error says which limit was hit.
- **This device:** `screen.width`/`height` are CSS pixels, so multiply by `devicePixelRatio`, round, and normalise to portrait with min/max (Android swaps `screen.width`/`height` with orientation, iOS doesn't). Expect off-by-one results from fractional ratios (411 × 2.625 = 1078.9) and wrong results under desktop browser zoom; the fields stay editable. It is the **default selection on touch devices**, since the common case is making a wallpaper for the phone in hand; the preset list serves people making one for another device. Its class is `phone` when the device is touch and the short side is under ~600 CSS px, otherwise `tablet`.

### 4.5 Safe area

The OS draws a clock at the top and buttons (flashlight, camera) at the bottom, so text there is hidden or illegible. Defaults, as fractions of height, to tune against real screenshots:

| Class | Top inset | Bottom inset | Side inset (of width) |
| --- | --- | --- | --- |
| phone | ~0.30 | ~0.14 | ~0.08 |
| tablet | ~0.25 | ~0.10 | ~0.10 |
| desktop | 0.05 | 0.05 | 0.05 |

`style.position` slides the text block (or, when the whole image is shown, the text and image together) between the top and bottom of what remains. The guide overlay (a dashed box over the preview) shows the safe rectangle and a shaded clock zone, and a checkbox hides it. It is purely visual, in the DOM, and never in the file.

### 4.6 Backgrounds

- **Bundled:** drop any image (`jpg`, `jpeg`, `png`, `webp`, any filename) into `src/assets/backgrounds/`. `backgrounds.ts` finds them with `import.meta.glob('/src/assets/backgrounds/*.{jpg,jpeg,png,webp}', { eager: true, query: '?url', import: 'default' })`, so there is no list to maintain, Vite hashes the URLs (safe long cache lifetimes), and the display name derives from the filename (`golden-hour_dunes.jpg` becomes "golden hour dunes"). It lives in `src/assets` rather than `public/` for the hashing. `public/` holds only `staticwebapp.config.json` and the favicon. Aim for long edge ~2400 px, JPEG quality ~80 (roughly 0.4-0.8 MB each).
- **Credits:** optional sidecar `src/assets/backgrounds/credits.json` keyed by filename (`{ "file.jpg": { "credit": "...", "license": "...", "sourceUrl": "..." } }`), parsed once at the boundary and shown in About. Images without an entry still work.
- **Thumbnails:** deferred. The picker uses the full images with `loading="lazy"` and CSS scaling at first; add a `sharp` thumbnail script only if the page weight hurts.
- **Licensing:** the 2023 images came from BLM Nevada, two Flickr users, and a Pixabay user. Each image's license must be re-checked before it's reused (Flickr CC variants differ on attribution and non-commercial terms), and the `credit` field is rendered in the About section. **Open:** reuse those 15, or source a new set?
- **Upload:** `<input type="file" accept="image/*">`. Decoding uses `createImageBitmap(file, { imageOrientation: 'from-image' })`. Failures become typed errors (`ErrorImageDecode`, and `ErrorImageTooLarge` naming the limit that was hit) with a specific message shown inline. The checks run before the full decode, so a huge image never allocates its pixels: files over ~25 MB are refused, then the pixel dimensions are read through an `<img>` (which does not allocate the decoded bitmap) and images over ~50 MP are refused (a 24 MP photo is ~96 MB decoded, which many phones tolerate and 100 MP they don't). The upload is decoded once as a probe and enters the spec only if that succeeds, so a bad file never displaces the current background. The file never leaves the browser, and the About section says so.
- Large uploads are drawn straight to the target-size canvas, which downsamples; no separate resize step.

### 4.7 Text

- Fonts: the system UI font stack for the prototype, weight 600. A web font needs `document.fonts.load()` before measuring or the canvas silently falls back mid-render; defer that until it's wanted.
- Layout is deterministic given a `measure(text, fontSizePx)` function, which makes `text-layout` testable with a fake. Blank lines are kept as vertical gaps; fully empty text skips the text/scrim step and exports the plain background (cropped, or the fitted image alone on its colour).
- Alignment: left or center. Line height 1.25×. Text shadow/outline is left out; the scrim handles contrast.

## 5. UI

Mobile-first, since the audience is on a phone. Single page, single column on narrow screens; on wide screens the preview sits beside the controls.

1. **Preview** at the top (sticky on desktop): the `<img>`, the guide overlay, and a caption telling phone users to hold the image to save it, a Share/Save button where `navigator.canShare` supports files, and a Download button on non-touch devices.
2. **Screen size:** preset select grouped by device class, orientation toggle, custom W×H inputs, "use this device".
3. **Background:** thumbnail grid plus "Upload your own". Image placement: fill or fit, a button that cycles the rotation through 0/90/180/270, and, when fitting, the colour around the image. One focus slider, for the single axis the cover-crop discards (hidden when fitting or when the aspect ratios match). Sliders and the colour input commit on release, so the preview does not dim throughout a drag.
4. **Text:** one textarea.
5. **Style:** alignment, size, colour (auto/white/black), backdrop strength, vertical position, guide toggle.
6. **About:** privacy statement, image credits.

Accessibility basics: real labels on every input, visible focus, the preview `<img>` has alt text saying it is the generated lockscreen, colour is never the sole indicator, and controls are usable at 320 px width.

## 6. Tooling and project setup

- `npm create vite` React + TypeScript template, then: `strict: true`, `noUncheckedIndexedAccess`, Biome (line width 160), Vitest. Scripts: `dev`, `build`, `preview`, `test`, `lint`, `typecheck`.
- Node 22 LTS (the installed version here is v22). Pin with `engines` and `.nvmrc`.
- Output is `dist/`.
- **Floating promises:** CLAUDE.md requires a lint error for them. Biome's `noFloatingPromises` is nursery-status with partial type awareness, so step 1 decides whether it is sufficient or whether to add `typescript-eslint`'s `no-floating-promises` for just this rule.
- Errors: user-caused failures are typed `Error` subclasses shown inline; everything else goes through `log.ts` and a React error boundary.

## 7. Deployment (Azure Static Web Apps, Free plan)

- Pure static content, no API folder, no managed Functions.
- Deploy via GitHub Actions using the SWA deploy action: `app_location: /`, `output_location: dist`, `skip_api_build`. We write the workflow file ourselves rather than letting the Azure portal commit one straight to `main`. The default workflow also creates public PR preview environments; decide whether to keep that. Creating the Azure resource and committing the workflow are outward-facing, so they get confirmed with you first. Keep `engines` in `package.json`, since Azure's builder reads the Node version from it.
- `staticwebapp.config.json` in `public/`: security headers, including a CSP starting from `default-src 'self'; img-src 'self' blob: data:; script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'` (Vite emits external CSS and React's `style` prop isn't blocked, so try without `'unsafe-inline'` and relax only if something breaks), and long cache lifetimes for hashed files under `/assets/`.
- Free plan (per Microsoft's quotas page; re-check at creation time): 250 MB per app, 100 GB bandwidth per month per subscription with no overage, 2 custom domains. A ~10-15 MB site is far inside that.
- Custom domain and TLS are included in the Free plan; not needed for the prototype.

## 8. Testing

Per CLAUDE.md: unit-test the seams, say plainly that the rest is manual.

Unit tests (Vitest, Node environment, no DOM):

- `size-validate`: boundaries (199/200, 8192/8193, the total-pixel cap via e.g. 8192×2049), non-integers, NaN. Assert on error *kind*, not message text.
- `image-crop`: wider-than-target, taller-than-target, exact aspect match, focus at 0, 0.5, 1; rectangle always inside the source.
- `text-layout` and `render-plan` with a fake monospace measure (in the shared test-support directory): wrapping at word boundaries, a single word wider than the block (breaks by character), short text stays at the base size, shrinks until it fits, overflow below the floor yields `TextOverflow`, `sizeScale` above 1 really enlarges (until overflow), the position slider has travel for short text, blank-line gaps, colour pick uses a fake luminance reader.
- `image-rotation`: the cycle, the size swap, and the contract the renderer relies on: cropping the unrotated source with the mapped target and focus, then rotating, shows the same window as cropping the rotated image directly.
- `image-fit`: the fitted rectangle keeps the aspect ratio, stays inside its box, and is centred.
- `color-pick`: `#rrggbb` parsing accepts only that form, and the hex luminance agrees with the buffer version.
- `render-plan` contain mode: image directly under the text, inside the safe area at every position, text capped so the image keeps room, auto colour from the background colour without reading pixels.
- `latest` and `preview-controller`: stale results and stale failures dropped, replaced URLs revoked, dispose, with fake timers.
- `color-pick`: all-black, all-white, mid-grey threshold, a half-and-half buffer.
- `safe-area`: rectangle stays inside the image for every class and for `position` 0, 0.5, 1; a portrait and a landscape size.
- `device-presets`: ids unique, dimensions within the validator's limits, every device class has a safe area.
- Spec reducer: pure state transitions.

Not unit-testable, covered by a manual smoke checklist: canvas drawing, `toBlob`, image decoding, the long-press save on real devices, layout at 320/768/1280 px. A Playwright smoke test (load page, render, assert the `<img>` has the expected natural dimensions) is a good follow-up and is the one browser test worth adding early; it is not in the prototype's first cut.

## 9. Privacy

All processing is local. Nothing is sent, nothing is stored: no cookies, no `localStorage`, no analytics. Text typed into the lines may be a person's phone number and address, so persistence would be a deliberate feature later (opt-in, with a clear button), not a default. The cost is that a refresh loses the text; accepted for the prototype.

## 10. Implementation order

Each step builds and passes the suite on its own, and maps to a commit (or two):

1. Scaffold: Vite, React, strict TS, Biome, Vitest, a passing placeholder test, `.nvmrc`.
2. Pure logic with tests: `size-validate`, `image-crop`, `color-pick`, `safe-area`, `text-layout`.
3. Data: device presets and bundled backgrounds (with the images, as its own commit).
4. `render-plan`, `lockscreen-renderer`, and `image-decode`: one fixed spec rendered into the preview `<img>`, with Share/Download. **Test long-press and Share on a real iPhone and Android phone now**, and measure JPEG vs PNG.
5. State and UI controls wired to the spec: device picker, text editor, background picker (bundled).
6. Upload, focus control, style controls, guide overlay.
7. About/credits, responsive polish, accessibility pass.
8. Re-run device checks on the finished UI; fix what they find.
9. Azure deployment (after confirmation).

## 11. Alternatives considered

- **Render text in HTML over an `<img>` and rasterise with `html-to-image`.** Extra dependency, and rasterising DOM is flaky across Safari versions. Canvas drawing is direct and testable.
- **Show the `<canvas>` and rely on long-press.** Unreliable on iOS, which is the main target.
- **Server-side rendering.** Breaks "static", adds cost, and sends personal text to a server.
- **SVG composition.** Text wrapping is manual anyway, and getting an SVG to a PNG blob goes through a canvas regardless.
- **Per-device safe areas.** More accurate and a maintenance burden; revisit if the class defaults prove wrong.

## 12. Open questions and risks

1. **Background set:** the maintainer adds Creative Commons images to `src/assets/backgrounds/` and is responsible for their licences; credits go in the optional sidecar file (§4.6).
2. **Preset list:** which devices to include at launch, and who curates it? Resolutions come from manufacturer specs.
3. **Safe-area values:** the fractions in §4.5 are guesses. They need checking against real lock screenshots of an iPhone and a Pixel.
4. **Long-press and Share behaviour** on current iOS and Android versions, including Samsung Internet, Firefox Android, and in-app browsers (§3). Tested on hardware at step 4.
5. **Maximum canvas size** on older iOS devices; the 16.7 MP cap is conservative but unverified on hardware.
6. **Lost-phone template:** the default text is a "lost phone" template with obvious placeholder lines; the maintainer will rewrite the copy after the app works.
7. **Fonts:** system fonts look different per OS, so the same spec yields slightly different images on iOS and Windows. Acceptable for the prototype; a bundled font fixes it.
