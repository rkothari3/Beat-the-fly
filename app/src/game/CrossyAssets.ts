/**
 * MagicaVoxel assets from EvanBacon/Expo-Crossy-Road (MIT).
 *
 * Why: the Vite port temporarily used colored boxes. That lost the real Crossy
 * Road look. These OBJ+PNG pairs ARE that look — nearest-neighbor textures so
 * voxels stay crispy, same as the Expo game.
 */

import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

const BASE = "/models/crossy";
const textureLoader = new THREE.TextureLoader();
const objLoader = new OBJLoader();

async function loadTexturedObj(
  objUrl: string,
  pngUrl: string
): Promise<THREE.Group> {
  const [tex, objText] = await Promise.all([
    textureLoader.loadAsync(pngUrl),
    fetch(objUrl).then((r) => {
      if (!r.ok) throw new Error(`${objUrl} -> ${r.status}`);
      return r.text();
    }),
  ]);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;

  const mat = new THREE.MeshLambertMaterial({ map: tex });
  const root = objLoader.parse(objText);
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.material = mat;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });
  return root;
}

export type CrossyKit = {
  grassLight: THREE.Group;
  grassDark: THREE.Group;
  roadStripes: THREE.Group;
  roadBlank: THREE.Group;
  trees: THREE.Group[];
  cars: THREE.Group[];
};

let kitPromise: Promise<CrossyKit> | null = null;
let kit: CrossyKit | null = null;

const CAR_IDS = [
  "police_car",
  "blue_car",
  "blue_truck",
  "green_car",
  "orange_car",
  "purple_car",
  "red_truck",
  "taxi",
] as const;

export function preloadCrossyAssets(): Promise<CrossyKit> {
  if (kit) return Promise.resolve(kit);
  if (kitPromise) return kitPromise;

  kitPromise = (async () => {
    const grassLight = await loadTexturedObj(
      `${BASE}/grass/model.obj`,
      `${BASE}/grass/light-grass.png`
    );
    const grassDark = await loadTexturedObj(
      `${BASE}/grass/model.obj`,
      `${BASE}/grass/dark-grass.png`
    );
    const roadStripes = await loadTexturedObj(
      `${BASE}/road/model.obj`,
      `${BASE}/road/stripes-texture.png`
    );
    const roadBlank = await loadTexturedObj(
      `${BASE}/road/model.obj`,
      `${BASE}/road/blank-texture.png`
    );
    const trees = await Promise.all(
      [0, 1, 2, 3].map((i) =>
        loadTexturedObj(`${BASE}/tree/${i}/0.obj`, `${BASE}/tree/${i}/0.png`)
      )
    );
    const cars = await Promise.all(
      CAR_IDS.map((id) =>
        loadTexturedObj(
          `${BASE}/vehicles/${id}/0.obj`,
          `${BASE}/vehicles/${id}/0.png`
        )
      )
    );

    kit = { grassLight, grassDark, roadStripes, roadBlank, trees, cars };
    console.log("[crossy] MagicaVoxel kit ready", {
      trees: trees.length,
      cars: cars.length,
    });
    return kit;
  })().catch((err) => {
    kitPromise = null;
    throw err;
  });

  return kitPromise;
}

export function getCrossyKit(): CrossyKit | null {
  return kit;
}

export function cloneTemplate(src: THREE.Object3D): THREE.Object3D {
  return src.clone(true);
}

/** Deterministic pick so human + fly panes spawn the same car/tree variants. */
export function pickIndex(seed: number, len: number): number {
  if (len <= 0) return 0;
  let x = seed | 0;
  x = (x ^ (x >>> 16)) * 0x45d9f3b;
  x = (x ^ (x >>> 16)) * 0x45d9f3b;
  x = x ^ (x >>> 16);
  return Math.abs(x) % len;
}
