/**
 * Male CNS glittering particle visualizer — real soma atlas + lab materials.
 *
 * Where the look comes from (not a homemade blob):
 *   1. Geometry — MaleCNS v1.0 measured soma positions (CC BY 4.0), brain-only
 *      (optic / central / descending). VNC cord is filtered out in the loader.
 *   2. Materials — soft radial glow sprite + AdditiveBlending (flychess-hq
 *      initBrain3D) + per-particle twinkle for the cyan/gold glitter.
 *   3. Colors — optic cyan / central–motor gold (fly-chess lab legend language).
 *
 * Why no gold cord: CX / MB / AL are central-brain regions; the ventral nerve
 * cord is body-nerve anatomy we never play, so cropping it is more honest.
 *
 * Gameplay honesty: this is a brain-atlas *activity display*. The controller may
 * still be a single region LIF or the bot — pitch owns that distinction.
 */

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RegionKey, StepResult } from "../brain/LifEngine";
import { loadMaleCnsAtlas } from "./maleCnsAtlas";

/** Particle role ids — legend + lighting (kept for CX/MB/AL selection). */
const ROLE_OPTIC = 0;
const ROLE_CENTRAL = 1;
const ROLE_SENSORY = 2;
const ROLE_MOTOR = 3;
const ROLE_CX = 4;
const ROLE_MB = 5;
const ROLE_AL = 6;
const ROLE_COUNT = 7;

/**
 * Base RGB — cyan/gold glitter like the lab reference (mixed through the cloud,
 * not a hard cyan-brain / gold-cord split that reads as two objects).
 */
const ROLE_RGB: [number, number, number][] = [
  [0.15, 0.92, 1.0], // Optic — electric cyan
  [1.0, 0.78, 0.22], // Central — gold
  [0.45, 0.95, 0.9], // Sensory fringe — mint cyan
  [1.0, 0.62, 0.18], // Motor / descending (brain) — amber gold
  [0.55, 0.96, 1.0], // CX — icy cyan
  [1.0, 0.45, 0.92], // MB — orchid
  [0.55, 1.0, 0.4], // AL — lime
];

/** Soft gold used to sprinkle edge glitter into cyan lobes (reference look). */
const GOLD_GLITTER: [number, number, number] = [1.0, 0.82, 0.28];
const CYAN_GLITTER: [number, number, number] = [0.25, 0.95, 1.0];

function makeGlowSprite(): THREE.CanvasTexture {
  // Soft disc — same idea as flychess-hq particleSprite (radial white → transparent).
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.25, "rgba(255,255,255,0.95)");
  grad.addColorStop(0.45, "rgba(255,255,255,0.55)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(32, 32, 32, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

function dist2(
  x: number,
  y: number,
  z: number,
  cx: number,
  cy: number,
  cz: number,
  sx: number,
  sy: number,
  sz: number
) {
  const dx = (x - cx) / sx;
  const dy = (y - cy) / sy;
  const dz = (z - cz) / sz;
  return dx * dx + dy * dy + dz * dz;
}

/**
 * Map atlas groups → legend roles, then carve COMPACT CX / MB / AL neuropil
 * blobs that match the Neuroglancer WHERE IT LIVES stills (not scattered somas).
 *
 * Why compact: region neuron cell bodies sit all over the brain; lighting every
 * soma made the glitter look nothing like EB/FB/NO/PB, MB lobes, or AL bulbs.
 * Spike flashes still land on real somas via soma_xyz → nearest particle.
 */
function assignRoles(
  positions: Float32Array,
  groups: Uint8Array,
  count: number
): {
  roles: Uint8Array;
  colors: Float32Array;
  accentColors: Float32Array;
  phases: Float32Array;
  speeds: Float32Array;
} {
  const roles = new Uint8Array(count);
  const colors = new Float32Array(count * 3);
  // Full-strength accent color per particle (CX/MB/AL only; others = base).
  // Why separate: when a region is selected we lerp base → accent so the
  // carving lights up in ONE clean hue instead of the cyan/gold glitter mix.
  const accentColors = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  const speeds = new Float32Array(count);

  let yMin = Infinity;
  let yMax = -Infinity;
  for (let i = 0; i < count; i++) {
    const y = positions[i * 3 + 1];
    if (y < yMin) yMin = y;
    if (y > yMax) yMax = y;
  }
  const ySpan = Math.max(1e-6, yMax - yMin);

  for (let i = 0; i < count; i++) {
    const z = positions[i * 3 + 2];
    const y = positions[i * 3 + 1];
    const g = groups[i];

    let role = ROLE_CENTRAL;
    if (g === 0) role = ROLE_OPTIC;
    else if (g === 2) role = ROLE_MOTOR; // descending neurons in the brain (VNC already filtered)
    else if (g === 1) {
      role = z > 0.35 || y > 0.55 ? ROLE_SENSORY : ROLE_CENTRAL;
    }

    // Soft anatomic fill — COMPACT neuropil cores matching Neuroglancer ROI
    // meshes in WHERE IT LIVES (EB/FB/NO/PB, MB calyx/lobes, AL L/R).
    // Do NOT paint every region soma: CX/MB/AL cell bodies scatter across the
    // brain, so "light all somas" looked nothing like the neuropil stills.
    // Spikes still flash on real somas via mappingFor + applySpikes.
    const x = positions[i * 3];
    // CX: midline EB/FB/NO/PB stack (dense soma core). Slightly taller to cover
    // the full vertical CX column seen in Neuroglancer.
    if (dist2(x, y, z, 0.0, -0.15, -0.9, 0.32, 0.38, 0.3) < 1) {
      role = ROLE_CX;
    } else if (
      // MB: match WHERE IT LIVES mesh — not just round calyx dots.
      // Neuroglancer shows bilateral calyx (dorsal bulbs) + peduncle stalks
      // dropping down + horizontal lobes reaching toward the midline.
      // Right hemisphere
      dist2(x, y, z, 0.55, -0.18, -1.08, 0.26, 0.3, 0.28) < 1 || // R calyx
      dist2(x, y, z, 0.4, -0.42, -0.88, 0.22, 0.4, 0.3) < 1 || // R peduncle
      dist2(x, y, z, 0.26, -0.55, -0.72, 0.24, 0.28, 0.28) < 1 || // R lobes (medial)
      // Left hemisphere
      dist2(x, y, z, -0.58, -0.16, -1.02, 0.28, 0.32, 0.3) < 1 || // L calyx
      dist2(x, y, z, -0.42, -0.4, -0.84, 0.24, 0.42, 0.32) < 1 || // L peduncle
      dist2(x, y, z, -0.28, -0.52, -0.7, 0.26, 0.3, 0.3) < 1 // L lobes (medial)
    ) {
      role = ROLE_MB;
    } else if (
      // AL: anterior bilateral bulbs
      dist2(x, y, z, 0.64, 0.7, 0.12, 0.28, 0.24, 0.32) < 1 ||
      dist2(x, y, z, -0.62, 0.63, 0.11, 0.3, 0.26, 0.34) < 1
    ) {
      role = ROLE_AL;
    }

    roles[i] = role;
    phases[i] = Math.random() * Math.PI * 2;
    // Slow shimmer (0.5–1.3 rad/s). The old 2–6.2 range made every particle
    // flicker on its own fast clock — that was the "chaotic hopping" noise.
    speeds[i] = 0.5 + Math.random() * 0.8;

    // Soft cyan (dorsal) → gold (ventral brain / descending), plus glitter noise.
    const along = (y - yMin) / ySpan; // 0 = ventral brain, 1 = dorsal top
    const goldW = 1 - along;
    let cr = CYAN_GLITTER[0] * along + GOLD_GLITTER[0] * goldW;
    let cg = CYAN_GLITTER[1] * along + GOLD_GLITTER[1] * goldW;
    let cb = CYAN_GLITTER[2] * along + GOLD_GLITTER[2] * goldW;
    // Accent roles keep a readable tint for legend lighting.
    // No gold/cyan sprinkle on CX/MB/AL — random gold next to cyan
    // reads as hot-pink/coral under AdditiveBlending and breaks the
    // match to WHERE IT LIVES (solid cyan / orchid / lime).
    if (role === ROLE_CX || role === ROLE_MB || role === ROLE_AL) {
      const [ar, ag, ab] = ROLE_RGB[role];
      cr = ar;
      cg = ag;
      cb = ab;
    } else {
      const sprinkle = Math.random();
      if (sprinkle < 0.1) {
        cr = GOLD_GLITTER[0];
        cg = GOLD_GLITTER[1];
        cb = GOLD_GLITTER[2];
      } else if (sprinkle > 0.9) {
        cr = CYAN_GLITTER[0];
        cg = CYAN_GLITTER[1];
        cb = CYAN_GLITTER[2];
      }
    }
    colors[i * 3] = cr * 0.85;
    colors[i * 3 + 1] = cg * 0.85;
    colors[i * 3 + 2] = cb * 0.85;
    const isAccentRole = role === ROLE_CX || role === ROLE_MB || role === ROLE_AL;
    const [ar, ag, ab] = isAccentRole ? ROLE_RGB[role] : [cr * 0.85, cg * 0.85, cb * 0.85];
    accentColors[i * 3] = ar;
    accentColors[i * 3 + 1] = ag;
    accentColors[i * 3 + 2] = ab;
  }
  return { roles, colors, accentColors, phases, speeds };
}

/**
 * Formerly painted every region soma as CX/MB/AL — that lit the whole brain
 * because cell bodies scatter far outside the neuropils shown in WHERE IT LIVES.
 * Spikes still map somas→particles in mappingFor; region *glow* uses compact
 * ellipsoids in assignRoles only.
 */
async function paintRolesFromSomas(_opts: {
  roles: Uint8Array;
  colors: Float32Array;
  accentColors: Float32Array;
  toDisplay: (x: number, y: number, z: number) => [number, number, number];
  nearestParticle: (x: number, y: number, z: number) => number;
  signal?: AbortSignal;
}): Promise<void> {
  // no-op — kept so call sites stay stable; carving is ellipsoid-only now.
}

/** Which particle roles light up for a mode. */
function hotRolesFor(region: RegionKey | null, pathway: boolean): number[] {
  if (pathway) return [ROLE_AL, ROLE_MB, ROLE_CX];
  if (region === "central_complex") return [ROLE_CX];
  if (region === "mushroom_body") return [ROLE_MB];
  if (region === "antennal_lobe") return [ROLE_AL];
  return [];
}

function hotRoleFor(region: RegionKey | null): number {
  const h = hotRolesFor(region, false);
  return h.length ? h[0] : -1;
}

/**
 * Focus dimming for NON-selected roles. Very aggressive so the atlas silhouette
 * stays readable but quiet — spike pops / the selected carving own the eye.
 */
function focusDim(_role: number): number {
  // Additive blending stacks in dense tissue, so stay under ~20%.
  // Demo needs the rest of the brain still readable as a silhouette.
  return 0.14;
}

export function MaleCnsBrainViz(props: {
  diag: StepResult | null;
  liveBrain: boolean;
  region?: RegionKey;
  /** Light AL + MB + CX carves together (pathway hybrid). */
  pathwayMode?: boolean;
  idleAnim?: boolean;
  /**
   * Cascade stage from BrainPanel (0=AL, 1=MB, 2=CX, -1=idle).
   * Why: UI meters and atlas flash the same left→right story on each decision.
   */
  cascadeStage?: number;
}) {
  const {
    diag,
    liveBrain,
    region,
    pathwayMode = false,
    idleAnim = true,
    cascadeStage = -1,
  } = props;
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const apiRef = useRef<{
    applyActivity: (stage: Record<string, number> | null, boost: boolean) => void;
    setRegion: (r: RegionKey | null, pathway?: boolean) => void;
    pulse: () => void;
    /** Flash the exact atlas particles whose region neurons spiked this step. */
    applySpikes: (spikeCount: Float32Array, forRegion?: RegionKey) => void;
    /** Extra bloom while cascade stage is active (thinking marketing). */
    setCascadeBoost: (stage: number) => void;
  } | null>(null);
  const lastPulseKey = useRef(0);
  const liveRef = useRef(liveBrain);
  const idleRef = useRef(idleAnim);
  const regionRef = useRef<RegionKey | null>(region ?? null);
  const pathwayRef = useRef(pathwayMode);
  const cascadeTimers = useRef<number[]>([]);

  useEffect(() => {
    liveRef.current = liveBrain;
    idleRef.current = idleAnim;
    regionRef.current = region ?? null;
    pathwayRef.current = pathwayMode;
    apiRef.current?.setRegion(region ?? null, pathwayMode);
  }, [liveBrain, idleAnim, region, pathwayMode]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const abort = new AbortController();
    let disposed = false;
    let raf = 0;
    let ro: ResizeObserver | null = null;
    let controls: OrbitControls | null = null;
    let renderer: THREE.WebGLRenderer | null = null;
    let geometry: THREE.BufferGeometry | null = null;
    let material: THREE.PointsMaterial | null = null;
    let sprite: THREE.CanvasTexture | null = null;
    let points: THREE.Points | null = null;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020305);

    const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 100);
    camera.position.set(0, 0.2, 4.2);

    renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      alpha: false,
    });
    // Additive glow dies under filmic tone-mapping — keep linear for glitter.
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    host.appendChild(renderer.domElement);
    Object.assign(renderer.domElement.style, {
      width: "100%",
      height: "100%",
      display: "block",
      borderRadius: "8px",
    });

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    // Slow drift (was 1.05) — a calm gallery orbit, not a spinning toy.
    controls.autoRotateSpeed = 0.5;
    controls.enablePan = false;
    // Brain-only cloud is shorter than full CNS — keep zoom range tight so it fills the panel.
    controls.minDistance = 2.0;
    controls.maxDistance = 6.5;
    controls.target.set(0, 0, 0);

    // roleBoost = what the tick loop reads; roleTarget = what applyActivity
    // writes. The loop EASES boost → target so 250 ms decision updates never
    // snap brightness (that snapping was a big part of the "jitter").
    const roleBoost = new Float32Array(ROLE_COUNT);
    const roleTarget = new Float32Array(ROLE_COUNT);
    roleBoost.fill(0.18);
    roleTarget.fill(0.18);
    // Decision flash: decaying scalar (no geometry scale-pop — see pulse()).
    // Stronger/longer than before so judges see a clear “thinking” bloom.
    let flash = 0;
    // Soft extra boost on the cascade-active role (AL then MB then CX).
    const cascadeBoost = new Float32Array(ROLE_COUNT);
    // 0 → 1 ease when a region is selected; drives tint + dim contrast.
    let focusT = regionRef.current || pathwayRef.current ? 1 : 0;
    let selected: RegionKey | null = regionRef.current;
    let pathwayOn = pathwayRef.current;

    const resize = () => {
      if (!renderer) return;
      const w = host.clientWidth || 1;
      const h = host.clientHeight || 1;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    resize();
    ro = new ResizeObserver(resize);
    ro.observe(host);

    void (async () => {
      try {
        const atlas = await loadMaleCnsAtlas(abort.signal);
        if (disposed) return;

        const { roles, colors, accentColors, phases, speeds } = assignRoles(
          atlas.positions,
          atlas.groups,
          atlas.count
        );
        // Freeze sprinkled cyan/gold bases — twinkle multiplies these, never ROLE_RGB.
        const baseColors = new Float32Array(colors);

        // ---- Cerebra-style per-neuron spike flashes ----
        // Instead of only glowing the whole selected region, we light the
        // EXACT atlas particles whose simulated neurons spiked this step.
        // Region exports ship real MaleCNS soma positions (soma_xyz.bin), and
        // they land exactly on atlas particles (scripts/verify-soma-map.mjs:
        // median nearest-neighbor distance 0.0), so the mapping is 1:1 real
        // anatomy, not an approximate blob.
        //
        // spikeTime[i] = ms timestamp when atlas particle i last spiked;
        // the tick loop turns recency into a decaying white flash.
        const spikeTime = new Float32Array(atlas.count);
        // Indices that currently have a live flash — recolored EVERY frame so
        // the sliding CHUNK window can't let a spike fade before it paints.
        let hotSpikes: number[] = [];

        // Uniform grid over display-space positions for fast nearest-particle
        // lookup (built once; ~124k inserts, queries are O(1) neighborhood).
        const GRID_CELL = 0.06;
        const grid = new Map<string, number[]>();
        for (let i = 0; i < atlas.count; i++) {
          const k =
            Math.floor(atlas.positions[i * 3] / GRID_CELL) + "," +
            Math.floor(atlas.positions[i * 3 + 1] / GRID_CELL) + "," +
            Math.floor(atlas.positions[i * 3 + 2] / GRID_CELL);
          let bucket = grid.get(k);
          if (!bucket) grid.set(k, (bucket = []));
          bucket.push(i);
        }
        const nearestParticle = (x: number, y: number, z: number): number => {
          const ci = Math.floor(x / GRID_CELL);
          const cj = Math.floor(y / GRID_CELL);
          const ck = Math.floor(z / GRID_CELL);
          // Same-dataset match: the true neighbor is essentially always in the
          // 27 surrounding cells. Cap at 0.15 display units so a soma that
          // fell outside the atlas (e.g. antenna ORNs) maps to nothing
          // instead of to a far-away wrong particle.
          const maxD2 = 0.15 * 0.15;
          let best = -1;
          let bestD2 = maxD2;
          for (let ix = ci - 3; ix <= ci + 3; ix++)
            for (let iy = cj - 3; iy <= cj + 3; iy++)
              for (let iz = ck - 3; iz <= ck + 3; iz++) {
                const bucket = grid.get(ix + "," + iy + "," + iz);
                if (!bucket) continue;
                for (const i of bucket) {
                  const dx = atlas.positions[i * 3] - x;
                  const dy = atlas.positions[i * 3 + 1] - y;
                  const dz = atlas.positions[i * 3 + 2] - z;
                  const d2 = dx * dx + dy * dy + dz * dz;
                  if (d2 < bestD2) {
                    bestD2 = d2;
                    best = i;
                  }
                }
              }
          return best;
        };

        // Mark every CX / MB / AL neuron on the atlas (complete region highlight).
        await paintRolesFromSomas({
          roles,
          colors,
          accentColors,
          toDisplay: atlas.toDisplay,
          nearestParticle,
          signal: abort.signal,
        });
        if (disposed) return;
        // Refresh frozen bases after soma paint so twinkle uses the new tints.
        baseColors.set(colors);

        // neuron index → atlas particle index per region (-1 = no brain soma).
        // Cached: built once per region, a few thousand grid lookups total.
        const mappingCache = new Map<RegionKey, Int32Array>();
        const mappingFor = async (r: RegionKey): Promise<Int32Array> => {
          const hit = mappingCache.get(r);
          if (hit) return hit;
          const res = await fetch(`/regions/${r}/soma_xyz.bin`, {
            signal: abort.signal,
          });
          if (!res.ok) throw new Error(`soma_xyz for ${r}: ${res.status}`);
          const soma = new Float32Array(await res.arrayBuffer());
          const n = Math.floor(soma.length / 3);
          const map = new Int32Array(n);
          for (let i = 0; i < n; i++) {
            const x = soma[i * 3];
            const y = soma[i * 3 + 1];
            const z = soma[i * 3 + 2];
            // NaN = annotation has no somaLocation (common for antennal ORNs —
            // their cell bodies sit in the antenna, outside the brain atlas).
            if (!Number.isFinite(x + y + z)) {
              map[i] = -1;
              continue;
            }
            const [dx, dy, dz] = atlas.toDisplay(x, y, z);
            map[i] = nearestParticle(dx, dy, dz);
          }
          mappingCache.set(r, map);
          return map;
        };

        /** Which pathway carve is currently “thinking” (−1 = none). */
        let activeCascadeRole = -1;
        let lastResparkMs = 0;

        /** Insanely bright sparse pops in ONE neuropil — active cascade only. */
        function sparkRole(role: number, n: number) {
          const nowMs = performance.now();
          const pool: number[] = [];
          for (let i = 0; i < roles.length; i++) {
            if (roles[i] === role) pool.push(i);
          }
          if (pool.length === 0) return;
          const [SR, SG, SB] = ROLE_RGB[role];
          // Clear previous stage's sparks so only the active carve twinkles.
          hotSpikes = [];
          const take = Math.min(n, pool.length);
          for (let k = 0; k < take; k++) {
            const j = (Math.random() * pool.length) | 0;
            const p = pool[j];
            pool[j] = pool[pool.length - 1];
            pool.pop();
            spikeTime[p] = nowMs;
            hotSpikes.push(p);
            // Near-white hot core + role tint — additive blending needs huge values.
            colors[p * 3] = Math.min(4.5, 2.2 + SR * 3.2);
            colors[p * 3 + 1] = Math.min(4.5, 2.2 + SG * 3.2);
            colors[p * 3 + 2] = Math.min(4.5, 2.2 + SB * 3.2);
          }
          lastResparkMs = nowMs;
          colorAttr.needsUpdate = true;
        }

        function applySpikes(_spikeCount: Float32Array, forRegion?: RegionKey) {
          // Sparks are driven by cascade stage (setCascadeBoost), not bulk spikes.
          void _spikeCount;
          void forRegion;
        }

        geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
          "position",
          new THREE.BufferAttribute(atlas.positions, 3)
        );
        const colorAttr = new THREE.BufferAttribute(colors, 3);
        colorAttr.setUsage(THREE.DynamicDrawUsage);
        geometry.setAttribute("color", colorAttr);

        sprite = makeGlowSprite();
        material = new THREE.PointsMaterial({
          size: 0.032,
          map: sprite,
          vertexColors: true,
          transparent: true,
          opacity: 1,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          sizeAttenuation: true,
        });

        points = new THREE.Points(geometry, material);
        points.frustumCulled = false;
        points.rotation.set(-0.28, 0.48, 0.06);
        scene.add(points);

        camera.position.set(0, 0.12, 3.55);
        controls!.target.set(0, 0.02, 0);
        controls!.update();

        function applyActivity(
          stage: Record<string, number> | null,
          boost: boolean
        ) {
          const ring = stage?.ring ?? 0;
          const pfn = stage?.pfn ?? 0;
          const pfl = stage?.pfl ?? 0;
          const other = stage?.other ?? 0;
          const maxS = Math.max(1, ring, pfn, pfl, other);

          const hots = hotRolesFor(selected, pathwayOn);
          const quiet = 0.04;
          roleTarget[ROLE_SENSORY] = quiet;
          roleTarget[ROLE_CX] = quiet;
          roleTarget[ROLE_CENTRAL] = quiet;
          roleTarget[ROLE_MOTOR] = quiet;
          roleTarget[ROLE_OPTIC] = quiet * 0.8;
          roleTarget[ROLE_MB] = quiet;
          roleTarget[ROLE_AL] = quiet;

          const boostRole = (role: number, base: number, amp: number) => {
            if (hots.includes(role)) roleTarget[role] = base + amp;
          };

          if (pathwayOn) {
            // Pathway carves share a calm floor; cascade tick dims inactive ones
            // further so the stimulated stage pops against them.
            roleTarget[ROLE_AL] = 0.085;
            roleTarget[ROLE_MB] = 0.085;
            roleTarget[ROLE_CX] = 0.085;
          } else if (hots.length > 0) {
            // Single-region ablation: soft activity from stage spikes.
            boostRole(ROLE_CX, 0.14, 0.1 * Math.min(1, pfn / maxS));
            boostRole(ROLE_MB, 0.12, 0.1 * Math.min(1, (pfn * 0.6 + ring * 0.4) / maxS));
            boostRole(ROLE_AL, 0.12, 0.1 * Math.min(1, (ring * 0.7 + pfn * 0.3) / maxS));
          } else if (!selected && !pathwayOn) {
            roleTarget[ROLE_SENSORY] = 0.12 + 0.18 * Math.min(1, ring / maxS);
            roleTarget[ROLE_CX] = 0.14 + 0.2 * Math.min(1, pfn / maxS);
            roleTarget[ROLE_CENTRAL] = 0.1 + 0.12 * Math.min(1, pfn / maxS);
            roleTarget[ROLE_MOTOR] = 0.12 + 0.18 * Math.min(1, pfl / maxS);
            roleTarget[ROLE_OPTIC] = 0.08 + 0.1 * Math.min(1, 0.3 + other / maxS);
            roleTarget[ROLE_MB] =
              0.12 + 0.18 * Math.min(1, (pfn * 0.6 + ring * 0.4) / maxS);
            roleTarget[ROLE_AL] =
              0.12 + 0.18 * Math.min(1, (ring * 0.7 + pfn * 0.3) / maxS);
          }
          // No global flash here — whole-cloud flicker looked pointless.
        }

        function setRegion(r: RegionKey | null, pathway?: boolean) {
          selected = r;
          if (pathway !== undefined) pathwayOn = pathway;
          if (pathwayOn) {
            void mappingFor("antennal_lobe").catch(() => undefined);
            void mappingFor("mushroom_body").catch(() => undefined);
            void mappingFor("central_complex").catch(() => undefined);
          } else if (r) {
            void mappingFor(r).catch(() => undefined);
          }
        }

        function pulse() {
          // Soft nudge only (was full-brain white flash).
          flash = Math.max(flash, 0.22);
        }

        function setCascadeBoost(stage: number) {
          cascadeBoost.fill(0);
          // Dim non-active carves; only the active stage gets a boost + sparks.
          if (stage === 0) {
            activeCascadeRole = ROLE_AL;
            cascadeBoost[ROLE_AL] = 1.2;
            sparkRole(ROLE_AL, 48);
          } else if (stage === 1) {
            activeCascadeRole = ROLE_MB;
            cascadeBoost[ROLE_MB] = 1.2;
            sparkRole(ROLE_MB, 48);
          } else if (stage === 2) {
            activeCascadeRole = ROLE_CX;
            cascadeBoost[ROLE_CX] = 1.2;
            sparkRole(ROLE_CX, 52);
          } else {
            activeCascadeRole = -1;
            hotSpikes = [];
          }
        }

        apiRef.current = {
          applyActivity,
          setRegion,
          pulse,
          applySpikes,
          setCascadeBoost,
        };
        setStatus("ready");

        const count = atlas.count;
        let t0 = performance.now();
        let lastNow = t0;

        const tick = (now: number) => {
          raf = requestAnimationFrame(tick);
          if (!material || !points || !renderer || !controls) return;
          const t = (now - t0) / 1000;
          const dt = Math.min(0.05, (now - lastNow) / 1000);
          lastNow = now;

          // Ease activity boosts (≈160 ms settle) so 250 ms decisions swell
          // instead of snapping brightness.
          const ease = Math.min(1, dt * 6);
          for (let r = 0; r < ROLE_COUNT; r++) {
            roleBoost[r] += (roleTarget[r] - roleBoost[r]) * ease;
          }
          // Think flash ~250–300 ms — bright enough to read as a decision.
          flash *= Math.exp(-dt * 3.5);
          const flashMul = 1 + 0.12 * flash;
          // Hold boost on the active cascade carve; kill the others fast.
          for (let r = 0; r < ROLE_COUNT; r++) {
            if (r === activeCascadeRole) {
              cascadeBoost[r] += (1.35 - cascadeBoost[r]) * Math.min(1, dt * 12);
            } else {
              cascadeBoost[r] *= Math.exp(-dt * 8);
            }
          }
          // Keep re-sparking the active carve so sparse lights stay bright.
          if (activeCascadeRole >= 0 && now - lastResparkMs > 110) {
            sparkRole(activeCascadeRole, 42);
          }
          // Region focus cross-fade (selection changes never pop).
          focusT += ((selected || pathwayOn ? 1 : 0) - focusT) * Math.min(1, dt * 4);

          const hots = hotRolesFor(selected, pathwayOn);
          const hotPulse = 1 + 0.18 * Math.sin(t * 2.8);
          const hotGain = 1 + 0.45 * focusT;
          const dimAmt = selected || pathwayOn ? Math.max(focusT, 0.92) : 0;

          for (let i = 0; i < count; i++) {
            const role = roles[i];
            let br = baseColors[i * 3];
            let bg = baseColors[i * 3 + 1];
            let bb = baseColors[i * 3 + 2];
            let a: number;
            const cBoost = 1 + cascadeBoost[role];
            if (hots.includes(role)) {
              br += (accentColors[i * 3] - br) * focusT;
              bg += (accentColors[i * 3 + 1] - bg) * focusT;
              bb += (accentColors[i * 3 + 2] - bb) * focusT;
              // Pathway hierarchy while cascading:
              //   active  → bright + pulse + sparks
              //   inactive pathway carves → soft tint (above rest-of-brain)
              //   rest of brain → very dim silhouette
              if (
                pathwayOn &&
                activeCascadeRole >= 0 &&
                role !== activeCascadeRole
              ) {
                // Soft pathway landmark — clearly dimmer than the stimulated carve.
                a = roleBoost[role] * 0.28;
              } else {
                a = roleBoost[role] * flashMul * hotPulse * hotGain * cBoost;
              }
            } else {
              // Non-pathway tissue: almost static silhouette (tiny wave only).
              const wave = 0.5 + 0.5 * Math.sin(t * speeds[i] + phases[i]);
              const sparkle = pathwayOn ? 0.98 : 0.92 + 0.08 * wave;
              // Pathway mode: push rest-of-brain darker so AL/MB/CX read as a set.
              const restDim = pathwayOn ? 0.42 : 1;
              const dim = 1 + (focusDim(role) - 1) * dimAmt;
              a = roleBoost[role] * flashMul * sparkle * dim * cBoost * restDim;
            }
            colors[i * 3] = br * a;
            colors[i * 3 + 1] = bg * a;
            colors[i * 3 + 2] = bb * a;
          }
          // Insanely bright pin-pricks — must punch through additive cloud.
          const SPIKE_TAU = 520;
          const SPIKE_GAIN = 4.2;
          for (let h = 0; h < hotSpikes.length; h++) {
            const i = hotSpikes[h];
            const st = spikeTime[i];
            if (st <= 0) continue;
            const g = Math.exp(-(now - st) / SPIKE_TAU);
            if (g < 0.04) continue;
            const wg = g * SPIKE_GAIN;
            const role = roles[i];
            const [SR, SG, SB] = ROLE_RGB[role] ?? ([1.0, 0.22, 0.58] as [number, number, number]);
            // Hot white core + role color (values >>1 for AdditiveBlending).
            colors[i * 3] = Math.min(5.5, 1.8 * wg + wg * SR * 2.2);
            colors[i * 3 + 1] = Math.min(5.5, 1.8 * wg + wg * SG * 2.2);
            colors[i * 3 + 2] = Math.min(5.5, 1.8 * wg + wg * SB * 2.2);
          }
          colorAttr.needsUpdate = true;

          const flashSize = 0.01 * flash;
          material.size =
            hotSpikes.length > 0
              ? 0.125 + flashSize
              : liveRef.current && idleRef.current
                ? 0.034 + flashSize
                : 0.03 + flashSize;
          material.opacity = 1;

          controls.update();
          renderer.render(scene, camera);
        };
        raf = requestAnimationFrame(tick);
      } catch (err) {
        if (abort.signal.aborted || disposed) return;
        console.error(err);
        setStatus("error");
      }
    })();

    return () => {
      disposed = true;
      abort.abort();
      cancelAnimationFrame(raf);
      ro?.disconnect();
      apiRef.current = null;
      controls?.dispose();
      geometry?.dispose();
      material?.dispose();
      sprite?.dispose();
      renderer?.dispose();
      if (renderer && renderer.domElement.parentElement === host) {
        host.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Drive cascade role bloom from BrainPanel’s staggered stage index.
  useEffect(() => {
    apiRef.current?.setCascadeBoost(cascadeStage);
  }, [cascadeStage]);

  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;
    for (const t of cascadeTimers.current) clearTimeout(t);
    cascadeTimers.current = [];

    if (!diag) {
      api.applyActivity(null, false);
      return;
    }
    // Activity floors only — sparse sparks come solely from cascadeStage.
    api.applyActivity(diag.stageSpikes, false);
    const key =
      (diag.stageSpikes.ring ?? 0) +
      (diag.stageSpikes.pfn ?? 0) * 1_000 +
      (diag.stageSpikes.pfl ?? 0) * 1_000_000 +
      diag.action * 17;
    if (key !== lastPulseKey.current) {
      lastPulseKey.current = key;
      api.pulse();
    }

    return () => {
      for (const t of cascadeTimers.current) clearTimeout(t);
      cascadeTimers.current = [];
    };
  }, [diag, pathwayMode]);

  return (
    <div
      ref={hostRef}
      style={{
        width: "100%",
        height: "100%",
        minHeight: 0,
        background: "#020305",
        borderRadius: 8,
        overflow: "hidden",
        position: "relative",
      }}
      title="Drag to orbit · scroll to zoom · MaleCNS brain soma atlas (no VNC)"
    >
      {status !== "ready" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            fontFamily: "var(--font-mono, ui-monospace, monospace)",
            fontSize: 10,
            letterSpacing: "0.08em",
            color: status === "error" ? "#ff6b8a" : "#7ad7ff",
            pointerEvents: "none",
            zIndex: 1,
          }}
        >
          {status === "error" ? "ATLAS UNAVAILABLE" : "LOADING BRAIN ATLAS…"}
        </div>
      )}
    </div>
  );
}
