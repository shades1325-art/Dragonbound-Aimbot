# Turtle SS reference integration

V30 adds a **Timebomb** choice alongside **Skybomb** and **direct impact**. Open the panel with F9, select Turtle SS, choose the desired mode and target, then review the estimated angle, power and paths. F8 applies the suggestion; Mouse 5 or the shoot button applies and fires a ready suggestion through the existing user-triggered transaction.

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

The default opening must be above and within 160 pixels of the target. This is an engineering search window, not a recovered native collision rule. Skybomb retains its apex criterion. Both modes reject a carrier that collides before opening, compute six fragments from the empirical split law, and trace terrain with the existing weather predictor. Timebomb uses a shorter child horizon to favor nearby split contacts. At least three nearby terrain contacts are required; all results remain estimates with `predictedHit: false`.

Both modes preserve the bounded full-candidate budget (12 by default, 16 maximum) and short-lived cache. Mirror preference still preserves the estimated number of nearby fragment contacts before selecting a reflected path. A prediction does not establish a damage multiplier or carrier-to-fragment bonus inheritance.

## Remaining validation

Native captures support the current ordinary split law and opening/release timing. They do not establish every weather combination. Future comparisons should record the committed launch state, carrier transitions, actual opening location, each fragment trajectory, target pose and pre-shot terrain. In particular, opening inside a tornado may require additional native transition rules. Body contacts and splash can occur before the terrain endpoints shown by the current model.
