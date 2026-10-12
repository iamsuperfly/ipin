import { describe, expect, it } from "vitest";
import { arcCanSign, setPending, takePending } from "../src/lib/arcSession";

describe("arc session", () => {
  it("treats a missing token or wallet id as unable to sign", () => {
    expect(arcCanSign()).toBe(false);
  });

  it("stores and clears a pending send", () => {
    setPending({ kind: "withdraw", to: "0x1", amount: "1" });
    expect(takePending()).toEqual({ kind: "withdraw", to: "0x1", amount: "1" });
    expect(takePending()).toBeNull();
  });
});
