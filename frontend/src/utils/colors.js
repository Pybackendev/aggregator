// Deterministic color per skill name, so the same skill always gets the same badge color.
const PALETTE = [
  { bg: "rgba(91, 124, 250, 0.15)", fg: "#a9bcff" },   // blue
  { bg: "rgba(126, 231, 168, 0.15)", fg: "#7ee7a8" },  // green
  { bg: "rgba(255, 184, 108, 0.15)", fg: "#ffb86c" },  // orange
  { bg: "rgba(255, 121, 198, 0.15)", fg: "#ff79c6" },  // pink
  { bg: "rgba(189, 147, 249, 0.15)", fg: "#bd93f9" },  // purple
  { bg: "rgba(139, 233, 253, 0.15)", fg: "#8be9fd" },  // cyan
  { bg: "rgba(255, 121, 121, 0.15)", fg: "#ff7979" },  // red
];

export function colorForSkill(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}
