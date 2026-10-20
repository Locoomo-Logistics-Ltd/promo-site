export const LOCOOMO_URL = "https://locoomo.com";
export const LOCOOMO_HOST = "locoomo.com";

/** Christmas Shopping Fund reward tiers. The admin picks one of these amounts when a station goes live. */
export const REWARD_TIERS = [
  { label: "First 15", slots: 15, amount: 50000 },
  { label: "Next 100", slots: 100, amount: 20000 },
  { label: "Next 150", slots: 150, amount: 15000 },
] as const;

export const REWARD_AMOUNTS: number[] = REWARD_TIERS.map((t) => t.amount);

/** Pickup Station partners that can't be nominated (already covered, or too slow to onboard). */
export const NOT_NOMINATABLE = ["Bokku", "Jendor", "Blenco"];
