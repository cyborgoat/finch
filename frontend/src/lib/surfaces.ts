export type SurfaceVariant = "card" | "embedded"

export function waveformContainerClass(variant: SurfaceVariant) {
  return variant === "embedded" ? "surface-inset" : "border border-border bg-muted/30"
}
