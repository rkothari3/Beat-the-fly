/**
 * Emit curated Neuroglancer URLs for WHERE IT LIVES stills.
 * Front-facing camera, no yellow bounding box.
 * Segment IDs from segment_properties ids[] (NOT label-list index).
 */
import { writeFileSync } from "fs";

const NG_BASE = "https://neuroglancer-demo.appspot.com/#!";
const FRONT = [0, 0, 0, 1];

function url(title, position, projectionScale, segments, color) {
  const state = {
    title: `MaleCNS v1.0 — ${title} · Beat the Fly`,
    dimensions: { x: [8e-9, "m"], y: [8e-9, "m"], z: [8e-9, "m"] },
    position,
    crossSectionScale: 30,
    projectionOrientation: FRONT,
    projectionScale,
    layers: [
      {
        type: "image",
        source: "precomputed://gs://flyem-male-cns/em/em-clahe-jpeg",
        name: "em-clahe",
        visible: false,
      },
      {
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
        type: "segmentation",
        source: "precomputed://gs://flyem-male-cns/rois/fullbrain-roi-v5",
        tab: "segments",
        pick: false,
        objectAlpha: 0.92,
        segments,
        segmentDefaultColor: color,
        name: title,
      },
    ],
    showSlices: false,
    layout: "3d",
    showDefaultAnnotations: false,
    showAxisLines: false,
    showScaleBar: false,
  };
  return NG_BASE + encodeURIComponent(JSON.stringify(state));
}

const out = {
  cx: url(
    "central complex (CX)",
    [48100, 18000, 28000],
    65000,
    ["21", "24", "49", "50"], // EB, FB, NO, PB
    "#73ebff"
  ),
  mb: url(
    "mushroom body (MB)",
    [48068, 16000, 30000],
    65000,
    [
      "15",
      "16",
      "51",
      "52",
      "77",
      "78",
      "79",
      "80",
      "81",
      "82",
      "83",
      "84",
      "85",
      "86",
    ],
    "#ff6bf2"
  ),
  al: url(
    "antennal lobe (AL)",
    [48068, 29963, 15155],
    65000,
    ["1", "2"],
    "#8cff59"
  ),
};

writeFileSync(
  new URL("../public/images/where-it-lives/urls.json", import.meta.url),
  JSON.stringify(out, null, 2)
);
console.log("wrote urls.json with corrected segment ids");
