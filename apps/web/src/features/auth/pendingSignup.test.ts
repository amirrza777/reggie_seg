import { beforeEach, expect, it } from "vitest";
import {
  clearPendingSignup,
  PENDING_SIGNUP_STORAGE_KEY,
  readPendingSignup,
  savePendingSignup,
} from "./pendingSignup";

beforeEach(() => {
  window.sessionStorage.clear();
});

it("saves and reads pending signup payload", () => {
  savePendingSignup({
    email: "student@example.com",
    password: "secret-123",
    firstName: "Ada",
    lastName: "Lovelace",
  });

  expect(readPendingSignup()).toEqual({
    email: "student@example.com",
    password: "secret-123",
    firstName: "Ada",
    lastName: "Lovelace",
  });
});

it("returns null for invalid payload JSON", () => {
  window.sessionStorage.setItem(PENDING_SIGNUP_STORAGE_KEY, "{invalid");
  expect(readPendingSignup()).toBeNull();
});

it("returns null for non-object or incomplete payload", () => {
  window.sessionStorage.setItem(PENDING_SIGNUP_STORAGE_KEY, "null");
  expect(readPendingSignup()).toBeNull();

  window.sessionStorage.setItem(PENDING_SIGNUP_STORAGE_KEY, JSON.stringify({ email: "x@y.com" }));
  expect(readPendingSignup()).toBeNull();
});

it("normalizes non-string optional names to undefined", () => {
  window.sessionStorage.setItem(
    PENDING_SIGNUP_STORAGE_KEY,
    JSON.stringify({ email: "x@y.com", password: "pw", firstName: 123, lastName: false }),
  );
  expect(readPendingSignup()).toEqual({ email: "x@y.com", password: "pw", firstName: undefined, lastName: undefined });
});

it("clears pending signup payload", () => {
  savePendingSignup({ email: "a@b.com", password: "pw" });
  clearPendingSignup();
  expect(readPendingSignup()).toBeNull();
});