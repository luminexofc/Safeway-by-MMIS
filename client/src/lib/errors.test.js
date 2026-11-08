import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { friendlyError } from "./errors.js";

// The mapper is the only thing between users and exception text, so every
// branch here is a user-facing guarantee: known codes map to plain sentences.

describe("friendlyError", () => {
  it("maps wrong credentials to a plain sentence", () => {
    assert.equal(
      friendlyError({ code: 401, message: "Invalid credentials" }),
      "Wrong email or password. Check your details and try again."
    );
  });

  it("maps duplicate account to sign-in guidance", () => {
    assert.equal(
      friendlyError({ code: 409, message: "A user with the same email already exists" }),
      "An account with this email already exists. Try signing in instead."
    );
  });

  it("maps a short password to the length rule", () => {
    assert.equal(
      friendlyError({ message: "Invalid `password` param: Password must be at least 8 characters long" }),
      "Your password is too short. Use at least 8 characters."
    );
  });

  it("maps rate limiting to a pause message", () => {
    assert.equal(
      friendlyError({ code: 429, message: "Rate limit exceeded" }),
      "Too many attempts. Please wait a little and try again."
    );
  });

  it("passes through our own function sentences untouched", () => {
    assert.equal(
      friendlyError(new Error("Sign in to file a report.")),
      "Sign in to file a report."
    );
  });

  it("falls back safely for unknown technical errors", () => {
    assert.equal(
      friendlyError({ code: "general_argument_invalid", message: "Invalid `userId` param: Value must be 36 chars" }),
      "Something went wrong. Please try again."
    );
  });

  it("maps a failed fetch to an offline sentence", () => {
    assert.equal(
      friendlyError(new TypeError("Failed to fetch")),
      "You're offline. Check your connection and try again."
    );
  });

  it("handles nullish input", () => {
    assert.equal(friendlyError(null), "Something went wrong. Please try again.");
    assert.equal(friendlyError(undefined, "Custom fallback."), "Custom fallback.");
  });
});
