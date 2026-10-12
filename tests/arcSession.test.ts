import { describe, expect, it } from "vitest";

describe("arc session", () => {
  it("treats a missing token or wallet id as unable to sign", async () => {
    const { arcCanSign } = await import("../src/lib/arcSession");
    expect(arcCanSign()).toBe(false);
  });
});
