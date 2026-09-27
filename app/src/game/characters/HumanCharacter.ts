/**
 * YOU-side player = MagicaVoxel chicken from Expo-Crossy-Road (MIT).
 * Same hop-facing API as the old Steve mesh so WorldView stays unchanged.
 */

import * as THREE from "three";
import { cloneTemplate, getCrossyKit, preloadCrossyAssets } from "../CrossyAssets";

export type HopAction = 0 | 1 | 2 | 3;

const YAW_BY_ACTION: Record<HopAction, number | null> = {
  0: null,
  1: 0,
  2: Math.PI / 2,
  3: -Math.PI / 2,
};

/** Classic Crossy chicken is ~1 world unit tall. */
const TARGET_HEIGHT = 0.95;

export type HumanCharacter = THREE.Group & {
  setHopDirection: (action: HopAction) => void;
  updateFacingFromPosition: (x: number, z: number) => void;
};

export function createHumanCharacter(): HumanCharacter {
  const root = new THREE.Group() as HumanCharacter;
  const pivot = new THREE.Group();
  root.add(pivot);
  pivot.add(buildFallbackChicken());

  void preloadCrossyAssets()
    .then((kit) => {
      if (!kit.chicken) return;
      const model = cloneTemplate(kit.chicken);
      fitModelToLane(model);
      while (pivot.children.length) pivot.remove(pivot.children[0]);
      pivot.add(model);
      root.userData.usingVoxel = true;
    })
    .catch(() => {
      root.userData.usingVoxel = false;
    });

  // If kit already loaded (common after first round), swap immediately.
  const ready = getCrossyKit();
  if (ready?.chicken) {
    const model = cloneTemplate(ready.chicken);
    fitModelToLane(model);
    while (pivot.children.length) pivot.remove(pivot.children[0]);
    pivot.add(model);
    root.userData.usingVoxel = true;
  }

  root.rotation.y = 0;
  root.userData.hopAction = 1 as HopAction;
  root.userData.lastX = null as number | null;
  root.userData.lastZ = null as number | null;
  root.userData.usingVoxel = false;

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

  return root;
}

function fitModelToLane(model: THREE.Object3D) {
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  box.getSize(size);
  const h = Math.max(size.y, 1e-3);
  const s = TARGET_HEIGHT / h;
  model.scale.setScalar(s);
  const box2 = new THREE.Box3().setFromObject(model);
  model.position.y -= box2.min.y;
}

/** Tiny voxel chicken if OBJ fails — still reads as Crossy, not Steve. */
function buildFallbackChicken(): THREE.Group {
  const g = new THREE.Group();
  const white = new THREE.MeshLambertMaterial({ color: 0xf5f0e6 });
  const comb = new THREE.MeshLambertMaterial({ color: 0xe23b3b });
  const beak = new THREE.MeshLambertMaterial({ color: 0xf5c542 });
  const leg = new THREE.MeshLambertMaterial({ color: 0xe8a020 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.4, 0.5), white);
  body.position.y = 0.35;
  body.castShadow = true;
  g.add(body);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.32), white);
  head.position.set(0, 0.62, 0.18);
  head.castShadow = true;
  g.add(head);

  const crest = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.2), comb);
  crest.position.set(0, 0.82, 0.18);
  g.add(crest);

  const beakM = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.16), beak);
  beakM.position.set(0, 0.58, 0.38);
  g.add(beakM);

  for (const sx of [-0.12, 0.12]) {
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.1), leg);
    foot.position.set(sx, 0.09, 0);
    foot.castShadow = true;
    g.add(foot);
  }
  return g;
}
