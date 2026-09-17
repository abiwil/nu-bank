import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./auth";

describe("hashPassword / verifyPassword", () => {
  it("hashes a password to a bcrypt hash distinct from the plaintext", async () => {
    const hash = await hashPassword("correcthorsebatterystaple");
    expect(hash).not.toBe("correcthorsebatterystaple");
    expect(hash).toMatch(/^\$2[aby]\$/);
  });

  it("verifies a matching password against its hash", async () => {
    const hash = await hashPassword("correcthorsebatterystaple");
    await expect(
      verifyPassword("correcthorsebatterystaple", hash),
    ).resolves.toBe(true);
  });

  it("rejects a non-matching password", async () => {
    const hash = await hashPassword("correcthorsebatterystaple");
    await expect(verifyPassword("wrongpassword", hash)).resolves.toBe(false);
  });
});
