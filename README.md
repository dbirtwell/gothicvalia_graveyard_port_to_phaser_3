# Gothicvania Phaser 2 -> Phaser 3 Port Notes

This prototype was ported from Phaser 2 to Phaser 3 and now uses a local Phaser 3 build stored in this repository.

Attribution:
- Original Phaser 2 prototype art and code by Ansimuz: https://ansimuz.itch.io
- Music by Pascal Belisle.
- Fonts by Somepx.
- Please support the above artist.

## Note
- GitHub Copilot Pro AI was used to assist with most of the Phaser 2 -> Phaser 3.90 porting and refinement process.


## Phaser Version

- Current Phaser 3 version: `3.90.0`
- Local library file: `phaser.min.js`
- Version marker file: `.phaser-version`

## Library Replacement

- Removed Phaser 2 dependency.
- Downloaded Phaser 3 (`3.90.0`) into the project as `phaser.min.js`.
- Updated `index.html` to load local Phaser instead of CDN.
- Added a DOM mount node (`<div id="gameDiv"></div>`) so the Phaser 3 `parent` config can target a known container.

## Major API Changes Needed

- Replaced Phaser 2 state manager (`game.state.add/start`) with Phaser 3 scenes:
  - `BootScene`
  - `PreloadScene`
  - `TitleScreenScene`
  - `PlayGameScene`
  - `GameOverScene`
- Replaced `new Phaser.Game(width, height, ...)` with Phaser 3 config object.
- Replaced Phaser 2 sprite/tilemap/audio/input APIs with Phaser 3 equivalents.

## Architecture and Scene Details

- Runtime architecture is scene-based (Phaser 3):
  - `BootScene`: minimal startup and loading bar asset bootstrap.
  - `PreloadScene`: loads all textures, tilemaps, atlases, and audio.
  - `TitleScreenScene`: title/instructions flow and Enter-to-start logic.
  - `PlayGameScene`: tilemap creation, physics, camera, enemies, controls, combat.
  - `GameOverScene`: game-over screen and restart flow.
- Entity architecture uses ES6 classes instead of Phaser 2 prototype patterns:
  - `Player`, `HellGato`, `Ghost`, `SkeletonSpawner`, `Skeleton`, `EnemyDeath`.
- Global gameplay state kept intentionally small for parity with original prototype:
  - `player`, `enemiesGroup`, `map`, `hitbox`, `hurtFlag`, `jumpingFlag`, `attackingFlag`.
- Animation lifecycle hooks migrated to Phaser 3 animation events:
  - `Phaser.Animations.Events.ANIMATION_COMPLETE`.

## Scene Flow

- Startup order:
  - `Boot` -> `Preload` -> `TitleScreen` -> `PlayGame` -> `GameOver`.
- Title behavior:
  - First Enter shows instructions.
  - Second Enter starts gameplay.
- End condition:
  - Reaching world X threshold transitions to `GameOver`.
- Restart behavior:
  - Enter in `GameOver` returns to `PlayGame`.

## Gameplay Porting Details

- Preserved game resolution (`384x224`) and pixel-art rendering.
- Preserved title screen flow:
  - First press of Enter shows instructions.
  - Second press starts gameplay.
- Preserved game over flow and Enter-to-restart behavior.
- Preserved parallax behavior for mountain and graveyard layers.
- Preserved map loading, collision layer setup, and one-way collision tiles.
- Preserved keyboard controls:
  - Move: Left/Right
  - Crouch: Down
  - Jump: `C` or `K`
  - Attack: `X`
- Preserved enemy roster and behavior:
  - Skeleton spawners
  - Skeletons
  - Hell Gato
  - Ghosts
- Preserved combat and hurt/death feedback audio flow.

## Entity Architecture Changes

- Migrated from Phaser 2 prototype inheritance (`Phaser.Sprite.call(...)`) to Phaser 3 classes:
  - `Player`
  - `HellGato`
  - `Ghost`
  - `SkeletonSpawner`
  - `Skeleton`
  - `EnemyDeath`
- Migrated animation callbacks to Phaser 3 animation events (`ANIMATION_COMPLETE`).
- Replaced Phaser 2 child-sprite attack hitbox with a Phaser 3 physics `Zone` that is updated each frame relative to player facing.

## Tilemap / Physics Notes

- Migrated from `game.add.tilemap` to `this.make.tilemap`.
- Migrated layer creation to Phaser 3 tilemap layer APIs.
- Replaced Arcade overlap/collide calls with Phaser 3 physics world colliders/overlaps.
- Used `body.blocked.down` in Phaser 3 where Phaser 2 code used `body.onFloor()`.
- Camera/world bounds are clamped to map pixel dimensions (`map.widthInPixels`, `map.heightInPixels`).

## Editing the World Map

Use **Tiled** (the map editor used by the project) to change level layout.

### Files you will edit

- Main map file: `assets/maps/map.json`
- Tileset images referenced by map:
  - `assets/environment/tileset.png`
  - `assets/environment/objects.png`

### Expected map structure

- Map is orthogonal, `16x16` tile size.
- Layer names are important and must match exactly:
  - `Back Layer`
  - `Main Layer`
  - `Collisions Layer`
- Gameplay code reads these exact layer names in `game.js`.

### Collision rules used by the code

- Tile index `1` in `Collisions Layer` is treated as solid collision.
- Tile index `2` is treated as one-way top collision.
- If you change collision tile IDs, also update `PlayGameScene.createTileMap()` and `setTopCollisionTiles()` in `game.js`.

### Recommended editing workflow

1. Open `assets/maps/map.json` in Tiled.
2. Keep the same map/layer names unless you also update code references.
3. Paint visual terrain in `Back Layer` and `Main Layer`.
4. Paint collision logic in `Collisions Layer`.
5. Export/save back to `assets/maps/map.json`.
6. Reload the game page to test collision and camera behavior.

### If you change world size

- Width/height changes are supported; camera and physics bounds are calculated from map pixel size.
- Re-check spawn locations in `PlayGameScene.populate()` because enemy/player coordinates are tile-based and may need retuning.

## Known Practical Differences

- Phaser 3 attack input currently mirrors the Phaser 2 style (holding `X` can retrigger when allowed).
- Phaser is now loaded locally from `phaser.min.js` (no CDN dependency at runtime).

## Post-Port Visual Grounding Tweaks (Phaser 3.90)

After the core Phaser 2 -> Phaser 3 migration was completed, enemy grounding was tuned to better match floor tiles and avoid a floating look.

### Skeleton Y-axis alignment updates

- Problem observed:
  - Skeletons looked slightly above the floor during rise/walk phases.
- Files updated:
  - `game.js`
- Spawn tuning in `SkeletonSpawner.step()`:
  - Final spawn Y offset uses `(this.y / 16) - (30 / 16)` when creating `Skeleton` instances.
  - This places newly spawned skeletons lower than the earlier port baseline.
- Movement/ground contact tuning in `Skeleton` constructor:
  - Final physics body offset uses `this.body.setOffset(15, 10)`.
  - This keeps walking skeleton sprites visually seated into floor tiles.

### Why this was part of the port

- Phaser 2 -> Phaser 3 conversions can preserve behavior but still require sprite/body alignment passes.
- Matching sprite art anchors and Arcade body offsets is necessary for pixel-art parity after API migration.
- These final Y-axis adjustments are part of the completed Phaser 3.90 porting process, not separate gameplay feature work.

## How to Run

Open `index.html` in a browser (or serve the folder with a simple local HTTP server) and the game should run using the local Phaser 3 library.

## Upgrading Phaser Locally

When you want to upgrade from `3.90.0` to a newer Phaser 3 release, run these commands from the project root.

```bash
# 1) Set the target Phaser version
NEW_VERSION="3.91.0"

# 2) Download the matching minified build locally
curl -fSL "https://cdn.jsdelivr.net/npm/phaser@${NEW_VERSION}/dist/phaser.min.js" -o phaser.min.js

# 3) Update the version marker file used by this repo
printf "%s\n" "${NEW_VERSION}" > .phaser-version

# 4) Quick sanity check
node --check game.js
```

Notes:

- Keep the script reference in `index.html` as `phaser.min.js` (no change needed).
- Update the `Phaser Version` section in `README.md` so docs match the new local file.
