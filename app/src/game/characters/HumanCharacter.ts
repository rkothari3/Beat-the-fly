/**
 * YOU-side player = pixel-walker GLB (`public/models/pixel-walker.glb`).
 * Plays the built-in looping `walk` clip via AnimationMixer.
 * Same hop-facing API as before so WorldView stays unchanged.
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

/** Match fly / old chicken scale — ~1 world unit tall. */
const TARGET_HEIGHT = 0.95;

const GLB_URL = "/models/pixel-walker.glb";

export type HumanCharacter = THREE.Group & {
  setHopDirection: (action: HopAction) => void;
  updateFacingFromPosition: (x: number, z: number) => void;
  /** Advance the walk AnimationMixer (call each frame / sync). */
  tickWalk: (timeSec?: number) => void;
};

type WalkerTemplate = {
  scene: THREE.Object3D;
  animations: THREE.AnimationClip[];
};

let templatePromise: Promise<WalkerTemplate> | null = null;

function loadWalkerTemplate(): Promise<WalkerTemplate> {
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

export function preloadHumanModel(): Promise<THREE.Object3D> {
  return loadWalkerTemplate().then((t) => t.scene);
}

function buildFallbackWalker(): THREE.Group {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x3d5a80 });
  const headMat = new THREE.MeshLambertMaterial({ color: 0xf2d5b0 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, 0.25), bodyMat);
  body.position.y = 0.45;
  body.castShadow = true;
  g.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.28), headMat);
  head.position.y = 0.82;
  head.castShadow = true;
  g.add(head);
  return g;
}

/**
 * Factory: Group immediately; GLB + walk animation attach when loaded.
 */
export function createHumanCharacter(): HumanCharacter {
  const root = new THREE.Group() as HumanCharacter;
  const pivot = new THREE.Group();
  root.add(pivot);
  pivot.add(buildFallbackWalker());

  root.rotation.y = 0;
  root.userData.hopAction = 1 as HopAction;
  root.userData.lastX = null as number | null;
  root.userData.lastZ = null as number | null;
  root.userData.mixer = null as THREE.AnimationMixer | null;
  root.userData.lastTick = performance.now() * 0.001;

  root.setHopDirection = (action: HopAction) => {
    root.userData.hopAction = action;
    const yaw = YAW_BY_ACTION[action];
    if (yaw !== null) root.rotation.y = yaw;
  };

  root.updateFacingFromPosition = (x: number, z: number) => {
    const lx = root.userData.lastX as number | null;
    const lz = root.userData.lastZ as number | null;
    root.userData.lastX = x;
    root.userData.lastZ = z;
    if (lx === null || lz === null) return;
    const dx = x - lx;
    const dz = z - lz;
    if (Math.abs(dx) < 1e-6 && Math.abs(dz) < 1e-6) return;
    if (Math.abs(dz) >= Math.abs(dx)) {
      root.setHopDirection(dz > 0 ? 1 : 0);
      if (dz < 0) root.rotation.y = Math.PI;
    } else {
      root.setHopDirection(dx > 0 ? 2 : 3);
    }
  };

  root.tickWalk = (timeSec = performance.now() * 0.001) => {
    const mixer = root.userData.mixer as THREE.AnimationMixer | null;
    if (!mixer) return;
    const prev = root.userData.lastTick as number;
    const dt = Math.min(0.05, Math.max(0, timeSec - prev));
    root.userData.lastTick = timeSec;
    mixer.update(dt);
  };

  void loadWalkerTemplate()
    .then(({ scene: tmpl, animations }) => {
      const model = tmpl.clone(true);
      while (pivot.children.length) pivot.remove(pivot.children[0]);
      pivot.add(model);
      // Nose toward +Z (road ahead), same as the fly.
      model.rotation.y = 0;

      const walk =
        animations.find((c) => c.name.toLowerCase() === "walk") ?? animations[0];
      if (walk) {
        const mixer = new THREE.AnimationMixer(model);
        const action = mixer.clipAction(walk);
        action.setLoop(THREE.LoopRepeat, Infinity);
        action.clampWhenFinished = false;
        action.play();
        root.userData.mixer = mixer;
        root.userData.lastTick = performance.now() * 0.001;
      }
    })
    .catch((e) => console.error("[human] failed to load pixel-walker.glb", e));

  return root;
}
