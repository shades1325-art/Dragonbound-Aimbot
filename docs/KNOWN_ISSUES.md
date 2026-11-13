# Known issues and fix roadmap

This list separates implemented estimates from mechanics that still need evidence. Priority describes the next development work, not a claim that every item fails in every match.

## P1 — Physics and shot correctness

V28 fixes path/countdown timing disagreement, weather-segment child association, linear zero-gravity crossings and stale firing/calibration-power handling. These implementation fixes do not establish universal special-weather or impact accuracy.

V29 removes the false S2 rectangle stop, adds conservative wind coverage and mirror preference. It does not replace the unknown server collider with another guessed universal shape. Body contact may happen before the drawn terrain endpoint; that continuation remains dashed. Native hole coordinates can also differ from the sampled terminal-grid center.

| Area | What needs fixing or validation | Completion criterion |
| --- | --- | --- |
| Wind across mobiles | Several initial models extrapolate unmeasured wind using an inferred factor; universal coverage is not established | Compare predicted versus received launch acceleration and impact over multiple wind directions/strengths and independent matches |
| Grub bounce direction | Current terrain normals are estimated; historical native normal accuracy is unverified | Capture terrain at contact and compare incoming/outgoing vectors on flat ground, slopes, walls and damaged terrain |
| Grub left-facing S2 | The empirical fan was observed in right-facing bursts only | Capture matched left/right bursts and establish angle-offset mirroring/order before treating it as confirmed |
| Grub SS | First-contact aim is implemented; rolling, repeated damage and a general SS lifetime remain unresolved | Record a complete SS after contact and identify transitions and damage timing independently of tornado jumps |
| Turtle SS | Skybomb/Timebomb and six-fragment forecasts have limited native coverage, especially opening inside a tornado | Compare release time and all fragment positions/contacts across facing, wind and weather; preserve direct-impact behavior |
| Turtle S2 contacts | The wave law matches native samples, but terrain/body collision and splash are distinct | Use shot-time terrain/target snapshots and held-out contact/miss pairs before adopting a native body collider |
| Raon mines/robot | Only airborne flight and placement are predicted | Capture complete landing-to-movement-to-detonation sequences with ownership and target information; do not substitute animation range for blast radius |
| Nak S2 | Continuous terrain entry/exit is modeled from limited observed transitions | Compare underground exits on slopes, thin ground and irregular destructible terrain with a captured terrain snapshot |
| Mirror/tornado combinations | Elevated/repeated mirrors and combined weather are incompletely validated | Match recorded transitions and final contacts for isolated and combined effects, including multi-projectile shots |
| Boomer hook/backshot | V31 can reuse exact-angle/power current-match paths with near-exact wind; a universal headwind/apex transition law is unresolved | Validate distinct angle/power/wind changes independently; expand the bounded observed-path method without extending a short quadratic through a headwind phase change |
| Boomer SS and wind27 | V32 adds ordinary SS geometry and target-directed fallback, while SS transformation timing and W27 headwind lack broad native validation | Capture SS transformation/path clocks independently and validate new headwind trajectories without treating formula advice as a simulated hit |

## P2 — Reliability and performance

| Area | Remaining work | Completion criterion |
| --- | --- | --- |
| Client binding | The loader depends on internal client handlers and closure structure | Detect unsupported client layouts clearly and test a maintained set of compatible layouts |
| Difficult weather searches | Searches are bounded, but expensive scenes can still take longer | Profile worst-case multi-projectile terrain/weather scenes and compare p95/max search times and frame pacing |
| Chrome profiles | The loader reads the standard Chrome user-data directory | Add an explicit profile/endpoint option without changing game-origin restrictions |
| Multiple game tabs | Ambiguous targets wait rather than guessing | Add a user-facing tab picker and persist only the chosen local target |
| Loader stop | Stop ends tracking/recovery; the page overlay stays until reload | Add an explicit teardown path and verify removal of owned elements/listeners without disturbing game state |
| State writes | Status/preferences are written as JSON files; readers may observe partial writes during concurrency | Use atomic replacement and verify concurrent status reads and restart behavior |
| Regression portability | Only a subset of the local investigation tests is portable in this repository | Extract anonymized fixtures and migrate remaining model/weather tests without raw player records or machine paths |

## P3 — Documentation and usability

- Translate the in-game panel and diagnostic reasons into English, or add a language selector. The Windows launcher and repository guides are already English.
- Explain uncertainty and unsupported conditions consistently across every mobile.
- Add repeatable screenshots/video demonstrations for each shot mode, clearly identifying estimates.
- Add a visible calibration summary showing current-match samples versus prior/extrapolated data.

## Validation boundaries

The local V27 development pass tested Grub's three-shot model selection, four S2 branches, self-hit rejection, movement/wind updates, visibility controls and empty terrain. Thirty received bounce transitions supported the outgoing-speed estimate. Terrain-normal direction and fuse tracing also used synthetic geometry, which does not prove native complex-terrain hit accuracy.

The three-second S2 lifetime was observed in four projectiles from one burst. It is implemented for S2 only and still needs independent-burst validation. It is not an established SS fuse rule.

The portable repository tests cover recovery, movement/aim refresh, firing transactions, wind coverage, mirror ranking, S2 ground tracing, 36 anonymized S2 wave positions and 42 native SS fragment descriptors. V31 adds 79 anonymized ordinary Boomer trajectories and nine headwind S1/S2 pairs, plus whole-session holdout checks and synthetic path/terrain integration. They include synthetic weather cases; no native weather-transformed SS split has been validated. Passing them does not establish all-wind or exact native body-collision accuracy.
