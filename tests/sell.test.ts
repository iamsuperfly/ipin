import { describe, expect, it } from "vitest";
import { sellStep } from "../src/lib/sell";

describe("sell is one action when a route exists", () => {
  it("funds when the cash is already USDC on Arc", () => {
    expect(sellStep("USDC", "arc")).toBe("fund");
  });
  it("sells USDC from a routed chain into Arc", () => {
    expect(sellStep("USDC", "base")).toBe("sell");
    expect(sellStep("USDC", "eth")).toBe("sell");
  });
  it("stops when there is no route", () => {
    expect(sellStep("ETH", "base")).toBe("no-route");
  });
});
