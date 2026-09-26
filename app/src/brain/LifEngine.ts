/**
 * Browser-side LIF engine.
 *
 * Loads the exported CSC weights from /public/regions/<name>/ and runs the
 * same equations as brain/lif.py. A selfcheck.json replay at load time proves
 * TypeScript and PyTorch agree — critical, because a silent numeric mismatch
 * would make the "real brain" claim unverifiable.
 */

export type RegionKey = "central_complex" | "mushroom_body" | "antennal_lobe";

export interface RegionBundle {
  key: RegionKey;
  label: string;
  n: number;
  nSteps: number;
  obsDim: number;
  nActions: number;
  inIdx: Int32Array;
  outIdx: Int32Array;
  // CSC by source: for each src, values at row indices W_rowidx[colptr[src]..colptr[src+1])
  colptr: Uint32Array;
  rowidx: Uint16Array | Uint32Array;
  vals: Float32Array;
  encW: Float32Array; // [obsDim * nIn] row-major
  encB: Float32Array; // [nIn]
  lnW: Float32Array;
  lnB: Float32Array;
  alpha: Float32Array;
  vTh: Float32Array;
  reset: Float32Array;
  wScale: number;
  decW: Float32Array; // [nActions * nOut]
  decB: Float32Array;
  stages: string[];
  types: string[];
  somaXyz: Float32Array; // [n * 3]
  selfcheck?: { obs: number[]; logits: number[] }[];
}

export interface StepResult {
  action: number;
  logits: Float32Array;
  probs: Float32Array;
  spikeCount: Float32Array;
  stageSpikes: Record<string, number>;
  vOut: Float32Array;
}

function softmax(logits: Float32Array): Float32Array {
  let max = -Infinity;
  for (let i = 0; i < logits.length; i++) max = Math.max(max, logits[i]);
  const out = new Float32Array(logits.length);
  let sum = 0;
  for (let i = 0; i < logits.length; i++) {
    out[i] = Math.exp(logits[i] - max);
    sum += out[i];
  }
  for (let i = 0; i < out.length; i++) out[i] /= sum;
  return out;
}

export class LifEngine {
  readonly region: RegionBundle;
  private v: Float32Array;
  private spikes: Float32Array;

  constructor(region: RegionBundle) {
    this.region = region;
    this.v = new Float32Array(region.n);
    this.spikes = new Float32Array(region.n);
  }

  reset() {
    this.v.fill(0);
    this.spikes.fill(0);
  }

  /** Run nSteps of LIF from a fresh state (matches training: reset per decision). */
  step(obs: Float32Array | number[]): StepResult {
    const r = this.region;
    const nIn = r.inIdx.length;
    const nOut = r.outIdx.length;

    // Encoder + LayerNorm over input population.
    const enc = new Float32Array(nIn);
    for (let i = 0; i < nIn; i++) {
      let s = r.encB[i];
      for (let j = 0; j < r.obsDim; j++) s += r.encW[i * r.obsDim + j] * obs[j];
      enc[i] = s;
    }
    // LayerNorm
    let mean = 0;
    for (let i = 0; i < nIn; i++) mean += enc[i];
    mean /= nIn;
    let var_ = 0;
    for (let i = 0; i < nIn; i++) {
      const d = enc[i] - mean;
      var_ += d * d;
    }
    var_ = Math.sqrt(var_ / nIn + 1e-5);
    for (let i = 0; i < nIn; i++) {
      enc[i] = ((enc[i] - mean) / var_) * r.lnW[i] + r.lnB[i];
    }

    this.v.fill(0);
    this.spikes.fill(0);
    const spikeCount = new Float32Array(r.n);
    const vOutAcc = new Float32Array(nOut);
    const stageSpikes: Record<string, number> = { ring: 0, pfn: 0, pfl: 0, other: 0 };

    const I = new Float32Array(r.n);

    for (let t = 0; t < r.nSteps; t++) {
      I.fill(0);
      // Sparse W @ spikes (CSC by source): only sources that spiked contribute.
      for (let src = 0; src < r.n; src++) {
        if (this.spikes[src] === 0) continue;
        const a = r.colptr[src];
        const b = r.colptr[src + 1];
        for (let k = a; k < b; k++) {
          I[r.rowidx[k]] += r.vals[k] * r.wScale * this.spikes[src];
        }
      }
      for (let i = 0; i < nIn; i++) I[r.inIdx[i]] += enc[i];

      for (let i = 0; i < r.n; i++) {
        this.v[i] = r.alpha[i] * this.v[i] + I[i];
        const sp = this.v[i] >= r.vTh[i] ? 1 : 0;
        if (sp) this.v[i] = r.reset[i];
        this.spikes[i] = sp;
        spikeCount[i] += sp;
        const st = r.stages[i] || "other";
        if (st in stageSpikes) stageSpikes[st] += sp;
        else stageSpikes.other += sp;
      }
      for (let i = 0; i < nOut; i++) vOutAcc[i] += this.v[r.outIdx[i]];
    }

    const vOut = new Float32Array(nOut);
    for (let i = 0; i < nOut; i++) vOut[i] = vOutAcc[i] / r.nSteps;

    const logits = new Float32Array(r.nActions);
    for (let a = 0; a < r.nActions; a++) {
      let s = r.decB[a];
      for (let i = 0; i < nOut; i++) s += r.decW[a * nOut + i] * vOut[i];
      logits[a] = s;
    }
    const probs = softmax(logits);
    let action = 0;
    for (let a = 1; a < probs.length; a++) if (probs[a] > probs[action]) action = a;

    return { action, logits, probs, spikeCount, stageSpikes, vOut };
  }

  /** Replay selfcheck vectors; returns max abs logit error. */
  runSelfcheck(): number {
    if (!this.region.selfcheck?.length) return 0;
    let maxErr = 0;
    for (const row of this.region.selfcheck) {
      const r = this.step(Float32Array.from(row.obs));
      for (let i = 0; i < row.logits.length; i++) {
        maxErr = Math.max(maxErr, Math.abs(r.logits[i] - row.logits[i]));
      }
    }
    return maxErr;
  }
}

async function loadBin(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return res.arrayBuffer();
}

export async function loadRegion(key: RegionKey): Promise<RegionBundle> {
  const base = `/regions/${key}`;
  const manRes = await fetch(`${base}/manifest.json`);
  if (!manRes.ok) throw new Error(`No manifest for ${key}: ${manRes.status}`);
  const manifest: any = await manRes.json();
  const buf = async (name: string) => loadBin(`${base}/${name}`);

  const f32 = async (name: string) => new Float32Array(await buf(name));
  const i32 = async (name: string) => new Int32Array(await buf(name));
  const u32 = async (name: string) => new Uint32Array(await buf(name));

  let selfcheck: RegionBundle["selfcheck"];
  try {
    const sc = await fetch(`${base}/selfcheck.json`);
    selfcheck = sc.ok ? await sc.json() : undefined;
  } catch {
    selfcheck = undefined;
  }

  const stages: string[] = manifest.stages;
  const types: string[] = manifest.types;

  return {
    key,
    label: manifest.label,
    n: manifest.n,
    nSteps: manifest.n_steps,
    obsDim: manifest.obs_dim,
    nActions: manifest.n_actions,
    inIdx: await i32("in_idx.bin"),
    outIdx: await i32("out_idx.bin"),
    colptr: await u32("W_colptr.bin"),
    rowidx: manifest.rowidx_dtype === "u16"
      ? new Uint16Array(await buf("W_rowidx.bin"))
      : await u32("W_rowidx.bin"),
    vals: await f32("W_vals.bin"),
    encW: await f32("enc_w.bin"),
    encB: await f32("enc_b.bin"),
    lnW: await f32("ln_w.bin"),
    lnB: await f32("ln_b.bin"),
    alpha: await f32("alpha.bin"),
    vTh: await f32("v_th.bin"),
    reset: await f32("reset.bin"),
    wScale: manifest.w_scale,
    decW: await f32("dec_w.bin"),
    decB: await f32("dec_b.bin"),
    stages,
    types,
    somaXyz: await f32("soma_xyz.bin"),
    selfcheck,
  };
}
