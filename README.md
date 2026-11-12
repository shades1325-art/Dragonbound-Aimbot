# DragonBound Aimbot

Trajectory prediction, angle and power assistance, and a Windows one-click launcher for DragonBound. The current application is **V28**, with refined Turtle SS search and Mouse 5 shooting.

## Introduction

DragonBound Aimbot adds an overlay to an existing DragonBound game tab in Chrome. It reads the current mobile, selected shot, player positions, terrain and weather, then searches for a firing angle and power and draws the predicted path. It can apply the suggested angle and power when your turn is ready.

The project combines ordinary ballistic models, shot-specific behavior, calibration from observed shots, and reference formulas for Boomer. Predictions are estimates where the mechanics or wind conditions have not been verified. A drawn intersection is not a guarantee of damage.

The launcher finds the game tab automatically, follows new matches and restores the overlay after a page reload within the same Chrome session. You do not need to enter a process ID. REA was used during development; it is not a runtime dependency.

## Supported mobiles

| Mobile | Implemented assistance | Main limitation |
| --- | --- | --- |
| Aduka | Angle/power search, initial model, movement and wind updates | Unmeasured wind conditions remain estimates |
| Boomer | Learned flight models; Hook400, Backshot250, Fix50/70, Shotgun, Lob and high-angle reference methods | Some formula regions and complex weather have incomplete coverage |
| ICE | S1/S2/SS recognition, shared and shot-specific calibration, initial estimates | Cross-wind accuracy requires more validation |
| Turtle | S1; paired S2 waves; direct-impact and airborne-split SS modes with timing display | SS fragment placement and combined weather remain experimental |
| Nak | S1/SS flight and S2 terrain entry, underground segment and exit search | Complex underground geometry is estimated |
| Raon Launcher | Three S1 streams; two S2 landing points; SS robot landing point | Mine/robot movement and later detonation are not predicted |
| Grub | S1/S2/SS, four separate S2 projectiles, estimated terrain bounces | Left-facing spread, complex bounce normals and SS repeated damage remain unverified |

See [Usage](docs/USAGE.md) for controls and [Known issues and fixes](docs/KNOWN_ISSUES.md) for the remaining work.

## Quick start

The source checkout does not include `node.exe`, installed dependencies, personal settings or recorded matches. Prepare the runtime once, then use the one-click entry point.

Requirements: Windows, PowerShell, Chrome, and Node.js 24 or later installed with npm. The launcher currently expects Chrome's standard user-data location.

```powershell
git clone https://github.com/shades1325-art/Dragonbound-Aimbot.git
cd Dragonbound-Aimbot
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\prepare-runtime.ps1
```

1. Open DragonBound in Chrome and enter the game or a room.
2. Open `chrome://inspect/#remote-debugging` in that Chrome instance and enable remote debugging. If Chrome asks to allow the connection, approve it.
3. Double-click **Inject.vbs** in the repository folder. Alternatively, run `powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File .\Launch.ps1`.
4. Select a target in the overlay and choose the automatic search mode. Enable automatic angle/power adjustment if desired.
5. Review the path and suggested power, then fire using the game controls or the overlay's explicit shoot button.

Ordinary aim assistance does not continuously fire. Optional Boomer Auto Learn can start games and fire test shots only after you explicitly start it in a verified bot-only room you own.

**Mouse 5** (the forward side button) refreshes, applies and fires the current ready aim. **F9** toggles the control panel. **F8** refreshes and applies the suggested angle/power. The trajectory visibility control is separate from panel visibility. Running the launcher again restores the panel.

The existing in-game panel contains Vietnamese labels; all repository documentation is in English. See the ordered controls in [Usage](docs/USAGE.md).

## Documentation

- [Usage and troubleshooting](docs/USAGE.md)
- [Changelog](CHANGELOG.md)
- [Known issues and prioritized fixes](docs/KNOWN_ISSUES.md)
- [Development, tests and portable packaging](docs/DEVELOPMENT.md)
- [Third-party notices](THIRD_PARTY_NOTICES.md)

## Status and shutdown

From the repository folder, after preparing the runtime:

```powershell
.\runtime\node.exe .\app\one-click.mjs --status
.\runtime\node.exe .\app\one-click.mjs --stop
```

Stopping the loader stops recovery and tracking. Reload the game tab to remove the already-injected overlay. Closing Chrome also ends the loader's current browser session.

## Build a portable package

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\build-package.ps1
```

The output is `dist/DragonBound-OneClick.zip`. It includes a prepared Windows Node runtime and the WebSocket dependency, so recipients do not need a separate Node installation. Extract the archive before running `Inject.vbs` and keep the extracted folder intact.

## Current limitations

Wind extrapolation, tornadoes, mirror combinations and special-shot behavior have incomplete native validation. Unknown random weather uses ordinary flight until the game reveals a concrete effect. Calibration is isolated by match; a prior model is available when no current-match samples exist, and its uncertainty remains visible.

The loader depends on the structure of the current game client. A game update can break binding or require a new model. Automated tests check selected model and integration behavior; they do not establish universal hit accuracy. The detailed [fix roadmap](docs/KNOWN_ISSUES.md) separates observed issues from unverified mechanics.
