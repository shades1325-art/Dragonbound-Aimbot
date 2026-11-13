# Development

## Layout

```text
app/                  Browser modules and Windows loader processes
docs/                 English usage and issue documentation
licenses/             Retained dependency notices
scripts/              Runtime preparation, checks and package build
tests/                Portable synthetic/policy regression tests
runtime/              Generated Windows Node runtime; ignored by Git
dist/                 Generated portable ZIP; ignored by Git
Launch.ps1            Windows status window and launcher
Inject.vbs            Double-click entry point
```

`app/runtime-supervisor.mjs` selects a game tab, installs the ordered browser modules and recovers them after reload. `bind-game.mjs` and `follow-game-runtime.mjs` discover and follow the current game objects. `enable-aim-overlay.js` owns the panel, drawing and recalculation loop; `aduka-autoaim.js` dispatches search across supported models.

Vehicle helpers are intentionally separated: initial/calibrated models, special-shot tracers, weather predictors and Boomer reference/learning modules. Files retaining `aduka` in their names also serve the shared overlay; the name does not imply Aduka-only behavior.

## Prepare dependencies

Use Windows with Node.js 24 or later and npm:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\prepare-runtime.ps1
```

The script runs `npm ci` against `app/package-lock.json`, copies the installed Windows Node executable to `runtime/node.exe`, includes its license and creates local browser configuration only when missing. It uses an adjacent license file when available, otherwise downloads the matching version's license from the official Node.js repository. It does not start Chrome, inject the overlay or fire a shot.

For a nonstandard Node installation, pass `-NodePath 'C:\path\to\node.exe'`. npm must be available beside that executable or on PATH. Use `-LicensePath 'C:\path\to\LICENSE'` to supply that distribution's license locally.

## Checks

```powershell
npm.cmd --prefix app run check
npm.cmd --prefix app test
```

The syntax check parses application JavaScript and example JSON without connecting to a browser. Tests use synthetic players, terrain and DOM stubs or pure target-selection policies. They never fire a real shot or start a live game.

The repository started from V27 and includes V28 SS/firing, V29 S2/mirror, V30 Timebomb, V31–V33 Boomer improvements, V34/V35 Turtle SS search and V36/V37 Frog. Anonymized fixtures test60 Turtle SS fragment descriptors,36 S2 wave positions,79 ordinary Boomer paths, nine headwind pairs, four Boomer SS prefixes, three initial Frog launches, nine initial continuations, five later medium-force launches and recorded surface-contact examples. Synthetic tests cover timing, wind coverage and launch intervals, body-region continuation, tight terrain clusters, mirror ranking, firing guards, Timebomb, cooperative search, angle lock, SS selection, target-directed guide fallback, Frog endpoint/ownership handling and disabled-shot guards. Descriptor replay is separate from pre-shot accuracy. More extensive native-shot/weather evidence remains local. See [Known issues](KNOWN_ISSUES.md) before extending accuracy claims.

## Build a portable ZIP

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\build-package.ps1
```

Run preparation first. The builder performs syntax checks, stages the application, launchers, guides, runtime and installed `ws` dependency, then writes `dist/DragonBound-OneClick.zip`.

The archive contains a top-level `DragonBound-OneClick` folder with clean browser configuration. It excludes local match records, settings, process IDs, captured browser targets and logs. Building does not restart or replace an already-running loader in another folder.

## Local state

The following are generated and ignored by Git:

- `app/inspect-game-args.json` and `app/bridge-endpoint.json`
- `app/game-binding.json` and `app/oneclick-error.json`
- `app/runtime-*.json`, including preferences and process status
- `app/data/`, including optional Boomer Auto Learn shot records
- `runtime/`, `dist/` and installed `node_modules/`

Keep raw native captures and personal identifiers out of published fixtures. Use small synthetic or anonymized cases that preserve the behavior a test needs.
