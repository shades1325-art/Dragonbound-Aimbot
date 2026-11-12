# Changelog

This log uses the overlay's historical version numbers. The initial Git import contains the V27 baseline; earlier entries summarize local development milestones rather than Git tags or independently published releases.

## V30 — Turtle Timebomb reference integration — 2026-11-13

### Added

- An explicit Turtle SS Timebomb mode: invert the current wind/elevation model at opening time, refine integer power and verify six fragment terrain paths.
- Opening distance, landing spread, predicted nearby fragment count and an opening-inside-tornado indicator in the panel/status and committed aim history.
- Extra low-power weather seeds within the existing bounded full-trace budget, plus a link to Creedo's Turtle guide.
- English reference notes explaining how the requested Gunbound timebomb, wind, elevation, tornado and training ideas relate to DragonBound.

### Validation boundary

- Archived Gunbound screen/bar tables, damage values and tornado exit quirks are not applied as DragonBound constants. Current match calibration and the observed split law remain authoritative.
- Timebomb paths and tornado split behavior are provisional; nearby terrain contacts do not establish body collisions or damage. No extra automatic firing is enabled.

## V29 — Turtle S2 contacts and mirror preference — 2026-11-12

### Added

- Turtle mirror preference for S1/S2 and split SS, preserving predicted contact/proximity counts before preferring a reflected path.
- Separate carrier reflection and target-bound fragment reflection counts; do not assign an unverified damage multiplier or stacking/inheritance rule.
- A preference checkbox shown when Turtle has active mirror weather.
- Minimal shot-time target terrain snapshots for local S2 diagnostics, excluded from Git and portable packages with other shot records.
- Portable regressions for sparse wind coverage, S2 terrain tracing and mirror ranking.

### Fixed

- Stop treating the generic target rectangle as a confirmed S2 collision. Continue the paired forecast to terrain and show the uncertain body-contact region with a dashed continuation.
- Aim paired S2 terrain contacts near the target's feet and refine their terrain crossings.
- Prevent a wind law fitted to two nearby directions from being reused as a precise global extrapolation. Exact measured winds still take priority.
- Preserve Mouse 5's bound-facade firing fix and duplicate-event handling.

### Remaining limits

- Received S2 wave positions match the wave formula, but exact native body collision is not recovered. Some actual impacts occur before the terrain forecast; splash damage and terminal-grid timing cannot identify a universal hitbox.
- Mirror and Sun are distinct effects. No client-side numerical Sun/Mirror damage multiplier or carrier-to-fragment bonus inheritance has been established.

## V28 — Turtle SS refinement and Mouse 5 — 2026-11-12

### Added

- Mouse 5 shooting through the same refreshed transaction as the overlay's shoot button.
- Suppression of browser-forward navigation and duplicate pointer/mouse events for the hotkey; remove listeners when the overlay is replaced.
- Integer-power refinement, a wider fallback search and angle-diverse bounded terrain checks for Turtle SS.
- Estimated fragment impact tilt alongside landing spread, and complete SS timing in apply history.
- Portable tests with seven anonymized native split events covering 42 fragments, plus firing/collector regression tests.

### Fixed

- Make the SS countdown honor the path/model's opening and release times.
- Associate fragments using acceleration at opening after weather transitions, rather than launch acceleration.
- Preserve descending linear crossings in zero-gravity weather segments and include jumps/velocity bias in fallback markers.
- Resolve the current player after aim refresh; require matching native player, turn and shot selection before firing.
- Accept the current player's bound network facade rather than requiring identity with the internal network object; capture side-button events at window level before page handlers.
- Reject invalid power and angle changes that the game clamps away from the solved angle.
- Store the committed integer power and use the matched shot snapshot for received calibration, instead of a later mutable power bar.
- Replace the obsolete message claiming that split-fragment positions are not predicted.

### Validation boundary

The seven complete native splits support the existing empirical fragment law, not universal weather accuracy. Automated firing tests use simulated events and a stubbed sender. The user also confirmed Mouse 5 firing after the facade/capture correction, with received-shot calibration retaining committed powers. Development tools do not fire live shots.

## Repository preparation — 2026-11-11

### Added

- English README with an Introduction, supported-mobile matrix and quick start.
- English usage, troubleshooting, development and packaging guides.
- A prioritized issue list with validation criteria for unfinished mechanics.
- Reproducible dependency metadata, runtime preparation and portable-package scripts.
- Portable existing tests for movement, target selection and recovery policy.

### Packaging

- Exclude personal settings, browser bindings, process status, shot archives, dependencies and runtime binaries from Git.
- Generate clean browser configuration from example files during setup.
- Retain third-party attribution and include runtime/dependency licenses in generated portable packages.

## V27 — Grub — 2026-11-10

### Added

- Automatic Grub recognition and S1/S2/SS model selection.
- Four S2 trajectories with separate angle and speed offsets, ranked by predicted target contacts.
- Estimated terrain ricochets and rejection of candidate paths that hit the owner or a teammate.
- Dashed post-contact trajectory segments to distinguish estimates.
- A three-second S2 lifetime after the first bounce, based on four observed projectiles in one burst.
- Grub modules in one-click loading and runtime health checks.

### Fixed

- Prevent side projectiles from contaminating the central S2 launch calibration.
- Allow candidate solving at native projectile speeds above the shared solver's UI power range.

### Remaining limitations

- Left-facing S2 spread and historical terrain normals lack independent validation.
- SS targets the first contact; rolling, repeated damage and a general SS timer are unresolved.

## V26 — Raon Launcher — 2026-11-10

### Added

- Three separate S1 wave streams and predicted contact counts.
- Two S2 projectile speeds with separate terrain landing markers.
- SS terrain placement near the target's feet.
- Match-specific calibration, movement/wind updates and bounded special-weather search.

### Fixed

- Correct Raon SS identification and separate airborne projectiles from mines and walkers.
- Require actual terrain contact for mine/robot placement instead of counting an airborne body crossing.

### Remaining limitations

- Mine pursuit, walker movement, detonation and resulting damage are not modeled.

## V25 — Nak — 2026-11-10

### Added

- Nak S1/SS trajectories and S2 terrain entry, underground motion and exit search.
- A distinct underground path display and current-match calibration priority.
- Initial estimates so aim does not require two new calibration shots after every wind change.

### Fixed

- Correct Nak SS bullet identification and exclude underground children from ordinary launch fitting.

## V24 — Mirrors and random weather — 2026-11-08

- Add estimated mirror reflection paths and reflection markers.
- Extend paired Turtle S2 and split-SS calculations to mirror paths.
- Continue ordinary calculations while random weather is unresolved, then use the revealed mirror/tornado effect.
- Preserve explicit uncertainty for repeated reflections, elevated mirrors and combined weather.

## V23 — Turtle performance — 2026-11-08

- Prepare paired Turtle wave calculations together and reject unreachable paths earlier.
- Cache repeated wave/tornado calculations and bound special-weather searches.
- Retain the experimental status of tornado predictions; performance work does not establish shot accuracy.

## Earlier local milestones

- Turtle S1/S2/SS support, direct-impact and airborne-split SS modes, opening/release timing and fragment forecasts.
- F9 panel visibility, separate trajectory visibility and persistent preferences.
- Boomer reference methods, learned models and optional bot-room Auto Learn with stop conditions and progress reporting.
- Aduka and ICE initial models, shot-change recalculation and wind/movement refreshes.
- One-click Windows launcher, single-owner process control, automatic game-tab selection and reload/new-match recovery.

Exact dates and version boundaries for these earlier grouped items are not reconstructed here.
