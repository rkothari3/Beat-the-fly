/**
 * Build a Minecraft-Steve-style pixel human as a GLB.
 *
 * Why generate instead of downloading from Sketchfab?
 *   The Raph3D Steve on Sketchfab is CC BY and free, but their download API
 *   needs a logged-in session. This script builds an original boxy Steve with
 *   classic proportions (~1 world-unit tall) so the game still ships a GLB
 *   under /models without auth. Face sits on +Z so Crossy camera (behind on
 *   −Z) sees the back of the head, not the eyes.
 *
 * Run: node scripts/genSteveGlb.mjs
 */

import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// GLTFExporter expects browser FileReader; Node doesn't have it.
if (typeof globalThis.FileReader === "undefined") {
  globalThis.FileReader = class FileReader {
    result = null;
    onloadend = null;
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then((buf) => {
        this.result = buf;
        this.onloadend?.({ target: this });
      });
    }
  };
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "../public/models/HumanCharacter.glb");

/** One Minecraft pixel → world units. Height = 32px → ~1.0. */
const U = 1 / 32;

function mat(hex) {
  return new THREE.MeshStandardMaterial({
    color: hex,
    roughness: 0.85,
    metalness: 0,
  });
}

function box(w, h, d, material, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w * U, h * U, d * U), material);
  // y = bottom of part in pixel space; center the box.
  mesh.position.set(x * U, (y + h / 2) * U, z * U);
  return mesh;
}

const skin = mat(0xc68642);
const hair = mat(0x3b2817);
const shirt = mat(0x00aaaa);
const pants = mat(0x3d44a5);
const shoe = mat(0x4a3728);
const eyeWhite = mat(0xf5f5f5);
const eyePupil = mat(0x1a1a1a);

const root = new THREE.Group();
root.name = "StevePixel";

// Legs (y 0–12), body (12–24), head (24–32). Face toward +Z.
root.add(box(4, 12, 4, pants, -2, 0, 0));
root.add(box(4, 12, 4, pants, 2, 0, 0));
root.add(box(4, 2, 4, shoe, -2, 0, 0.5));
root.add(box(4, 2, 4, shoe, 2, 0, 0.5));
root.add(box(8, 12, 4, shirt, 0, 12, 0));
root.add(box(4, 12, 4, shirt, -6, 12, 0));
root.add(box(4, 12, 4, shirt, 6, 12, 0));
root.add(box(8, 8, 8, skin, 0, 24, 0));

// Hair cap + back of head (−Z) so camera behind sees hair, not face.
root.add(box(8.2, 2, 8.2, hair, 0, 30, 0));
root.add(box(8.2, 6, 1.5, hair, 0, 24, -3.5));

// Eyes on the +Z face only — invisible when character faces up-road.
root.add(box(1.5, 1.5, 0.6, eyeWhite, -2, 28, 4.1));
root.add(box(1.5, 1.5, 0.6, eyeWhite, 2, 28, 4.1));
root.add(box(0.8, 1.2, 0.5, eyePupil, -1.7, 27.9, 4.35));
root.add(box(0.8, 1.2, 0.5, eyePupil, 2.3, 27.9, 4.35));

const exporter = new GLTFExporter();
exporter.parse(
  root,
  (result) => {
    const buf = Buffer.from(result);
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, buf);
    console.log(`Wrote ${OUT} (${buf.length} bytes)`);
  },
  (err) => {
    console.error(err);
    process.exit(1);
  },
  { binary: true }
);
