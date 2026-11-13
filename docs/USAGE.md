# Usage

## First-time setup

1. Install Node.js 24 or later with npm on Windows.
2. Clone the repository and run `scripts/prepare-runtime.ps1` from PowerShell. This installs the locked WebSocket dependency, prepares `runtime/node.exe` and creates local browser configuration.
3. Open the existing DragonBound game in Chrome. The loader currently reads `%LOCALAPPDATA%\Google\Chrome\User Data\DevToolsActivePort`.
4. Enable remote debugging at `chrome://inspect/#remote-debugging` in that browser instance. Accept Chrome's connection prompt when it appears.
5. Double-click `Inject.vbs`. The launcher reports whether it is waiting for Chrome, waiting for a game tab or finished loading.

A generated portable package already contains the prepared runtime and dependency. Extract it and start at step 3.

## Normal aiming

1. Enter a match with a supported mobile. Recognition follows your current mobile automatically.
2. Select the intended target in the first drop-down below the wind display.
3. Choose automatic search in the arc-mode drop-down. Use high arc when you want a higher legal path, or fixed angle to solve power for an angle you enter.
4. Review the status and predicted path. Yellow or estimated states indicate uncertainty; reference-formula advice may not include a simulated path.
5. Enable the automatic-adjustment checkbox below the apply/shoot buttons if you want the suggested angle and power applied when the turn is ready. Disable it for manual testing.
6. Use F8 or the apply button to refresh and apply immediately. Review the result before using the game controls or the overlay's shoot button to fire. Mouse 5, the forward side button, also refreshes and shoots the ready aim.

Positions, vehicle slope, shot type, target and wind changes trigger recalculation. Automatic adjustment pauses briefly while the mobile is moving, then resumes after movement settles. If no valid path is found, change the angle mode, clearance, position or target and review the stated reason.

## Controls

The in-game panel currently uses Vietnamese labels. This table describes the controls in their displayed order using English names.

| Control | Purpose |
| --- | --- |
| Trajectory visibility button | Hide/show drawn paths independently of the panel |
| F9 / panel visibility button | Hide/show the control panel; calculations continue |
| Wind clock and readout | Show current wind direction and strength |
| Target drop-down | Select the player to aim toward |
| Arc-mode drop-down | Automatic, high arc or fixed displayed angle |
| Boomer method | Select a physics model or reference formula; visible for Boomer |
| Turtle SS mode | Choose Auto, Skybomb, Timebomb or direct impact; visible for Turtle SS |
| Mirror preference | Prefer a reflected Turtle path when predicted contact counts are preserved; shown during mirror weather |
| Auto Learn area | Start/stop optional Boomer bot-room sampling |
| Angle input and +/- buttons | Lock and adjust the displayed angle by one degree |
| Terrain clearance | Set the search margin from 0 to 20 pixels |
| Long arc checkbox | Allow an extrapolated long arc under the supported zero-wind conditions |
| Apply button / F8 | Refresh and apply the suggested angle and power |
| Shoot button | Explicitly fire using the current ready aim |
| Mouse 5 | Refresh and fire the ready aim; browser-forward navigation is consumed while the overlay is active |
| Automatic-adjustment checkbox | Apply suggestions when the turn is ready |

The power-bar marker shows the suggested force on the game's 0–400 scale. It marks a firing power, not a probability of hitting. Aim shooting commits one integer power after refreshing. If the native player, turn, shot or applied angle does not match, it stops rather than sending a stale solution; wait for the ready state and press again.

## Vehicle-specific behavior

### Boomer

The default method prefers a learned flight model and can fall back to reference advice when model coverage is insufficient. Physics-only mode avoids formula fallback. Other choices include Hook400, Backshot250, Fix50/70, Shotgun400, angle 35, Lob and high-angle methods.

V31 stabilizes the launch-power slope and uses a broader ordinary/tailwind fallback with explicit uncertainty. Its normal horizon is at most three seconds; winds outside the measured convex region or angles outside the sampled range shorten it to 2.1 seconds. Current-match calibration has priority. Boomer ordinary forecasts stop before unresolved random/mirror/tornado columns.

In **Automatic** or **Physics-only** mode, headwind aiming can also reuse a path recorded in the current match. It keeps that path's exact world angle and power, accepts the same wind direction with a strength difference no greater than one, and checks the translated path against current terrain. S1/S2 may share this limited path evidence. Movement updates the origin and native slope angle, but a path is unavailable if the required angle is no longer legal. This feature searches available recorded paths; it does not invent a new Hook/Backshot force. The panel distinguishes recorded-headwind estimates from ordinary-flight estimates. Explicit Hook/Backshot choices remain reference formulas. See [Boomer models](BOOMER_MODELS.md).

**SS:** select the game's SS shot; its own muzzle and selected-shot model are used immediately, without requiring two additional calibration shots. Ordinary zero/tailwind SS geometry is estimated from validated shared flight behavior. Transformation observations are kept separate: the displayed path time is a physics-path clock, and an exact future transformation/impact wall-clock time is not predicted. Headwind SS templates require a previously observed SS at exactly matching wind; ordinary S1/S2 templates are not substituted for them. The game's own SS availability still applies.

V33 splits difficult Boomer searches into short updates with visible progress instead of tracing an entire grid synchronously. Automatic aiming no longer also computes duplicate manual angle/force previews. A search burst ends after a bounded number of updates, and unchanged unsuccessful scenes briefly pause before continuing. Native game controls remain available while a search is pending; aim shooting still requires a ready, refreshed solution.

**High arcs:** select the high-arc mode to search beyond the short calibrated horizon. Automatic mode also tries this longer pass when its ordinary search has no solution, except for unresolved target-directed headwind. The bounds are eight seconds without wind and six seconds for a supported ordinary/tailwind model. The extra region is explicitly extrapolated, including SS geometry; these bounds are not native fuse times or validation of all high-angle winds. Fixed-angle mode retains the selected angle. Random weather continues the ordinary calculation with an uncertainty label; mirror estimates remain available, while general tornado inversion has incomplete coverage.

In **Automatic** mode, a failed target-directed headwind search can use Hook reference advice even if the mobile currently faces the other way and has a valid tailwind model. This fixes a condition that previously left no suggested force. It remains labelled formula advice without a simulated path. Wind27 is no longer rejected solely by the old26 limit; unmeasured ordinary wind remains labelled with a shorter horizon. Missing guide factors or illegal native angles are still reported rather than silently clamped.

Reference advice comes from older Gunbound guides and has explicit unavailable regions. Height differences and terrain can reduce its usefulness. Do not interpret formula advice without a simulated path as a confirmed collision prediction.

### Turtle

For SS, choose **Auto** to compare Timebomb and Skybomb using one geometric score. Select **Timebomb** for a descending split close to the target, **Skybomb** for an opening near the apex, or **direct impact** to land the carrier before it opens. Explicit choices remain honored. Timebomb solves angle and power together using current wind, target elevation and observed timing. Switching modes does not require two extra calibration shots. See the [reference notes](TURTLE_REFERENCE.md).

S2 draws both wave trajectories through the possible body-contact region toward predicted terrain contact. The orange dashed continuation is uncertain because the native body collider is not recovered. Counts describe predicted terrain landings near the feet, not confirmed damage. Current-match wind samples take priority; sparse directional coverage uses an explicitly inferred fallback rather than a global fitted law. SS offers four modes:

- **Auto:** compare both split styles; prefer tight contacts and centering before wider fringe contacts. Show why the alternative lacks a suitable cluster.
- **Skybomb:** seek a split near the apex and forecast six fragments and their landing spread.
- **Timebomb:** seek a split near the target and short fragment flights, adjusting angle and power together.
- **Direct impact:** seek terrain contact near the target's feet before the carrier splits.

Ten recorded complete splits began opening at2.10seconds and released60 fragments at2.60seconds. Those observations inform the model; they are not a universal timing guarantee. The timing display follows the chosen path/model and remains visible when the main panel is hidden. Searches progress across short updates. V35 displays a terrain-verified aim as soon as one is available and continues improving it in the background. It can be used while refinement continues; a pending search without a ready path cannot fire through the aim button.

The panel distinguishes the wider proximity count from contacts in the tight14px horizontal window and reports centering, carrier uncertainty and one-power sensitivity. A sparse verified estimate can remain visible, labelled weak when fewer than three tight contacts are available. These are engineering diagnostics, not native damage radii. Low confidence can remain after switching to Timebomb: both styles share the carrier's launch-model error. Ordinary shots automatically refine the current-match model; a single low-power sample leaves a broad high-power interval. Bootstrap, inferred wind and weather can still produce misses despite a narrow nominal cluster.

### Nak

S2 marks terrain entry and draws the underground portion separately before estimating the exit. Passing through the target's airborne body rectangle is not enough to qualify as an underground hit. S1 and SS use their ordinary flight carriers.

### Raon Launcher

S1 draws three wave streams. S2 marks two mine landing positions; SS marks a robot landing position. The forecast ends at placement. It does not promise which player a mine/robot will follow or when it will detonate.

### Grub

S2 draws four projectiles with distinct angle/speed offsets and favors more target contacts. Post-bounce paths are estimated and drawn with dashed orange segments. The current SS search targets first contact, without a repeated-damage timeline.

### Weather

Mirror and tornado paths are experimental. Reflection markers and dashed segments distinguish special-weather transitions. Unknown random weather keeps the ordinary flight calculation until the game reveals the effect; the overlay does not predict an unrevealed random result.

Turtle's mirror preference is enabled by default. It keeps the predicted contact/proximity count first, then prefers a viable reflected path. Turn it off with the checkbox during mirror weather if you want ordinary ranking. For split SS, carrier reflections and target-bound fragment reflections are reported separately. This is a geometric preference, not a numerical damage calculation; Sun and Mirror are distinct and bonus inheritance is unverified.

## Optional Boomer Auto Learn

1. Create a bot-only room and remain the room owner.
2. Select Boomer and set the maximum attempt count, up to 40.
3. Press **AUTO START → AUTO SHOOT** explicitly. The learner starts games and tries S1/S2 at varied angles and powers while recording received trajectories.
4. Use the stop button below Start to end sampling and restore the previous automatic-aim setting.

Each run is limited to 40 attempts or ten minutes. Room changes, a new human participant, loss of bot-room confirmation, missing shot evidence or stalled game progress stop the learner. A page reload stops the run; start it again manually if needed.

Records are stored locally in `app/data/boomer-auto-learn-shots.jsonl`. These files are excluded from Git and generated portable packages. Collected samples do not immediately establish complete wind coverage.

## Restart, settings and shutdown

Running `Inject.vbs` again reuses the existing loader for the same folder and restores the panel. Most display/aim preferences persist in `app/runtime-aim-preferences.json`. Browser bindings and status files are generated locally.

```powershell
.\runtime\node.exe .\app\one-click.mjs --status
.\runtime\node.exe .\app\one-click.mjs --stop
```

Stop ends recovery/tracking, but does not remove code already present in the page. Reload the game tab after stopping to clear the overlay. Closing Chrome ends that browser session; reopen the game and run the launcher again next time.

## Troubleshooting

| Symptom | Action |
| --- | --- |
| Missing runtime | Run `scripts/prepare-runtime.ps1` in a source checkout |
| Cannot read DevToolsActivePort | Enable debugging in the expected Chrome instance; alternate user-data directories are not yet configurable |
| Chrome connection prompt | Accept the prompt in Chrome, then retry the launcher |
| Waiting for game tab | Open the game/room, rather than a profile or shop page; reduce multiple game tabs to one if selection is ambiguous |
| Panel missing | Press F9 or run the launcher again; also check the separate trajectory visibility control |
| Waiting for game/player | Enter a match and wait for an alive supported mobile |
| No aim solution | Check the selected target, legal angle range, terrain and special-shot limits; see [Known issues](KNOWN_ISSUES.md) |
| Aim differs from the actual shot | Record mobile, shot, angle, power, wind, facing, slope and weather; distinguish prediction error from a different applied shot |
| Auto Learn appears stalled | Read its stop/wait reason; restore a valid bot-only room and start a new run after the game is ready |
| Binding breaks after a game update | Stop and reload; the client binding may need code changes rather than more calibration shots |
