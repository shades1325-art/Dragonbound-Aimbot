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
6. Use F8 or the apply button to refresh and apply immediately. Review the result before using the game controls or the overlay's shoot button to fire.

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
| Turtle SS mode | Choose airborne split or direct impact; visible for Turtle SS |
| Auto Learn area | Start/stop optional Boomer bot-room sampling |
| Angle input and +/- buttons | Lock and adjust the displayed angle by one degree |
| Terrain clearance | Set the search margin from 0 to 20 pixels |
| Long arc checkbox | Allow an extrapolated long arc under the supported zero-wind conditions |
| Apply button / F8 | Refresh and apply the suggested angle and power |
| Shoot button | Explicitly fire using the current ready aim |
| Automatic-adjustment checkbox | Apply suggestions when the turn is ready |

The power-bar marker shows the suggested force on the game's 0–400 scale. It marks a firing power, not a probability of hitting.

## Vehicle-specific behavior

### Boomer

The default method prefers a learned flight model and can fall back to reference advice when model coverage is insufficient. Physics-only mode avoids formula fallback. Other choices include Hook400, Backshot250, Fix50/70, Shotgun400, angle 35, Lob and high-angle methods.

Reference advice comes from older Gunbound guides and has explicit unavailable regions. Height differences and terrain can reduce its usefulness. Do not interpret formula advice without a simulated path as a confirmed collision prediction.

### Turtle

S2 draws two wave trajectories and reports estimated contacts. SS offers two modes:

- **Airborne split:** seek a split near the apex and forecast six fragments and their landing spread.
- **Direct impact:** seek terrain contact near the target's feet before the carrier splits.

Six recorded complete splits began opening at 2.10 seconds and released fragments at 2.60 seconds. Those observations inform the model; they are not a universal timing guarantee across all conditions. The timing display remains visible when the main panel is hidden.

### Nak

S2 marks terrain entry and draws the underground portion separately before estimating the exit. Passing through the target's airborne body rectangle is not enough to qualify as an underground hit. S1 and SS use their ordinary flight carriers.

### Raon Launcher

S1 draws three wave streams. S2 marks two mine landing positions; SS marks a robot landing position. The forecast ends at placement. It does not promise which player a mine/robot will follow or when it will detonate.

### Grub

S2 draws four projectiles with distinct angle/speed offsets and favors more target contacts. Post-bounce paths are estimated and drawn with dashed orange segments. The current SS search targets first contact, without a repeated-damage timeline.

### Weather

Mirror and tornado paths are experimental. Reflection markers and dashed segments distinguish special-weather transitions. Unknown random weather keeps the ordinary flight calculation until the game reveals the effect; the overlay does not predict an unrevealed random result.

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
