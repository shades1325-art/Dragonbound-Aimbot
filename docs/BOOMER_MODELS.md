# Boomer flight models

Use **Automatic** or **Physics-only** to search simulated paths. Explicit Hook400, Backshot250 and other guide choices produce historical formula advice with their own limitations. The selected mode is visible in the panel. Mouse 5 and the shoot button use the existing refreshed, user-triggered firing transaction.

## Ordinary flight

V31 fixes a launch-mapping failure: fitting a free slope from powers75,96 and101 produced a poor prediction at power360, despite an exact wind match. The ordinary model now uses a stable archive-supported slope, while local samples calibrate component velocity biases, acceleration and origin. This prevents a narrow power range from distorting the force scale for later shots. Local fits remain provisional and track power extrapolation in their position allowance.

The fallback uses:

```
k = PI / 1.8
vx = k * power * cos(worldAngle) - 0.18311624637813753
vy = -k * power * sin(worldAngle) - 14.9939865455479
ax = 4 * trunc(windX) - 0.07332664357723682
ay = 4 * trunc(windY) + 190.71956437063875
```

Here `windX = W*cos(windAngle)` and `windY = -W*sin(windAngle)`. Position starts at the current pre-shot muzzle. These are empirical parameters, not recovered server constants. In particular, truncating negative wind components improves the held-out leftward/upward cases relative to flooring them.

The fallback applies only to ordinary S1/S2 zero/tailwind dynamics; existing zero-wind calibration/prior handling remains available. Tailwind classification uses horizontal wind and actual world launch direction, including body slope. Headwind and SS are excluded. The fallback is capped at3seconds, and at2.1seconds for winds outside the observed wind-vector hull or angles outside the sampled canonical13–83degree range. An uncertainty label remains visible. Three seconds is a forecast bound, not a detonation time. Current ordinary forecasts stop before unresolved random/mirror/tornado columns.

## Recorded headwind paths

Some observed headwind shots change acceleration near the vertical apex even when horizontal motion never reverses. A first-second quadratic can therefore look accurate and still diverge by hundreds of pixels later. V31 does not extend that quadratic through the transition.

Instead, the current-match method reuses an already observed S1/S2 path under these constraints:

- Same match, exact world angle and integer power; S1 and S2 can share the limited ordinary-path evidence.
- Same wind direction, with strength difference at most one; the shot must remain in the headwind class.
- Translate the observed displacement to the current shot's muzzle, applying the recorded small origin correction.
- Correct displacement by `2 * deltaWindVector * time²`. This is a narrowly tested transfer approximation.
- Follow only the observed pre-weather prefix, at most4.1seconds, and test current terrain and angle limits.
- Stop at an unresolved special-weather column; preserve angle lock when selected.

The search considers bounded recorded candidates and fully traces at most16. It chooses from the recorded forces rather than interpolating a new one. If no recorded path reaches the target, the ordinary search and existing formula fallback rules continue. A missing recorded solution does not imply that the physical shot is impossible. Moving or changing slope can make a recorded world angle inaccessible through the mobile's native limits.

## Evidence and tests

The ordinary fixture contains79 anonymized zero/tailwind launches across20 independent match groups and3282 points through3seconds. All launch/session holdouts fit only on the other launches/sessions and predict from UI power, world angle, displayed wind and the pre-shot muzzle. The held-out native velocity/acceleration/path is not an input.

| Comparison | Mean trajectory RMSE | Worst point error |
| --- | ---: | ---: |
| Truncated-wind model, whole-session holdout | 2.19px | 11.75px |
| Truncated-wind model, whole-launch holdout | 2.15px | 11.48px |
| Floored-wind alternative, whole-session holdout | 3.52px | 27.58px |

The headwind fixture contains nine tightly matched native S1/S2 pairs. Four exact-wind pairs have identical displacement samples. Five pairs differing by one wind strength have a corrected worst error of6.72px over their common observed horizons. This supports their narrow reuse conditions, not arbitrary force/angle changes or a universal turn law.

Synthetic tests additionally check movement translation, terrain blocking, unknown-weather boundaries, legal angles, angle lock, path horizons, a return segment and panel integration without inventing ballistic coefficients. These tests do not establish native collision geometry, damage or a live hit rate. The fixtures contain relative coordinates and anonymous session groups; raw match records remain outside the repository and ZIP.

SS, broad Hook/Backshot interpolation, compound weather and a general headwind force law remain open work.
