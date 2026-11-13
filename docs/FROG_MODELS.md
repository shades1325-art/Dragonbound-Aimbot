# Frog model and validation boundary (V37)

Frog uses one airborne family for S1/S2 and a separate SS family. The observed client mapping is mobile21, carriers64/66 and surface continuations65/67. The collector associates continuations using family, shot type, same receipt window, parent end clock and a conservative spatial window. It requires one matching parent; it does not establish ownership by proximity to a player. Continuations have explicit server paths and zero ordinary launch coefficients and are excluded from air calibration.

## Carrier

Three initial own low-force launches use UI forces18,1,45 and native speeds43,2,108, supporting a provisional ratio near2.4. Five later own launches at forces105–158 instead support a ratio near2.45 in that match. Current-match samples refine the shared carrier when compatible, falling back to shot-specific rows when ratios disagree. Both feasible round/floor intervals contribute to uncertainty. Merely switching S1/S2/SS does not require another pair of calibration shots.

Seven initial wind states across three matches match a coefficient near3.4. The later match instead requires a coefficient near3.28. V37 fits a feasible rounded interval for each match:

```
wx = floor(windPower * cos(windAngle))
wy = ceil(-windPower * sin(windAngle))
ax = round(matchFactor * wx)
ay = round(matchGravity + matchFactor * wy)
```

The fit assumes zero horizontal wind intercept and rejects inconsistent observations. It intersects rounding intervals rather than treating quantized values as exact continuous coefficients. Exact current-wind samples take priority; inferred transfers retain uncertainty in factor/gravity. Leave-one-launch-out checks on the five later observations predict their launch speeds and accelerations within one unit. This is not a held-match or universal-wind validation. Initial ratio2.4/gravity311/factor3.4 remain uncertain priors, and wind above25 remains unverified.

## Surface and aiming

The first airborne terrain contact is not labelled a confirmed hit. Received carriers can have no impact while their continuation carries the later explosion. Final-endpoint centering alone also misses relevant behavior: a retained SS path passes close to a player associated with recorded damage, while the final explosion is about129px from the available player pose. The available damage list has no timed damage formula and does not recover a blast radius.

The combined14 retained paths show net-left S1 and net-right S2/SS, ordinary duration1.50–1.52seconds and one SS duration3seconds. Complex contours can temporarily reverse horizontal direction. A later S2 travels127px horizontally and136px along its sampled contour in1.5seconds, exceeding V36's entire75px contour budget.

Six ordinary paths with sufficiently recent available player poses, across three matches, support a two-rate timing estimate on their observed contours. Leave-path/session-out fits consistently select a24px circle around player feet, with rates near85px/s away and30px/s nearby. On held sessions, mean absolute contour-length error falls from5.34px for constant50 to4.84px; worst falls from17.37px to12.26px. These diagnostics use received spatial contours and uncertain pose snapshots, so they do not validate independently predicted terrain endpoints. The single SS case is less certain.

V37 uses this provisional85/30 contour marcher, including living players in the scene. It ranks estimated target proximity and dwell over the entire surface path, rather than only the endpoint. At least0.12seconds of predicted proximity is an engineering acceptance criterion, not a recovered damage tick. Estimated self/ally exposure rejects a suggestion. Player movement invalidates the cached scene.

The marcher follows a local top surface and stops at unsupported steps, walls or edges. It does not invent native jumps, falls or wall wrapping. Orange dashed paths, proximity windows, endpoint and damage remain estimates. Every Frog suggestion retains `predictedHit:false`.

## Runtime cost and remaining work

The search starts with spread angle seeds, then checks across feasible native angles before repeating powers at the same angle. Fractional legal limits and both valid inverse flight roots are retained. High mode also affects final ranking. Short searches can extend from6.5 to10seconds, with extrapolation marked; neither horizon is a recovered native fuse limit. A bounded weather power fallback remains provisional.

The generator yields between analytic goals and full traces, targets8ms between operations, checks at most192 full candidates across all stages and caps a burst at160updates. It displays ready aim while refining and reports coverage counts. A single trace can overrun the soft time target. Scene changes, living-player poses and sampled terrain invalidate reuse.

User-fired Frog shots now retain regional terrain and living-player snapshots alongside committed inputs. Further validation must independently compare first contact, full surface path, proximity time and final explosion, especially for SS, steep contours, weather, damaged terrain and moving players. Exact body/splash geometry and damage remain unresolved.
