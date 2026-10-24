# Castle town commercial street v4

Existing town-v3 buildings, fountain, trees, board and cave are reused unchanged through art.js paths. Existing residents and companions retain their sprites and motions; no hiring feature.

New generated references: warm painterly four-surface atlas (main street, side street, plaza, lawn), and six isolated decorations (lamp, planter, bench, hedge, pot, sign). Both were generated using the approved town-v3 modular atlas as style reference, preserving its golden stone, warm wood, soft brushwork and top-down perspective. Lossless WebP source retains all source pixels/alpha.

Rebuild: `python fushigi-town-v4/build.py` (Pillow, NumPy, SciPy). Art registration records isolated sprite bounds and anchors. All buildings keep the calibrated 1.65-tile doorway.

The layout defines road materials, building footprints and service ports together. All four shops face the same boulevard. The central avenue connects the castle, fountain square and southern residential streets. Painted curbs follow the pavement borders. Decorations block their visible bases; shop entrances remain open. Layout version migration places older outdoor saves safely at the inn entrance.

Validation: MVP ALL OK; castle-town and spatial-contract tests pass (2127 connected cells, 57 props). Browser check walks all facilities (112 steps), checks nine closed houses, portrait/landscape, equal 96px character height inside/outside, town reload and dungeon zoom after reload; no page errors. Run `python fushigi-town-v4/check_runtime.py` with the local game server to reproduce.
