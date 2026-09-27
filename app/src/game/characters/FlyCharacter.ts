/**
 * Fly character — MagicaVoxel / Blockbench GLB (`public/models/fly/pixel-fly.glb`).
 *
 * Facing: nose toward +Z (road ahead). Camera sits behind on −Z.
 *
 * LaneWorld hop actions:
 *   0 stay | 1 forward (+Z) | 2 left (+X) | 3 right (−X)
 */

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export type HopAction = 0 | 1 | 2 | 3;

const YAW_BY_ACTION: Record<HopAction, number | null> = {
  0: null,
  1: 0,
  2: Math.PI / 2,
  3: -Math.PI / 2,
};

/** Target height in world units so the fly reads next to the chicken. */
const TARGET_HEIGHT = 0.95;

const GLB_URL = "/models/fly/pixel-fly.glb";

/** Flap amplitude (radians) around local X — visible from the chase cam. */
const WING_FLAP_AMP = 0.55;
/** Flap frequency in Hz-ish (multiplied into sin wave). */
const WING_FLAP_HZ = 28;

export type FlyCharacter = THREE.Group & {
  setHopDirection: (action: HopAction) => void;
  tickWings: (timeSec?: number) => void;
};

let templatePromise: Promise<THREE.Object3D> | null = null;

function loadFlyTemplate(): Promise<THREE.Object3D> {
  if (templatePromise) return templatePromise;
  templatePromise = new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      GLB_URL,
      (gltf) => {
        const scene = gltf.scene;
        // Center on XZ, feet on y=0, then scale to TARGET_HEIGHT.
        const box = new THREE.Box3().setFromObject(scene);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);
        scene.position.x -= center.x;
        scene.position.z -= center.z;
        scene.position.y -= box.min.y;
        const h = Math.max(size.y, 0.01);
        const s = TARGET_HEIGHT / h;
        scene.scale.setScalar(s);
        scene.traverse((obj) => {
          const mesh = obj as THREE.Mesh;
          if (mesh.isMesh) {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
          }
        });
        console.log("[fly] pixel-fly.glb ready", {
          size: size.toArray().map((n) => +n.toFixed(3)),
          scale: +s.toFixed(3),
        });
        resolve(scene);
      },
      undefined,
      (err) => {
        templatePromise = null;
        reject(err);
      }
    );
  });
  return templatePromise;
}

/** Kick off download early (WorldView / App can call this). */
export function preloadFlyModel(): Promise<THREE.Object3D> {
  return loadFlyTemplate();
}

/**
 * Find named wing hinges in the GLB (`wing_L` / `wing_R`).
 * Falls back to empty so tickWings still bobs safely.
 */
function findWingNodes(model: THREE.Object3D): {
  left: THREE.Object3D | null;
  right: THREE.Object3D | null;
} {
  let left: THREE.Object3D | null = null;
  let right: THREE.Object3D | null = null;
  model.traverse((obj) => {
    const n = obj.name;
    if (n === "wing_L" || n === "wing_L_mesh") left = left ?? obj;
    if (n === "wing_R" || n === "wing_R_mesh") right = right ?? obj;
  });
  return { left, right };
}

/**
 * Factory: returns a Group immediately; GLB mesh attaches when loaded.
 * Until then a tiny dark placeholder keeps the lane occupied.
 */
export function createFlyCharacter(): FlyCharacter {
  const root = new THREE.Group() as FlyCharacter;
  const pivot = new THREE.Group();
  root.add(pivot);

  // Temporary stand-in so the pane isn't empty while the GLB downloads.
  const placeholder = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.35, 0.5),
    new THREE.MeshLambertMaterial({ color: 0x2a221c })
  );
  placeholder.position.y = 0.2;
  placeholder.name = "fly-placeholder";
  pivot.add(placeholder);

  root.rotation.y = 0;
  root.userData.hopAction = 1 as HopAction;
  root.userData.baseY = 0;
  root.userData.wingL = null as THREE.Object3D | null;
  root.userData.wingR = null as THREE.Object3D | null;
  root.userData.wingL0 = 0;
  root.userData.wingR0 = 0;

  root.setHopDirection = (action: HopAction) => {
    root.userData.hopAction = action;
    const yaw = YAW_BY_ACTION[action];
    if (yaw !== null) root.rotation.y = yaw;
  };

  root.tickWings = (timeSec = performance.now() * 0.001) => {
    // Soft hover bob + real wing flap from GLB hinges every frame.
    const bob = Math.sin(timeSec * 10) * 0.03;
    pivot.position.y = (root.userData.baseY as number) + bob;

    const flap = Math.sin(timeSec * WING_FLAP_HZ) * WING_FLAP_AMP;
    const wingL = root.userData.wingL as THREE.Object3D | null;
    const wingR = root.userData.wingR as THREE.Object3D | null;
    if (wingL) {
      // Mirror flaps: left +X rest, right −X (or shared) so both beat together.
      wingL.rotation.x = (root.userData.wingL0 as number) + flap;
    }
    if (wingR) {
      wingR.rotation.x = (root.userData.wingR0 as number) + flap;
    }
  };

  void loadFlyTemplate()
    .then((tmpl) => {
      const model = tmpl.clone(true);
      pivot.clear();
      pivot.add(model);
      // Some pixel models face −Z or +X; nudge if the silhouette looks sideways.
      // Default: assume artist forward = +Z (Crossy convention).
      model.rotation.y = 0;

      const { left, right } = findWingNodes(model);
      root.userData.wingL = left;
      root.userData.wingR = right;
      root.userData.wingL0 = left?.rotation.x ?? 0;
      root.userData.wingR0 = right?.rotation.x ?? 0;
      if (!left || !right) {
        console.warn("[fly] wing_L/wing_R not found — bob only", {
          left: !!left,
          right: !!right,
        });
      }
    })
    .catch((e) => console.error("[fly] failed to load pixel-fly.glb", e));

  return root;
}

export function hopActionFromDelta(dx: number, dz: number): HopAction {
  if (Math.abs(dx) < 1e-6 && Math.abs(dz) < 1e-6) return 0;
  if (Math.abs(dz) >= Math.abs(dx)) return 1;
  return dx > 0 ? 2 : 3;
}
