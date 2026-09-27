/**
 * Fly character — MagicaVoxel / Blockbench GLB (`public/models/fly/pixel-fly.glb`).
 *
 * The GLB ships a looping `buzz` clip that flaps wing_L + wing_R together.
 * We play that via AnimationMixer (not hand-rolled opposite-sign rotations).
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

/** Target height in world units so the fly reads next to the walker. */
const TARGET_HEIGHT = 0.95;

const GLB_URL = "/models/fly/pixel-fly.glb";

export type FlyCharacter = THREE.Group & {
  setHopDirection: (action: HopAction) => void;
  tickWings: (timeSec?: number) => void;
};

type FlyTemplate = {
  scene: THREE.Object3D;
  animations: THREE.AnimationClip[];
};

let templatePromise: Promise<FlyTemplate> | null = null;

function loadFlyTemplate(): Promise<FlyTemplate> {
  if (templatePromise) return templatePromise;
  templatePromise = new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      GLB_URL,
      (gltf) => {
        const scene = gltf.scene;
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
        resolve({ scene, animations: gltf.animations ?? [] });
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

export function preloadFlyModel(): Promise<THREE.Object3D> {
  return loadFlyTemplate().then((t) => t.scene);
}

/** Prefer hinge parents (wing_L / wing_R), not their child meshes. */
function findWingHinges(root: THREE.Object3D): THREE.Object3D[] {
  const hinges: THREE.Object3D[] = [];
  root.traverse((obj) => {
    const n = (obj.name || "").toLowerCase();
    if (n === "wing_l" || n === "wing_r") hinges.push(obj);
  });
  return hinges;
}

function makeStubWings(parent: THREE.Object3D): THREE.Object3D[] {
  const mat = new THREE.MeshLambertMaterial({
    color: 0xc4b59a,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
  });
  const geo = new THREE.BoxGeometry(0.42, 0.04, 0.22);
  const left = new THREE.Mesh(geo, mat);
  const right = new THREE.Mesh(geo, mat.clone());
  left.name = "wing_L";
  right.name = "wing_R";
  left.position.set(-0.22, 0.55, 0.02);
  right.position.set(0.22, 0.55, 0.02);
  parent.add(left, right);
  return [left, right];
}

/**
 * Factory: returns a Group immediately; GLB mesh + buzz animation attach when loaded.
 */
export function createFlyCharacter(): FlyCharacter {
  const root = new THREE.Group() as FlyCharacter;
  const pivot = new THREE.Group();
  root.add(pivot);

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
  root.userData.mixer = null as THREE.AnimationMixer | null;
  root.userData.wings = [] as THREE.Object3D[];
  root.userData.wingBaseRot = [] as number[];
  root.userData.lastTick = performance.now() * 0.001;

  root.setHopDirection = (action: HopAction) => {
    root.userData.hopAction = action;
    const yaw = YAW_BY_ACTION[action];
    if (yaw !== null) root.rotation.y = yaw;
  };

  root.tickWings = (timeSec = performance.now() * 0.001) => {
    const bob = Math.sin(timeSec * 10) * 0.03;
    pivot.position.y = (root.userData.baseY as number) + bob;

    const mixer = root.userData.mixer as THREE.AnimationMixer | null;
    if (mixer) {
      const prev = root.userData.lastTick as number;
      const dt = Math.min(0.05, Math.max(0, timeSec - prev));
      root.userData.lastTick = timeSec;
      mixer.update(dt);
      return;
    }

    // Fallback if GLB has no buzz clip: flap both hinges with the same phase
    // (mirrored on Z so they rise/fall together like real flight).
    const wings = root.userData.wings as THREE.Object3D[];
    const bases = root.userData.wingBaseRot as number[];
    const flap = Math.sin(timeSec * 28) * 0.55;
    for (let i = 0; i < wings.length; i++) {
      const w = wings[i];
      const base = bases[i] ?? 0;
      const n = (w.name || "").toLowerCase();
      const sign = n.includes("_r") || n.endsWith("r") ? -1 : 1;
      w.rotation.z = base + sign * flap;
    }
  };

  void loadFlyTemplate()
    .then(({ scene: tmpl, animations }) => {
      const model = tmpl.clone(true);
      pivot.clear();
      pivot.add(model);
      model.rotation.y = 0;

      const buzz =
        animations.find((c) => c.name.toLowerCase() === "buzz") ?? animations[0];

      if (buzz) {
        const mixer = new THREE.AnimationMixer(model);
        const action = mixer.clipAction(buzz);
        action.setLoop(THREE.LoopRepeat, Infinity);
        action.clampWhenFinished = false;
        action.play();
        root.userData.mixer = mixer;
        root.userData.lastTick = performance.now() * 0.001;
      } else {
        let wings = findWingHinges(model);
        if (wings.length === 0) wings = makeStubWings(model);
        root.userData.wings = wings;
        root.userData.wingBaseRot = wings.map((w) => w.rotation.z);
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
