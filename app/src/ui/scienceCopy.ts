/**
 * Curriculum copy bank — 5 honest science beats for the Learn overlay.
 *
 * Why one file? So Learn diagrams and captions stay in sync without
 * rewriting the same claims in three places. Tone: curious, not overclaiming.
 * Scope: ~11k neurons / 3 MaleCNS regions — not the whole 166k brain.
 */

export const SCIENCE_SCOPE =
  "~11k neurons across AL + MB + CX — three MaleCNS regions, not the whole 166k brain.";

export type ScienceBeatId =
  | "recipe"
  | "whyThree"
  | "cascadeSearch"
  | "proofWiring"
  | "whyMap";

export type ScienceBeat = {
  id: ScienceBeatId;
  /** Short nav label */
  nav: string;
  title: string;
  /** 2–3 plain-English sentences */
  body: string[];
  /** One-line diagram caption */
  caption: string;
};

export const SCIENCE_BEATS: ScienceBeat[] = [
  {
    id: "recipe",
    nav: "Recipe",
    title: "Not an LLM — a frozen connectome recipe",
    body: [
      "We take real MaleCNS wiring and freeze it. Nothing rewires mid-game.",
      "Tiny trainable encoders and decoders sit on the edges; the middle is locked biology.",
      "The fly scores hops from that recipe — not from a chatbot guessing words.",
    ],
    caption: "MaleCNS W (locked) → encoder → LIF → decoder → hop scores",
  },
  {
    id: "whyThree",
    nav: "Why three",
    title: "Why these three regions",
    body: [
      "Antennal lobe (AL) relays smell-like cues. Mushroom body (MB) is memory. Central complex (CX) steers.",
      "Sense → remember → navigate is a natural cascade for a Crossy Road hop.",
      "Optic lobes and the rest of MaleCNS stay out of this demo on purpose.",
    ],
    caption: "AL + MB + CX lit · rest of the brain stays dim",
  },
  {
    id: "cascadeSearch",
    nav: "Cascade",
    title: "Soft cascade + brain-weighted search",
    body: [
      "Activity soft-feeds AL → MB → CX so each stage nudges the next without hard one-hots.",
      "CX outputs move probabilities (the sidebar bars). Look-ahead search still enforces legal, safe hops.",
      "priorStrength 10 makes the brain’s vote matter — bars propose, badge shows what search acted.",
    ],
    caption: "Cascade → bars (brain) → search (brain-heavy) → badge hop",
  },
  {
    id: "proofWiring",
    nav: "Proof",
    title: "Proof the wiring matters",
    body: [
      "Ablations keep the same training recipe and swap only the connectome matrix.",
      "Intact wiring matches the teacher ~95%. Shuffle the edges and it collapses to ~10%.",
      "That drop is the honest argument: skill lives in the frozen graph, not only in the tiny adapters.",
    ],
    caption: "Intact ~95% · shuffled ~10% (same train, different W)",
  },
  {
    id: "whyMap",
    nav: "Why map",
    title: "Why map brains at all",
    body: [
      "Connectomes let us ask which circuits do which jobs — discovery, not mystique.",
      "Frozen graphs inspire compact bio-inspired controllers that stay inspectable.",
      "Longer term, maps are a path toward understanding disease and repair in real nervous systems.",
    ],
    caption: "Discover circuits · inspire AI · medicine & repair",
  },
];
