# Argon Orchestrator Rules — Breath of Fire II: Rekindled

## Strict Directory Ownership

1. **Worker A (`src/core/**` and `tests/core.test.ts`)**
   - Pure TypeScript (strict mode) ONLY.
   - **ZERO** imports from `three`, `react`, `react-dom`, `@react-three/fiber`, `zustand`, `miniplex`, or browser/DOM globals (`window`, `document`, `HTMLCanvasElement`).
   - Owns:
     - Deterministic turn-based combat state machine (`INIT` -> `COMMAND_SELECT` -> `RESOLVE_QUEUE` -> `CHECK_VICTORY` -> `VICTORY` | `DEFEAT`) with sustained Dragon Transformations fueled by a shared Sync/AP pool.
     - 6 canonical Shamans (`sana`, `seso`, `spoo`, `solo`, `seny`, `shin`) using the Decorator Pattern with an Armor Break threshold instead of permanent fusion loss.
     - Dual-archetype equipment engine: Progression-Scaling Relics & Build-Altering Quest Equipment passive combat hooks.
     - Centralized World Flag & Multi-Stage Quest State Machine (`HIDDEN` -> `DISCOVERED` -> `ACTIVE` -> `COMPLETED`).

2. **Worker B (`src/engine/**`)**
   - Owns React Three Fiber (R3F) & Three.js rendering layer.
   - **MUST NOT** modify `src/core/**`, `src/ui/**`, `src/data/**`, or `src/systems/**`.
   - Owns:
     - 250 m × 250 m chunked open-world streaming loaded asynchronously within a 500 m radius.
     - `InstancedMesh` batching keeping active draw calls strictly `< 150` (target `< 45`).
     - `BillboardSprite` supporting 8-directional facing, UV sheet animation, Shaman-fusion aura shaders, hit-flash shaders, and ground shadows.
     - Custom GLSL depth fog & water shaders and procedural canvas sprite sheets & terrain textures.
     - Seamless spring-arm overworld-to-combat camera transitions on the live terrain.

3. **Worker C (`src/ui/**`)**
   - Owns the Mobile Touch HUD and interactive drawers.
   - **MUST NOT** modify `src/core/**`, `src/engine/**`, `src/data/**`, or `src/systems/**`.
   - Owns:
     - Landscape layout with `env(safe-area-inset-*)` padding and landscape orientation guard.
     - Bottom-left floating Virtual Analog Stick and bottom-right Contextual Action Buttons (`>= 48px x 48px` touch targets).
     - Zero-menu Party Leader Hot-Swapping and terrain-tag contextual field actions.
     - Mobile drawers: Chronicle & Side Quest Tracker, Shaman Fusion Altar, Equipment & Relic Synergy Inspector (live scaling formulas), and Township & Campfire Inspector.

4. **Worker D (`src/data/**`, `src/systems/**`)**
   - Owns structured game data schemas and world systems.
   - **MUST NOT** modify `src/core/**`, `src/engine/**`, or `src/ui/**`.
   - Owns:
     - Vertical Slice content for HomeTown / Coursair / Township Frontier (Ryu, Bow, Katt, Shamans Sana & Seso, Dragon Tear, Coliseum Fang, Coursair Innocence, and companion side quests).
     - Enemy AI (`Patrol`, `Aggro_Sight`, `Ambush`).
     - Diegetic Township hub driven by World Flag Registry.
     - Wind/Scent Hunting, Manillo Fishing, and Campfire Cooking ecosystems.
     - Miniplex ECS world and Zustand global store.
