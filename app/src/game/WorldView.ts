/**
 * Voxel world view for one LaneWorld — MagicaVoxel models from Expo-Crossy-Road.
 *
 * LaneWorld = rules (seeded traffic). WorldView = paint job only.
 * Camera / lighting / textures intentionally mirror EvanBacon/Expo-Crossy-Road
 * so the split panes read as the real game, not colored boxes.
 */

import * as THREE from "three";
import { LaneWorld } from "../core/LaneWorld";
import {
  cloneTemplate,
  getCrossyKit,
  pickIndex,
  preloadCrossyAssets,
  type CrossyKit,
} from "./CrossyAssets";
import {
  createFlyCharacter,
  hopActionFromDelta,
  type FlyCharacter,
} from "./characters/FlyCharacter";
import {
  createHumanCharacter,
  type HumanCharacter,
} from "./characters/HumanCharacter";

/** Same sky as Expo (`GameSettings.sceneColor` / Colors.blue). */
const SCENE_COLOR = 0x87c6ff;
/** Expo `groundLevel` — trees / hero sit on the strip top. */
const GROUND_LEVEL = 0.4;
/** Expo `CAMERA_EASING` — soft follow so hops don't snap the frame. */
const CAMERA_EASING = 0.03;
/**
 * Expo CrossyCamera uses zoom=400 with frustum = ±(cssSize * devicePixelRatio).
 * We still use that frustum formula, but pick zoom from TARGET_HALF_W so a
 * desktop split-pane shows enough rows ahead (not a phone-tight crop).
 */
const CROSSY_ZOOM = 400;
/**
 * How many world units fill half the pane width (smaller = more zoomed in).
 * Expo phone ≈ 2.9; we previously used 4.7 which still showed ~2 full tree
 * columns on each side. 3.85: playable strip (±4) fills most of the pane;
 * only a thin sliver of the innermost wall trees (±5) peeks at each edge.
 */
const TARGET_HALF_W = 3.45;
/**
 * Shift the follow target so the look-at point sits a few rows *ahead* of the
 * hero — classic Crossy framing (player in the lower third, path up-screen).
 */
const LOOK_AHEAD_BIAS = 5;

/**
 * Camera sits behind the player on −Z so forward (+Z) hops read UP the screen.
 * Slight −X keeps a mild Crossy isometric tilt (~10–15°), not a side-on view.
 * (Expo's GameEngine set camera.z = +1, which made +Z go *down* for us.)
 */
const CAM_POS = { x: -0.45, y: 4.6, z: -4.2 };

export class WorldView {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.OrthographicCamera;
  /** Matches Expo `worldWithCamera` → world group that we ease for follow. */
  readonly root = new THREE.Group();
  private rowGroup = new THREE.Group();
  private playerMesh: THREE.Group;
  private carMeshes = new Map<string, THREE.Object3D>();
  private builtThrough = -1;
  private kind: "human" | "fly";
  private lastFlyX = 0;
  private lastFlyZ = 0;
  private flyFacingReady = false;
  private kit: CrossyKit | null = null;
  private light: THREE.DirectionalLight;
  /** Pending LaneWorld so asset-load reset can rebuild immediately. */
  private lastWorld: LaneWorld | null = null;

  constructor(kind: "human" | "fly") {
    this.kind = kind;
    this.scene.background = new THREE.Color(SCENE_COLOR);

    // Expo CrossyWorld ambient: intensity 1.8 (bright voxel look).
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.8));

    // Match Expo CrossyScene directional light + soft shadows.
    this.light = new THREE.DirectionalLight(0xffffff, 1.0);
    this.light.position.set(20, 30, 0.05);
    this.light.castShadow = true;
    this.light.shadow.mapSize.set(2048, 2048);
    // Slightly wider shadow frustum — we zoomed out, so keep trees/cars lit.
    const d = 22;
    const v = 12;
    this.light.shadow.camera.left = -d;
    this.light.shadow.camera.right = 9;
    this.light.shadow.camera.top = v;
    this.light.shadow.camera.bottom = -v;
    this.light.shadow.camera.far = 100;
    this.light.shadow.bias = 0.0001;
    this.scene.add(this.light);

    this.scene.add(this.root);
    this.root.add(this.rowGroup);

    // Classic Crossy: behind the player (−Z) so hops travel UP the viewport.
    // Numbers live in CAM_POS so beginners can tweak one place.
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -50, 50);
    this.camera.position.set(CAM_POS.x, CAM_POS.y, CAM_POS.z);
    this.camera.lookAt(0, 0, 0);
    this.camera.zoom = CROSSY_ZOOM;

    this.playerMesh = kind === "fly" ? createFlyCharacter() : createHumanCharacter();
    this.root.add(this.playerMesh);

    // Kick off asset load; rows rebuild once ready.
    void preloadCrossyAssets()
      .then((k) => {
        this.kit = k;
        this.reset();
        if (this.lastWorld) this.sync(this.lastWorld);
      })
      .catch((e) => console.error("[crossy] asset load failed", e));
  }

  /**
   * Expo `CrossyCamera.updateScale` — same frustum math, but zoom is chosen so
   * each split pane shows ±TARGET_HALF_W world units (zoomed out vs phone).
   * Raw zoom=400 on a half-desktop pane would crop to ~±1.5 and look broken.
   */
  setViewSize(cssWidth: number, cssHeight: number) {
    // Re-apply pose every resize so HMR / old SplitScreen instances don't keep
    // a stale constructor camera (common when only this file hot-updates).
    this.camera.position.set(CAM_POS.x, CAM_POS.y, CAM_POS.z);
    this.camera.lookAt(0, 0, 0);

    const scale = Math.min(
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
      2
    );
    const w = Math.max(1, cssWidth);
    const h = Math.max(1, cssHeight);
    const zoom = Math.max(1, (w * scale) / TARGET_HALF_W);
    this.camera.left = -(w * scale);
    this.camera.right = w * scale;
    this.camera.top = h * scale;
    this.camera.bottom = -(h * scale);
    this.camera.zoom = zoom;
    this.camera.updateProjectionMatrix();
  }

  /** @deprecated use setViewSize — kept so old callers don't crash mid-hot-reload */
  setAspect(aspect: number) {
    // Approximate a 400×700 half-pane if only aspect is known.
    const h = 700;
    const w = Math.max(1, aspect) * h;
    this.setViewSize(w, h);
  }

  dispose() {
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
    });
  }

  reset() {
    while (this.rowGroup.children.length) {
      this.rowGroup.remove(this.rowGroup.children[0]);
    }
    for (const mesh of this.carMeshes.values()) {
      this.root.remove(mesh);
    }
    this.carMeshes.clear();
    this.builtThrough = -1;
    this.flyFacingReady = false;
    this.root.position.set(0, 0, 0);
  }

  sync(world: LaneWorld) {
    this.lastWorld = world;

    // Keep pose sticky even if an old WorldView instance survived HMR.
    this.camera.position.set(CAM_POS.x, CAM_POS.y, CAM_POS.z);
    this.camera.lookAt(0, 0, 0);

    const zMax = world.playerZ + 18;
    for (let z = this.builtThrough + 1; z <= zMax; z++) {
      const row = world.getRow(z);
      if (!row) continue;
      const prev = world.getRow(z - 1);
      const isFirstRoadLane = row.kind === "road" && prev?.kind !== "road";
      this.rowGroup.add(this.buildRow(row.kind, z, row.trees, isFirstRoadLane));
      this.builtThrough = z;
    }

    const live = new Set<string>();
    for (const row of world.rows.values()) {
      if (row.kind !== "road") continue;
      if (row.z < world.playerZ - 2 || row.z > world.playerZ + 16) continue;
      row.cars.forEach((car, i) => {
        const key = `${row.z}:${i}`;
        live.add(key);
        let mesh = this.carMeshes.get(key);
        if (!mesh) {
          mesh = this.makeCar(row.z, i, car.speed);
          this.root.add(mesh);
          this.carMeshes.set(key, mesh);
        }
        mesh.position.x = car.x;
        mesh.position.y = 0.25;
        mesh.position.z = row.z;
        // Expo: rotation.y = (PI/2) * xDir
        mesh.rotation.y = car.speed >= 0 ? Math.PI / 2 : -Math.PI / 2;
        mesh.visible = true;
      });
    }
    for (const [key, mesh] of this.carMeshes) {
      if (!live.has(key)) mesh.visible = false;
    }

    this.playerMesh.position.set(world.playerX, GROUND_LEVEL, world.playerZ);
    this.playerMesh.visible = world.alive;

    if (this.kind === "fly") {
      const fly = this.playerMesh as FlyCharacter;
      if (this.flyFacingReady) {
        fly.setHopDirection(
          hopActionFromDelta(
            world.playerX - this.lastFlyX,
            world.playerZ - this.lastFlyZ
          )
        );
      }
      this.lastFlyX = world.playerX;
      this.lastFlyZ = world.playerZ;
      this.flyFacingReady = true;
      fly.tickWings();
    } else {
      (this.playerMesh as HumanCharacter).updateFacingFromPosition(
        world.playerX,
        world.playerZ
      );
    }

    // Expo GameEngine.forwardScene — ease the world so lookAt stays on the path.
    // LOOK_AHEAD_BIAS puts the frame center a few rows *ahead* of the hero so
    // you can see roads/trees coming (player sits in the lower third).
    const followZ = world.playerZ + LOOK_AHEAD_BIAS;
    const targetZ = -followZ;
    this.root.position.z -= (followZ + this.root.position.z) * CAMERA_EASING;
    // Keep a hard snap if we drifted (e.g. after reset) so first frame isn't empty.
    if (Math.abs(this.root.position.z - targetZ) > 8) {
      this.root.position.z = targetZ;
    }
    const targetCameraX = Math.max(-3, Math.min(2, -world.playerX));
    this.root.position.x +=
      (targetCameraX - this.root.position.x) * CAMERA_EASING;
  }

  private buildRow(
    kind: "grass" | "road",
    z: number,
    trees: number[],
    isFirstRoadLane: boolean
  ): THREE.Group {
    const g = new THREE.Group();
    const kit = this.kit ?? getCrossyKit();

    if (kit) {
      let strip: THREE.Object3D;
      if (kind === "grass") {
        // Alternate light/dark like classic Crossy (Expo registers both).
        strip = cloneTemplate(z % 2 === 0 ? kit.grassLight : kit.grassDark);
      } else {
        // Expo Road.isFirstLane: blank for first lane of a stretch, else stripes.
        strip = cloneTemplate(
          isFirstRoadLane ? kit.roadBlank : kit.roadStripes
        );
      }
      // Row Object3D sits at z; strip mesh is local (0,0,0) like Expo.
      g.position.z = z;
      g.add(strip);

      if (kind === "grass") {
        // Playable trees from LaneWorld.
        for (const x of trees) {
          g.add(this.makeTree(kit, z, x));
        }
        // Expo HAS_WALLS: dense tree edges outside ±4 so the strip feels boxed-in.
        for (const x of [-7, -6, -5, 5, 6, 7]) {
          g.add(this.makeTree(kit, z, x));
        }
      }
      return g;
    }

    return buildFallbackRow(kind, z, trees);
  }

  private makeTree(kit: CrossyKit, z: number, x: number): THREE.Object3D {
    const tree = cloneTemplate(
      kit.trees[pickIndex(z * 31 + x * 17, kit.trees.length)]
    );
    tree.position.set(x, GROUND_LEVEL, 0);
    return tree;
  }

  private makeCar(rowZ: number, i: number, speed: number): THREE.Object3D {
    const kit = this.kit ?? getCrossyKit();
    if (kit && kit.cars.length) {
      const car = cloneTemplate(
        kit.cars[pickIndex(rowZ * 97 + i * 13, kit.cars.length)]
      );
      car.rotation.y = speed >= 0 ? Math.PI / 2 : -Math.PI / 2;
      return car;
    }
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.55, 0.8),
      new THREE.MeshLambertMaterial({ color: 0xf45b69 })
    );
    mesh.castShadow = true;
    return mesh;
  }
}

function buildFallbackRow(
  kind: "grass" | "road",
  z: number,
  trees: number[]
): THREE.Group {
  const g = new THREE.Group();
  g.position.z = z;
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(25, 0.35, 0.95),
    new THREE.MeshLambertMaterial({
      color: kind === "grass" ? 0x5bb86a : 0x3a3f4b,
    })
  );
  base.position.set(0, 0.1, 0);
  base.receiveShadow = true;
  g.add(base);
  for (const x of trees) {
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.7, 0.7),
      new THREE.MeshLambertMaterial({ color: 0x49a35c })
    );
    top.position.set(x, 0.85, 0);
    top.castShadow = true;
    g.add(top);
  }
  return g;
}

// Re-export so App / SplitScreen can await the same kit.
export { preloadCrossyAssets };
