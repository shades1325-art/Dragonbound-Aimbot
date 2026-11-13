# Turtle SS reference integration

V34 adds **Auto** alongside explicit **Timebomb**, **Skybomb** and **direct impact**. Auto compares both split styles; existing explicit preferences are retained. Open the panel with F9, select Turtle SS, choose the desired mode and target, then review the estimated angle, power and paths. F8 applies the suggestion; Mouse 5 or the shoot button applies and fires a ready suggestion through the existing user-triggered transaction.

## Reference concepts

[Creedo's timebomb introduction (21)](https://creedo.gbgl-hq.com/turtleguide/turtleguide21.php) describes opening the SS close to the target so its fragments have little time to separate. This supplies the new mode's objective. It is distinct from opening near the apex above the target.

[The windcharts (23)](https://creedo.gbgl-hq.com/turtleguide/turtleguide23.php) and [worked examples (24)](https://creedo.gbgl-hq.com/turtleguide/turtleguide24.php) motivate adjusting angle and power together, including target elevation. We also consulted [the linked base method (22)](https://creedo.gbgl-hq.com/turtleguide/turtleguide22.php) to understand those examples. The guide's screen units, bar values, charts and map-specific corrections are not imported as DragonBound constants.

[The tornado chapter (25)](https://creedo.gbgl-hq.com/turtleguide/turtleguide25.php) describes using residence time and low speed to change where the SS opens, along with several entry/exit arrangements. The search now includes extra low-power weather seeds. Its existing piecewise weather predictor supplies the opening state and child paths. The archived same-side exit quirk is not assumed to hold in DragonBound; an opening inside a tornado is explicitly flagged as unverified.

[Other SS tips (26)](https://creedo.gbgl-hq.com/turtleguide/turtleguide26.php) discuss choosing between SS styles, using ordinary shots for practice, and judging spread. Both split styles remain available for explicit selection. This update does not add automatic test shots, delay scheduling, a fixed S2-to-SS conversion, weather damage estimates or promised damage amounts.

These are historical Gunbound references. Their useful geometric ideas guide the search, while observed DragonBound launch parameters and split timing determine its numerical predictions. No page images, charts or extended source text are redistributed.

## Calculation

For opening time `T`, the initial candidate uses the current model:

```
position(T) = origin + (speed * direction + velocityBias) * T
             + acceleration * T * T / 2
```

Timebomb projects the displacement to an airborne point near the target onto each legal firing direction, producing an integer-power seed. Both facing directions and available angles are considered unless angle lock is selected. Nearby powers are refined. Weather candidates use piecewise position/velocity changes before evaluating the opening state.

The default Timebomb opening must be descending, above and within160 pixels of the target. This is an engineering search window, not a recovered native collision rule. Skybomb retains its apex criterion. Both modes reject a carrier that collides before opening, compute six fragments from the empirical split law, and trace terrain with the existing weather predictor. Timebomb uses a shorter child horizon to favor nearby split contacts. Missing crossings for unused fragments do not automatically reject a supported partial cluster.

V35 ranks tight contacts within14px horizontally/18px vertically before the wider28px/25px proximity count. It removes V34's hard three-tight-contact gate: a single verified nearby terrain contact can produce a weak estimate, explicitly marked when fewer than three tight contacts are present. Cluster centering, width, carrier-model allowance, one-UI-power sensitivity at the target plane and child flight duration break remaining ties. These are geometric diagnostics, not blast radii or hit probabilities. A native model can still miss even with a narrow nominal cluster; Timebomb also accumulates uncertainty during the carrier's flight. All results retain `predictedHit: false`.

The full-candidate budget remains12 by default/16 maximum, shared between styles and quick/refinement passes in Auto. The quick pass examines six promising angles per facing and a small power window before broad refinement. Production searches yield between analytic seeds, carrier traces and individual fragment traces, with an8ms soft target and a256-update cap. A single operation can overrun. A terrain-verified result appears immediately while refinement continues; it need not wait for both complete searches. Sampled terrain checks also protect reuse during refinement. Successful scene results can be reused for up to10seconds after checking sampled paths/contact pixels; movement, wind, calibration, target or mode changes invalidate them. Sampled terrain checks are not proof of arbitrary terrain equivalence.

Mirror preference preserves tight and wider contact counts before preferring a reflected path, including comparison between styles. A prediction does not establish a damage multiplier or carrier-to-fragment bonus inheritance.

## Remaining validation

Ten retained complete splits support the current ordinary split law for60 children and2100ms opening/500ms pause in those observations; none has a weather jump. They do not establish every weather combination. Matched first-shot predictions show20.57px and73.67px opening error from launch/gravity mismatch despite correct fragment generation. Current-match calibration narrows the launch interval; one low-power observation leaves substantial high-power uncertainty, including ambiguity between feasible round/floor models. Future comparisons should record the committed launch state, carrier transitions, actual opening location, each fragment trajectory, target pose and pre-shot terrain. In particular, opening inside a tornado may require additional native transition rules. Body contacts and splash can occur before the terrain endpoints shown by the current model.
