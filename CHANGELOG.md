# Changelog

This log uses the overlay's historical version numbers. The initial Git import contains the V27 baseline; earlier entries summarize local development milestones rather than Git tags or independently published releases.

## V36 — Frog assistance — 2026-11-14

- Add Frog S1/S2/SS recognition to model selection, overlay, angle/power application, firing and launcher recovery. S1/S2 share carrier64, SS uses66; continuations65/67 are linked to a unique matching parent rather than the nearest player.
- Calibrate ordinary carrier speed/wind from current-match samples, sharing compatible shot data and preserving round/floor interval uncertainty. Retained low-force observations support the initial ratio2.4; seven wind states support an explicitly empirical3.4/x-floor/y-ceil candidate with match-specific gravity.
- Estimate the surface endpoint after landing, with separate orange dashed surface paths. S1 uses observed net-left motion, S2/SS net-right; ordinary/SS durations are approximately1.5/3seconds. A50px/s contour marcher is an engineering midpoint of observed37–74px/s, not a recovered native law.
- Add bounded cooperative endpoint search, early ready suggestions, stable auto-apply caching and sampled-terrain invalidation. Unknown edges/walls stop the estimate and remain labelled.
- Add anonymized native carrier/continuation fixtures and regressions for all shot mappings, calibration isolation, endpoint search, movement, ownership, trusted firing and surface limits.

No developer test shots are fired. Surface continuations are excluded from air calibration. Predictions retain `predictedHit:false`; native collision, detonation, damage and complex weather remain unverified.

## V35 — Earlier Turtle SS aim and partial estimates — 2026-11-13

- Add a quick pass around analytically promising angles and powers before the broad search. The default twelve full-candidate checks are shared between quick/refinement passes and both styles.
- Display the first terrain-verified suggestion immediately and retain it while searching for a better cluster. A ready result can be applied or fired during refinement; pending results without a ready path remain unavailable.
- Remove the hard three-tight-fragment acceptance gate. One verified terrain contact inside the wider proximity window can produce a clearly marked weak estimate; tight count still dominates ranking, and no contact is fabricated.
- Recheck sampled terrain before reusing an in-progress best path. Preserve explicit styles, fixed angles, mirror preference and low-confidence diagnostics.

These changes improve availability and time to the first suggestion; a sparse cluster is not a claim of accurate multi-hit damage. Completely blocked or unreachable targets can still have no solution.

## V34 — Turtle SS selection and placement confidence — 2026-11-13

### Changed

- Add automatic comparison of Timebomb and Skybomb with one common geometric score and a shared full-candidate budget. Explicit mode choices remain available.
- Rank tight contacts within14px before the wider28px proximity count, then center error, cluster width, power sensitivity and carrier uncertainty. Require at least three tight terrain contacts by default. These windows are engineering criteria, not recovered damage radii.
- Permit a verified partial cluster when another fragment has no target-plane crossing within the child horizon. Timebomb requires a descending opening above the target.
- Carry feasible round/floor launch-ratio intervals from calibration into the uncertainty allowance, including high-power extrapolation from low-power samples.
- Display chosen style, tight count, centering, one-power sensitivity and low-confidence estimates. Preserve mirror preference between equal-count styles.
- Resume analytic seeds and fragment traces across short production updates, targeting8ms between operations. Avoid duplicate SS previews while automatic search is active; cache scene results across self-applied angle changes and check sampled terrain before reuse.

### Validation boundary

Ten retained native split events reproduce60 fragment descriptors. They do not establish pre-shot hit accuracy: matched first-shot captures already show20.57px and73.67px opening errors from launch-model differences. Timing and fragment generation are retained; no arbitrary fuse offset or damage radius is introduced. Weather-transformed splitting and native body/splash collisions remain unverified. The time budget is soft and one prediction/trace can overrun it.

## V33 — Boomer search responsiveness and high arcs — 2026-11-13

### Fixed

- Replace the synchronous Boomer candidate/weather grid with a resumable, bounded search and a visible pending state.
- Remove duplicate current-angle solutions and automatic manual-power previews for Boomer. Reuse scene results across the angle/look changes produced by auto-apply itself.
- End a difficult search burst rather than consuming an entire turn indefinitely; validate cached paths against terrain changes.
- Restore ordinary prediction through Random weather with an uncertainty label, preserving the requested behavior.

### Added

- Coarse terrain pruning, typed-terrain checks and full-path verification for successful candidates; at most256 diverse queued candidates, six precise checks per slice and32 updates per burst.
- Automatic escalation to a longer high-arc pass when short ordinary paths fail; explicit high-arc mode uses up to8seconds without wind or6seconds for a supported ordinary/tailwind model, marked as extrapolation.
- Bounded reflected-target seeds using the existing empirical mirror geometry, avoiding the former numeric weather grid.
- Regressions for cooperative progress, time budgets, stable angle application, terrain refresh, duplicate-preview removal, high arcs, Random and mirrors.

### Validation boundary

The8ms slice target is checked between candidates and can be exceeded by one check. Longer high arcs are extrapolated beyond the measured data. This update does not establish a universal headwind model or guarantee all-weather hit accuracy. Live freeze/frame-rate verification requires an active game tab.

## V32 — Boomer SS, missing-force fallback and wind27 — 2026-11-13

### Added

- A separate Boomer SS flight model using the selected SS muzzle and validated ordinary geometry, with independent transformation observations and provisional timing labels.
- Same-shot/exact-wind restrictions for recorded SS headwind paths; never pool them with ordinary S1/S2 headwind templates.
- Four anonymized native SS path fixtures, including a fresh user-fired zero-wind launch through3.75seconds, plus SS selection/firing regressions.
- Clear native SS/S1 availability reasons when a refreshed firing transaction encounters a disabled shot.

### Fixed

- Allow automatic Hook advice when target-directed headwind physics has no solution, even if the current facing has a valid tailwind model. Preserve measured solutions and explicit physics/fixed-angle modes.
- Remove the hard26-wind rejection from ordinary fitting. Wind27 is retained as labelled extrapolation, with the shorter unmeasured-region horizon.
- Retain one committed power for trusted fallback shooting; regressions cover left winds20/26/27 and the prior missing-force case.

### Validation boundary

All61 portable tests pass. The SS reference forecasts differ by at most5.72px on four captured clean prefixes; SS transformation timing and broad headwind behavior are not universally established. Hook fallback remains historical formula advice without a simulated collision guarantee. Development tools did not fire native test shots; the fresh SS was fired by the user.

## V31 — Boomer launch stability and observed headwind paths — 2026-11-13

### Fixed

- Stop freely fitting the ordinary Boomer launch slope from a small set of nearby powers. Use an archive-validated fixed slope with current-match velocity/origin calibration; retain power extrapolation allowance.
- Use truncated signed wind components in the ordinary fallback, addressing the systematic negative-axis bias in the previous floor-based law.
- Bound ordinary prediction by observed duration, at most three seconds; mark unmeasured wind/angle regions and shorten their fallback to 2.1 seconds.
- Keep headwind phase changes out of the ordinary quadratic model. New ordinary forecasts stop at unvalidated special-weather columns.

### Added

- Current-match headwind S1/S2 path reuse at an unchanged world angle and integer power, identical wind direction and strength difference no greater than one.
- Bounded candidate tracing against current terrain, translated muzzle positions, native angle limits and optional angle lock. No path is extrapolated beyond its observed prefix.
- Distinct ordinary/headwind labels and committed-shot metadata. Explicit Hook/Backshot guide modes retain their reference-only behavior.
- Preserve an active Boomer sampling controller during an overlay/model update when its controller and adapter versions are unchanged, retaining its original budget and sequence.
- Anonymized evidence fixtures:79 ordinary paths across20 sessions and nine paired headwind launches; whole-session holdout and integration regressions.

### Validation boundary

The ordinary model's held-session worst point error is about11.75px within the sampled prefixes through3seconds. Nine tightly matched headwind pairs support limited reuse, with a worst corrected displacement error about6.72px. These are trajectory comparisons, not live hit rates. General headwind turn physics, SS and post-column weather behavior remain unresolved; see [Boomer models](docs/BOOMER_MODELS.md).

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
