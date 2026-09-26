/**
 * Blockbench-style 3D pixel fruit fly (boxes only).
 *
 * Why rebuild instead of the Sketchfab model?
 *   myrtleblossom’s “3D Pixel Fly” is paid / not freely downloadable (Sketchfab
 *   Standard store license). We recreate the same vibe: chunky voxel body,
 *   big red compound eyes, flat translucent wing slabs — original geometry,
 *   no license risk.
 *
 * Facing: nose / eyes on +Z (road ahead). Camera sits behind on −Z, so you
 * see the abdomen / wing backs, not the eyes.
 *
 * LaneWorld hop actions (matches core/LaneWorld):
 *   0 stay | 1 forward (+Z) | 2 left (+X) | 3 right (−X)
 */

import * as THREE from "three";

export type HopAction = 0 | 1 | 2 | 3;

/** Yaw (radians) so the nose points along the hop. Default mesh faces +Z. */
const YAW_BY_ACTION: Record<HopAction, number | null> = {
  0: null, // stay — keep current facing
  1: 0, // forward → +Z
  2: Math.PI / 2, // left → +X
  3: -Math.PI / 2, // right → −X
};

/**
 * Overall scale vs local unit proportions.
 * Steve is ~1.0 tall; keep the fly smaller but readable at Crossy ortho distance.
 */
const FLY_SCALE = 1.35;

export type FlyCharacter = THREE.Group & {
  setHopDirection: (action: HopAction) => void;
  /** Cheap idle wing flutter; call once per frame/sync. */
  tickWings: (timeSec?: number) => void;
};

/**
 * Factory: low-poly pixel fly for the fly-side WorldView.
 */
export function createFlyCharacter(): FlyCharacter {
  const root = new THREE.Group() as FlyCharacter;
  // Pivot holds geometry so we can scale once without fighting hop yaw.
  const pivot = new THREE.Group();
  root.add(pivot);

  // ——— materials (shared within this fly) ———
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x2a221c });
  const stripeMat = new THREE.MeshLambertMaterial({ color: 0x4a3a2e });
  const thoraxMat = new THREE.MeshLambertMaterial({ color: 0x3a3028 });
  const headMat = new THREE.MeshLambertMaterial({ color: 0x1e1814 });
  const eyeMat = new THREE.MeshLambertMaterial({ color: 0xe82030 });
  const eyeHiMat = new THREE.MeshLambertMaterial({ color: 0xff6a55 });
  const wingMat = new THREE.MeshLambertMaterial({
    color: 0xd8eef8,
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const legMat = new THREE.MeshLambertMaterial({ color: 0x14110f });

  // Segmented abdomen — stacked boxes (Blockbench / Minecraft-entity vibe).
  // Stretched in −Z so the *head* stays at +Z (toward road).
  const abdomenA = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.28, 0.22), bodyMat);
  abdomenA.position.set(0, 0.28, -0.28);
  const abdomenB = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.26, 0.18), stripeMat);
  abdomenB.position.set(0, 0.28, -0.1);
  const abdomenC = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.24, 0.16), bodyMat);
  abdomenC.position.set(0, 0.27, 0.04);

  // Thorax — wing mount, slightly taller.
  const thorax = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.34, 0.32), thoraxMat);
  thorax.position.set(0, 0.34, 0.22);

  // Head cube in front (+Z).
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.3, 0.28), headMat);
  head.position.set(0, 0.36, 0.48);

  // Big red compound eyes — only on the +Z face (road-facing).
  // Camera behind (−Z) must not see these when yaw = 0.
  const eyeGeo = new THREE.BoxGeometry(0.16, 0.18, 0.14);
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.14, 0.38, 0.6);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeR.position.set(0.14, 0.38, 0.6);
  const hiGeo = new THREE.BoxGeometry(0.06, 0.06, 0.04);
  const hiL = new THREE.Mesh(hiGeo, eyeHiMat);
  hiL.position.set(-0.16, 0.44, 0.66);
  const hiR = new THREE.Mesh(hiGeo, eyeHiMat);
  hiR.position.set(0.12, 0.44, 0.66);

  // Flat pixel wing slabs (not thin Planes) — dihedral so they read from ortho.
  const wingGeo = new THREE.BoxGeometry(0.42, 0.04, 0.36);
  const wingL = new THREE.Mesh(wingGeo, wingMat);
  wingL.position.set(-0.28, 0.5, 0.14);
  wingL.rotation.order = "YXZ";
  wingL.rotation.y = 0.18;
  wingL.rotation.x = -0.55;
  wingL.rotation.z = 0.65;

  const wingR = new THREE.Mesh(wingGeo, wingMat);
  wingR.position.set(0.28, 0.5, 0.14);
  wingR.rotation.order = "YXZ";
  wingR.rotation.y = -0.18;
  wingR.rotation.x = -0.55;
  wingR.rotation.z = -0.65;

  // Stick legs — short boxes (cylinders vanish at distance).
  const legGeo = new THREE.BoxGeometry(0.05, 0.26, 0.05);
  const legOffsets: [number, number, number][] = [
    [-0.14, 0.1, 0.3],
    [-0.16, 0.1, 0.12],
    [-0.12, 0.1, -0.08],
    [0.14, 0.1, 0.3],
    [0.16, 0.1, 0.12],
    [0.12, 0.1, -0.08],
  ];
  for (const [lx, ly, lz] of legOffsets) {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(lx, ly, lz);
    leg.rotation.z = lx < 0 ? 0.45 : -0.45;
    leg.rotation.x = 0.2;
    pivot.add(leg);
  }

  pivot.add(
    abdomenA,
    abdomenB,
    abdomenC,
    thorax,
    head,
    eyeL,
    eyeR,
    hiL,
    hiR,
    wingL,
    wingR
  );
  pivot.scale.setScalar(FLY_SCALE);

  // Default nose toward +Z (forward lane / away from camera).
  root.rotation.y = 0;
  root.userData.hopAction = 1 as HopAction;
  root.userData.wingL = wingL;
  root.userData.wingR = wingR;
  root.userData.wingBaseZL = wingL.rotation.z;
  root.userData.wingBaseZR = wingR.rotation.z;
  root.userData.wingBaseXL = wingL.rotation.x;
  root.userData.wingBaseXR = wingR.rotation.x;

  root.setHopDirection = (action: HopAction) => {
    root.userData.hopAction = action;
    const yaw = YAW_BY_ACTION[action];
    if (yaw !== null) root.rotation.y = yaw;
  };

  root.tickWings = (timeSec = performance.now() * 0.001) => {
    // Tiny sine flutter — amplitude small so it never steals the eye from hops.
    const flap = Math.sin(timeSec * 18) * 0.14;
    wingL.rotation.z = (root.userData.wingBaseZL as number) + flap;
    wingR.rotation.z = (root.userData.wingBaseZR as number) - flap;
    wingL.rotation.x = (root.userData.wingBaseXL as number) - flap * 0.35;
    wingR.rotation.x = (root.userData.wingBaseXR as number) - flap * 0.35;
  };

  return root;
}

/**
 * Infer hop action from a world-space position delta (for WorldView sync).
 * Returns stay (0) when the player did not move.
 */
export function hopActionFromDelta(dx: number, dz: number): HopAction {
  if (Math.abs(dx) < 1e-6 && Math.abs(dz) < 1e-6) return 0;
  if (Math.abs(dz) >= Math.abs(dx)) return 1; // forward (+Z) dominates
  return dx > 0 ? 2 : 3; // left (+X) / right (−X)
}
