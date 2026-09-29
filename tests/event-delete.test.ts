import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  permission: vi.fn(), find: vi.fn(), update: vi.fn(), audit: vi.fn(), transaction: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ getPrisma: () => ({ $transaction: mocks.transaction }) }));
vi.mock("@/server/permissions/capabilities", () => ({ hasEventCapability: mocks.permission }));
import { deleteEventWorkspace } from "@/server/services/event-delete-service";

describe("event workspace deletion", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.permission.mockResolvedValue(true);
    mocks.find.mockResolvedValue({ id: "event", organizationId: "org", state: "CONFIGURING", archivedAt: null });
    mocks.update.mockResolvedValue({ count: 1 });
    mocks.transaction.mockImplementation((fn) => fn({ event: { findUniqueOrThrow: mocks.find, updateMany: mocks.update }, auditLog: { create: mocks.audit } }));
  });
  it.each(["CONFIGURING", "CANCELLED"])("retains records and audits removal of a %s event", async (state) => {
    mocks.find.mockResolvedValue({ id: "event", organizationId: "org", state, archivedAt: null });
    await deleteEventWorkspace("event", "actor");
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "event", archivedAt: null, state: { in: ["DRAFT", "CONFIGURING", "CANCELLED"] } },
      data: { archivedAt: expect.any(Date), state: "ARCHIVED" },
    }));
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ actorUserId: "actor", action: "EVENT_DELETED" }) }));
  });
  it("rejects unauthorized users before any mutation", async () => {
    mocks.permission.mockResolvedValue(false);
    await expect(deleteEventWorkspace("event", "actor")).rejects.toThrow("Missing capability");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("does not duplicate deletion or audit on retry", async () => {
    mocks.find.mockResolvedValue({ archivedAt: new Date() });
    await deleteEventWorkspace("event", "actor");
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
  });
  it("rejects events whose state changed before deletion", async () => {
    mocks.update.mockResolvedValue({ count: 0 });
    await expect(deleteEventWorkspace("event", "actor")).rejects.toThrow("Only draft");
    expect(mocks.audit).not.toHaveBeenCalled();
  });
});
