import { describe, expect, it } from "vitest";
import { circleReturn } from "../src/lib/circleReturn";

describe("circle return", () => {
  it("ignores the app sign-in token", () => {
    expect(circleReturn("", "#access_token=abc")).toBe("");
  });
  it("accepts a Google code", () => {
    expect(circleReturn("?code=abc&state=1", "")).toBe("code");
  });
});
