export type SellStep = "fund" | "sell" | "no-route";

export function sellStep(asset: string, chain: string): SellStep {
  if (asset === "USDC" && chain === "arc") return "fund";
  if (asset === "USDC" && (chain === "base" || chain === "eth")) return "sell";
  return "no-route";
}
