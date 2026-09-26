/**
 * Static "proof" card — numbers pasted from a real evaluate.py run.
 *
 * Why hard-code instead of fetching JSON at runtime?
 *   Judges see ablation evidence in the sidebar with zero network dependency.
 *   After you re-run brain/evaluate.py, copy the new numbers from
 *   brain/checkpoints/<region>_eval.json into PROOF below.
 *
 * Source of truth for these values:
 *   brain/checkpoints/central_complex_eval.json
 *   (intact 0.955 ≈ 95.5%, shuffled 0.0995 ≈ 9.95%, zeroed 0.1265 ≈ 12.65%)
 */

import React from "react";

export const PROOF = {
  region: "central_complex",
  // Accuracies are 0–1 fractions; the UI multiplies by 100 for "%".
  intact: 0.955 as number | null,
  shuffled: 0.0995 as number | null,
  zeroed: 0.1265 as number | null,
  note: "From brain/evaluate.py on the imitation dataset (CX).",
};

export function ProofCard() {
  if (PROOF.intact == null) {
    return (
      <div style={{ fontSize: 11, opacity: 0.65, borderTop: "1px solid #243049", paddingTop: 8 }}>
        Proof card: train + evaluate to show intact vs shuffled vs zeroed W accuracies.
      </div>
    );
  }
  return (
    <div style={{ fontSize: 12, borderTop: "1px solid #243049", paddingTop: 8 }}>
      <div style={{ fontWeight: 700 }}>Does the wiring matter?</div>
      <div>Intact W: {(PROOF.intact * 100).toFixed(1)}%</div>
      <div>Shuffled W: {(PROOF.shuffled! * 100).toFixed(1)}%</div>
      <div>Zeroed W: {(PROOF.zeroed! * 100).toFixed(1)}%</div>
      <div style={{ opacity: 0.7, marginTop: 4 }}>
        Drop under shuffle/zero = the frozen connectome carries the skill.
      </div>
    </div>
  );
}
