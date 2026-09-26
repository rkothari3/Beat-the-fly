/**
 * "WHERE IT LIVES" — real MaleCNS Neuroglancer stills (shell + region mesh),
 * not a hand-drawn oval diagram. Images are cropped captures from the curated
 * deep-links in neuroglancerLinks.ts (EB/FB/NO/PB, MB lobes, AL L/R).
 */

import React from "react";
import { RegionKey } from "../../brain/LifEngine";
import { neuroglancerRegionUrl } from "../neuroglancerLinks";

const REGION_STILL: Record<RegionKey, { src: string; alt: string }> = {
  central_complex: {
    src: "/images/where-it-lives/central_complex.png",
    alt: "Central complex neuropils (EB, FB, NO, PB) in the MaleCNS brain shell",
  },
  mushroom_body: {
    src: "/images/where-it-lives/mushroom_body.png",
    alt: "Mushroom body calyx, peduncle, and lobes in the MaleCNS brain shell",
  },
  antennal_lobe: {
    src: "/images/where-it-lives/antennal_lobe.png",
    alt: "Left and right antennal lobes in the MaleCNS brain shell",
  },
};

export function WhereItLivesStill(props: {
  region: RegionKey;
  compact?: boolean;
}) {
  const { region, compact = false } = props;
  const still = REGION_STILL[region];
  const href = neuroglancerRegionUrl(region);

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title="Open this view in Neuroglancer"
      style={{
        display: "block",
        borderRadius: 6,
        overflow: "hidden",
        background: "#020305",
        border: "1px solid var(--border-subtle)",
        textDecoration: "none",
        aspectRatio: compact ? "16 / 11" : "16 / 12",
      }}
    >
      <img
        src={still.src}
        alt={still.alt}
        loading="lazy"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
          display: "block",
        }}
      />
    </a>
  );
}
