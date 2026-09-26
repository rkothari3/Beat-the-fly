/**
 * Curated Neuroglancer deep-links into the MaleCNS v1.0 EM dataset.
 *
 * Why this file exists (beginner note):
 *   Our sidebar brain is a LIVE display — particles brighten with the LIF
 *   spikes that drive the game. Neuroglancer is the opposite: a heavyweight
 *   browser for the real electron-microscopy volume. It can never show our
 *   live activity, and embedding it in an iframe would fight our three.js
 *   canvas for GPU and look cramped. So instead of embedding, we LINK OUT —
 *   but to a curated view, not the raw dataset landing page.
 *
 * What "curated" means here:
 *   Each playable region (CX / MB / AL) gets a URL that opens Neuroglancer
 *   with (1) the faint whole-brain shell for context and (2) ONLY that
 *   region's neuropil meshes, colored to match our in-panel legend, with the
 *   3D camera already parked on the region. Judges click once and see "their"
 *   brain region in the real EM dataset.
 *
 * How the pieces were derived (so you can trust/extend them):
 *   - Layer sources + names come from the official demo state:
 *     https://storage.googleapis.com/flyem-male-cns/v1.0/male-cns-v1.0.json
 *   - Segment ids come from segment_properties `ids[]` paired with labels
 *     (NOT the 1-based index into the label list — that mismatch made CX
 *     stills show LOP optic lobes). Real: EB=21, FB=24, NO=49, PB=50.
 *   - Camera positions are the inverse of our atlas display transform
 *     (maleCnsAtlas.ts: display = (x, -z, y), centered, scale 5/91200)
 *     applied to the CX/MB/AL carving centers in MaleCnsBrainViz.tsx,
 *     in native 8 nm voxels. Bilateral regions are centered on the midline.
 */

import { RegionKey } from "../brain/LifEngine";

const NG_BASE = "https://neuroglancer-demo.appspot.com/#!";

/** Official full-dataset demo state (everything, default camera). */
export const NEUROGLANCER_FULL_URL =
  "https://neuroglancer-demo.appspot.com/#!gs://flyem-male-cns/v1.0/male-cns-v1.0.json";

interface RegionView {
  /** Human name baked into the Neuroglancer tab title. */
  title: string;
  /** Camera target in native 8 nm voxels (midline-centered for pairs). */
  position: [number, number, number];
  /**
   * 3D zoom — smaller = closer. Whole-CNS default is ~134522; ~55000 frames
   * the whole brain shell with the region glowing inside (verified in
   * browser — closer crops the shell and hides the highlight).
   */
  projectionScale: number;
  /** Segment ids inside the fullbrain-roi-v5 neuropil layer. */
  segments: string[];
  /** Mesh color — matches the in-panel legend dot for this region. */
  color: string;
}

const REGION_VIEW: Record<RegionKey, RegionView> = {
  central_complex: {
    title: "central complex (CX)",
    // Midline CX neuropils (display core → native). IDs from segment_properties
    // ids[] (NOT label list index — that wrongly lit LOP optic lobes as "CX").
    position: [48100, 18000, 28000],
    projectionScale: 65000,
    segments: ["21", "24", "49", "50"], // EB, FB, NO, PB
    color: "#73ebff",
  },
  mushroom_body: {
    title: "mushroom body (MB)",
    position: [48068, 16000, 30000],
    projectionScale: 65000,
    // CA / PED / a' a b' b g lobes — real ids from segment_properties.
    segments: [
      "15", "16", "51", "52",
      "77", "78", "79", "80", "81", "82", "83", "84", "85", "86",
    ],
    color: "#ff6bf2",
  },
  antennal_lobe: {
    title: "antennal lobe (AL)",
    position: [48068, 29963, 15155],
    projectionScale: 65000,
    segments: ["1", "2"], // AL(L), AL(R) — ids match label index here
    color: "#8cff59",
  },
};

/**
 * Build the Neuroglancer state JSON for one region and URL-encode it.
 * Layers mirror the official demo's rendering choices (silhouette shell,
 * slices off, 3D layout) so the view loads fast and looks deliberate.
 */
export function neuroglancerRegionUrl(region: RegionKey): string {
  const view = REGION_VIEW[region];
  const state = {
    title: `MaleCNS v1.0 — ${view.title} · Beat the Fly`,
    dimensions: {
      x: [8e-9, "m"],
      y: [8e-9, "m"],
      z: [8e-9, "m"],
    },
    position: view.position,
    crossSectionScale: 30,
    projectionScale: view.projectionScale,
    layers: [
      {
        // Real EM volume — present so users can enable slices, but it does
        // not render in the slice-free 3D view (same as the official demo).
        type: "image",
        source: "precomputed://gs://flyem-male-cns/em/em-clahe-jpeg",
        name: "em-clahe",
      },
      {
        // Faint white whole-brain outline for orientation.
        type: "segmentation",
        source: "precomputed://gs://flyem-male-cns/rois/fullbrain-major-shells",
        pick: false,
        selectedAlpha: 0,
        saturation: 0,
        meshSilhouetteRendering: 7,
        segments: ["1", "2", "3"],
        segmentDefaultColor: "#ffffff",
        name: "brain-shell",
      },
      {
        // The star: only this region's neuropils, in our legend color.
        type: "segmentation",
        source: "precomputed://gs://flyem-male-cns/rois/fullbrain-roi-v5",
        tab: "segments",
        pick: false,
        objectAlpha: 0.9,
        segments: view.segments,
        segmentDefaultColor: view.color,
        name: view.title,
      },
    ],
    showSlices: false,
    layout: "3d",
  };
  return NG_BASE + encodeURIComponent(JSON.stringify(state));
}
