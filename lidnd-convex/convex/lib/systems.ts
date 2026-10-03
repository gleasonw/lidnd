// Shared by Convex functions and the client.
export const SYSTEMS = {
  drawSteel: { label: "Draw Steel", maxLevel: 10 },
  dnd5e: { label: "D&D 5e (2024)", maxLevel: 20 },
} as const;

export type GameSystem = keyof typeof SYSTEMS;
