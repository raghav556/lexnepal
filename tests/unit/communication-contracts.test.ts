import { describe, expect, it } from "vitest";
import {
  emailSendSchema,
  messageCreateSchema,
  messageListSchema,
} from "../../src/shared/contracts/communication";

describe("Communication input contracts", () => {
  it("validates message list and create", () => {
    expect(
      messageListSchema.safeParse({
        caseId: "123e4567-e89b-12d3-a456-426614174000",
      }).success,
    ).toBe(true);
    expect(
      messageCreateSchema.safeParse({
        caseId: "123e4567-e89b-12d3-a456-426614174000",
        content: "Hello",
        isInternal: false,
      }).success,
    ).toBe(true);
    expect(
      messageCreateSchema.safeParse({
        caseId: "123e4567-e89b-12d3-a456-426614174000",
        content: "",
      }).success,
    ).toBe(false);
  });

  it("validates email send payload", () => {
    expect(
      emailSendSchema.safeParse({
        to: "client@example.com",
        subject: "Invoice",
        body: "Please pay",
      }).success,
    ).toBe(true);
    expect(
      emailSendSchema.safeParse({
        to: "not-an-email",
        subject: "Invoice",
        body: "Please pay",
      }).success,
    ).toBe(false);
  });
});
