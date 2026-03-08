import { describe, it, expect } from "vitest";

// Test role-based redirect logic (extracted from Login.tsx)
function getRedirectPath(role: string): string {
  if (role === "student") return "/portal/student";
  if (role === "teacher") return "/portal/teacher";
  if (role === "parent") return "/portal/parent-teacher";
  if (role === "admin") return "/portal/admin";
  return "/";
}

describe("Role-Based Redirects", () => {
  it("redirects students correctly", () => {
    expect(getRedirectPath("student")).toBe("/portal/student");
  });

  it("redirects teachers correctly", () => {
    expect(getRedirectPath("teacher")).toBe("/portal/teacher");
  });

  it("redirects parents correctly", () => {
    expect(getRedirectPath("parent")).toBe("/portal/parent-teacher");
  });

  it("redirects admins correctly", () => {
    expect(getRedirectPath("admin")).toBe("/portal/admin");
  });

  it("defaults to home for unknown roles", () => {
    expect(getRedirectPath("unknown")).toBe("/");
    expect(getRedirectPath("")).toBe("/");
  });
});

describe("App Role Types", () => {
  const validRoles = ["student", "parent", "teacher", "admin"];

  it("all portal roles are accounted for", () => {
    validRoles.forEach((role) => {
      const path = getRedirectPath(role);
      expect(path).toContain("/portal/");
    });
  });
});
