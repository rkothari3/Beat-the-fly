/**
 * Shared vehicle hitbox lengths (drive-axis). Updated when MagicaVoxel kit loads
 * so trucks match mesh size; LaneWorld stays free of Three.js imports.
 */

const DEFAULT_WIDTHS = [1.0, 1.0, 2.0, 1.0, 1.0, 1.0, 2.0, 1.0];

let widths: number[] = DEFAULT_WIDTHS.slice();

export function setVehicleHitWidths(measured: number[]) {
  if (measured.length) widths = measured.slice();
}

export function vehicleHitWidth(vehicleType: number): number {
  return widths[vehicleType] ?? 1.0;
}

export function vehicleTypeCount(): number {
  return Math.max(widths.length, DEFAULT_WIDTHS.length);
}
