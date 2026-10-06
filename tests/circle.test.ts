import { describe, expect, it } from "vitest";
import { circleKey, circleReady } from "../src/lib/circle";

describe("circle wallet start", () => {
  it("uses the test key when that is the name stored", () => {
    expect(circleKey({ TEST_API_KEY: "TEST_API_KEY:abc" })).toBe("TEST_API_KEY:abc");
  });
  it("does not claim a wallet without a key", () => {
    expect(circleReady(undefined, "app")).toBe(false);
  });
});
