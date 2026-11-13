# Frog model and validation boundary

Frog uses one airborne family for S1/S2 and a separate SS family. The observed client mapping is mobile21, carriers64/66 and surface continuations65/67. The collector associates continuations using family, shot type, same receipt window, parent end clock and a conservative spatial window. It requires one matching parent; it does not establish ownership by proximity to a player. Continuations have explicit server paths and zero ordinary launch coefficients and are excluded from air calibration.

## Carrier

Three retained own low-force launches use UI forces18,1,45 and native speeds43,2,108. Their quantized ratio intervals support an initial ratio near2.4; they do not validate high-force extrapolation. Current-match samples refine the shared carrier when compatible, falling back to shot-specific rows when their ratios disagree. Both feasible round/floor intervals contribute to uncertainty. Merely switching S1/S2/SS does not require a new pair of calibration shots.

Seven retained wind states across three matches match this empirical candidate:

```
wx = floor(windPower * cos(windAngle))
wy = ceil(-windPower * sin(windAngle))
ax = biasX + round(3.4 * wx)
ay = matchGravity + round(3.4 * wy)
```

Observed gravity differs between matches, including302,311,318. Exact current-wind samples take priority; inferred transfers retain broad uncertainty. These observations do not recover a universal server law or validate wind above25. Initial gravity311 is an uncertain prior rather than a cross-match constant. Native received-position checks establish ordinary replay, separate from predicting an unseen launch.

## Surface and aiming

The first airborne terrain contact is not labelled a confirmed hit. Received carriers can have no impact while their continuation carries the later explosion. The aim search therefore seeds landing locations away from the target and scores the estimated endpoint after surface motion.

Nine retained continuation paths show net-left S1 motion, net-right S2/SS motion, ordinary duration1.50–1.52seconds and one SS duration3seconds. Complex contours can temporarily reverse horizontal direction. Observed effective contour speed ranges roughly37–74px/s; rotation does not establish a fixed rolling radius.

The forecast uses a deliberately approximate50px/s contour marcher. It follows a local top surface and stops when a step, wall or edge exceeds its supported window. It does not invent native jumps, falls, wall wrapping or a universal rolling law. Surface paths are drawn orange/dashed. Their endpoint, duration and uncertainty remain estimates, especially after terrain destruction or weather interactions. A narrow endpoint-to-target distance is not a damage guarantee; all Frog suggestions retain `predictedHit:false`.

## Runtime cost and remaining work

The search yields between analytic goals and full traces, targets8ms between operations, checks at most24 full candidates and caps a search burst at96updates. It displays a ready candidate while refining. An individual trace can overrun the soft time target. Pose, wind, target, shot, model or mode changes invalidate the scene; cached/in-progress best paths receive sampled terrain checks.

Further native validation needs moderate/high-force own launches, shot-time terrain and committed inputs, then independent comparison of first contact, surface path and final explosion for each shot/direction. Exact steep contours, moving blockers, body/splash collision, post-contact weather and damage are not established by the current observations.
