import { describe, expect, it } from "vitest";
import { circleReady, socialTokenBody } from "../src/lib/circle";

describe("circle session", () => {
  it("does not start without the server key and app id", () => {
    expect(circleReady(undefined, "app")).toBe(false);
    expect(circleReady("key", undefined)).toBe(false);
  });
  it("sends the device id Circle binds the token to", () => {
    expect(socialTokenBody("device-1", "key-1")).toEqual({
      deviceId: "device-1",
      idempotencyKey: "key-1",
    });
  });
});
