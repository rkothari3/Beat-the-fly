/**
 * One WebGLRenderer, two viewports (left = human, right = fly).
 *
 * Why one renderer?
 *   Two WebGL contexts fight for GPU memory and break more often on random
 *   demo laptops. Scissor/viewport splitting is the standard Three.js pattern.
 *
 * Critical sizing rule (Three.js r152+):
 *   setViewport / setScissor take *logical CSS pixels*. Three multiplies by
 *   devicePixelRatio internally when talking to WebGL. If you pass
 *   canvas.width/height (already × pixelRatio), halves get scaled twice —
 *   the CSS center line no longer matches the GL seam, and roads look
 *   "sliced and shifted." Always use getSize() / the resize() CSS dims.
 */

import * as THREE from "three";
import { LaneWorld } from "../core/LaneWorld";
import { WorldView } from "./WorldView";

export class SplitScreen {
  readonly renderer: THREE.WebGLRenderer;
  readonly human: WorldView;
  readonly fly: WorldView;
  private disposed = false;
  /** Last CSS size from resize() — logical pixels, NOT drawing-buffer. */
  private cssW = 2;
  private cssH = 2;
  private readonly sizeTmp = new THREE.Vector2();

  constructor(canvas: HTMLCanvasElement) {
    // alpha:false avoids a transparent canvas that looks "blank white" over a
    // light browser default when the first clear fails.
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    // Classic Crossy sky while panes clear (matches Expo sceneColor).
    this.renderer.setClearColor(0x87c6ff, 1);
    // Expo CrossyRenderer — vibrant MagicaVoxel palette.
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Split-screen needs manual clears per half.
    this.renderer.autoClear = false;

    this.human = new WorldView("human");
    this.fly = new WorldView("fly");
  }

  /**
   * @param cssWidth  CSS pixel width of the game pane (columns 1–2 ≈ 2/3 of page)
   * @param cssHeight CSS pixel height of the game pane
   * Half-scissors stay 50/50 so human|fly each get ~1/3 of the window.
   */
  resize(cssWidth: number, cssHeight: number) {
    if (this.disposed) return;
    const w = Math.max(2, Math.floor(cssWidth));
    const h = Math.max(2, Math.floor(cssHeight));
    this.cssW = w;
    this.cssH = h;

    // updateStyle=true so canvas.style width/height track the pane.
    // We still force 100% below in case a parent reflow races us.
    this.renderer.setSize(w, h, true);
    const canvas = this.renderer.domElement;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";

    // Expo CrossyCamera.updateScale per half — CSS size × DPR + zoom 400.
    const half = Math.floor(w / 2);
    this.human.setViewSize(half, h);
    this.fly.setViewSize(w - half, h);
  }

  render(humanWorld: LaneWorld, flyWorld: LaneWorld) {
    if (this.disposed) return;
    this.human.sync(humanWorld);
    this.fly.sync(flyWorld);

    // Logical CSS size (Three.js multiplies by pixelRatio inside setViewport).
    this.renderer.getSize(this.sizeTmp);
    const w = Math.max(2, Math.floor(this.sizeTmp.x) || this.cssW);
    const h = Math.max(2, Math.floor(this.sizeTmp.y) || this.cssH);
    if (w < 2 || h < 2) return;

    // Exact 50/50 in CSS pixels: left gets floor(W/2), right the remainder.
    const half = Math.floor(w / 2);

    this.renderer.setScissorTest(true);

    // Left = human
    this.renderer.setViewport(0, 0, half, h);
    this.renderer.setScissor(0, 0, half, h);
    this.renderer.setClearColor(this.human.scene.background as THREE.Color, 1);
    this.renderer.clear(true, true, true);
    this.renderer.render(this.human.scene, this.human.camera);

    // Right = fly
    this.renderer.setViewport(half, 0, w - half, h);
    this.renderer.setScissor(half, 0, w - half, h);
    this.renderer.setClearColor(this.fly.scene.background as THREE.Color, 1);
    this.renderer.clear(true, true, true);
    this.renderer.render(this.fly.scene, this.fly.camera);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    // Critical with React StrictMode: the effect mounts twice in dev.
    // Without dispose(), the second WebGLRenderer steals the canvas and the
    // first context dies — Chrome then shows a blank/broken canvas.
    this.renderer.dispose();
    this.human.dispose();
    this.fly.dispose();
  }
}
