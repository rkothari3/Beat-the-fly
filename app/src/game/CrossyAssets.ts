/**
 * MagicaVoxel assets from EvanBacon/Expo-Crossy-Road (MIT).
 *
 * OBJ+PNG pairs with nearest-neighbor textures — same crispy voxel look as
 * the Expo game. Also measures vehicle hitbox widths from mesh bounds so
 * trucks collide like trucks (not skinny cars).
 */

import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { setVehicleHitWidths } from "../core/vehicleHitboxes";

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

/**
 * Expo Road.getWidth: length along model Z (before rotate onto the X drive axis).
 * Rounded so hitboxes stay discrete like the original game.
 */
export function measureVehicleWidth(obj: THREE.Object3D): number {
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3();
  box.getSize(size);
  // Prefer Z (Expo default); fall back to max horizontal if model is rotated oddly.
  const along = Math.max(size.z, size.x);
  return Math.max(0.8, Math.round(along * 10) / 10);
}

export type CrossyKit = {
  grassLight: THREE.Group;
  grassDark: THREE.Group;
  roadStripes: THREE.Group;
  roadBlank: THREE.Group;
  trees: THREE.Group[];
  cars: THREE.Group[];
  /** Hitbox length along drive axis — same index as `cars`. */
  carWidths: number[];
};

let kitPromise: Promise<CrossyKit> | null = null;
let kit: CrossyKit | null = null;

export const CAR_IDS = [
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
    const carWidths = cars.map(measureVehicleWidth);

    setVehicleHitWidths(carWidths);

    kit = {
      grassLight,
      grassDark,
      roadStripes,
      roadBlank,
      trees,
      cars,
      carWidths,
    };
    console.log("[crossy] MagicaVoxel kit ready", {
      trees: trees.length,
      cars: cars.length,
      carWidths,
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

/** Chicken / player half-width used in Expo: heroWidth/2 + vehicleWidth/2 - 0.1 */
export const HERO_HIT_WIDTH = 0.8;
