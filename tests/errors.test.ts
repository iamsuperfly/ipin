import { describe, expect, it } from "vitest";
import { writeErrorText } from "../src/lib/errors";

describe("writeErrorText", () => {
  it("prefers shortMessage", () => {
    expect(writeErrorText({ shortMessage: "already paid", message: "long" })).toBe("already paid");
  });
  it("falls back to message", () => {
    expect(writeErrorText({ message: "failed" })).toBe("failed");
  });
});
