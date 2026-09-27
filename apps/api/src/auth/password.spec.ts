import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  // bcrypt at cost 12 takes about a quarter of a second, and these tests hash
  // several times. That slowness is the feature — see the comment in
  // password.ts — so the timeout is raised in vitest.config.ts rather than the
  // cost being lowered here.

  it("verifies a correct password", async () => {
    const hash = await hashPassword("a-reasonably-long-passphrase");
    await expect(verifyPassword("a-reasonably-long-passphrase", hash)).resolves.toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("a-reasonably-long-passphrase");
    await expect(verifyPassword("something-else-entirely", hash)).resolves.toBe(false);
  });

  it("produces a different hash each time", async () => {
    // bcrypt salts every hash. Two identical passwords hashing to the same
    // string would mean the salt is missing, and a stolen table could be
    // attacked once for every user at a time.
    const [a, b] = await Promise.all([hashPassword("same-password-twice"), hashPassword("same-password-twice")]);
    expect(a).not.toBe(b);
    await expect(verifyPassword("same-password-twice", a)).resolves.toBe(true);
    await expect(verifyPassword("same-password-twice", b)).resolves.toBe(true);
  });

  it("does not store the password in the hash", () => {
    return hashPassword("correct-horse-battery").then((hash) => {
      expect(hash).not.toContain("correct-horse-battery");
      expect(hash.startsWith("$2")).toBe(true);
    });
  });
});
