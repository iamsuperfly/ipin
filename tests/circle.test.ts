import { describe, expect, it } from "vitest";
import { circleHost, circleKey, circleReady, socialTokenBody } from "../src/lib/circle";

describe("circle session", () => {
  it("reads either env name", () => {
    expect(circleKey({ CIRCLE_API_KEY: "TEST_API_KEY:abc" })).toBe("TEST_API_KEY:abc");
    expect(circleKey({ TEST_API_KEY: "TEST_API_KEY:def" })).toBe("TEST_API_KEY:def");
  });
  it("sends a test key to Circle's wallet API", () => {
    expect(circleHost("TEST_API_KEY:abc")).toBe("https://api.circle.com");
  });
  it("does not start without a key", () => {
    expect(circleReady("", "app")).toBe(false);
  });
  it("sends the device id Circle binds the token to", () => {
    expect(socialTokenBody("device-1", "key-1")).toEqual({
      deviceId: "device-1",
      idempotencyKey: "key-1",
    });
  });
});
