/** @jest-environment node */

import { NextRequest } from "next/server";
import { POST } from "../route";
import { resolveAuthorizedList } from "@/lib/list-route-access";
import { updateList } from "@/lib/db";

jest.mock("@/lib/list-route-access", () => ({ resolveAuthorizedList: jest.fn() }));
jest.mock("@/lib/db", () => ({ updateList: jest.fn() }));

const params = Promise.resolve({ id: "123e4567-e89b-12d3-a456-426614174000" });

describe("POST /api/lists/[id]/views", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rejects a missing session through the shared list-access guard", async () => {
    jest.mocked(resolveAuthorizedList).mockResolvedValue({ ok: false, status: 401, error: "Unauthorized" });

    const response = await POST(new NextRequest("http://localhost/api/lists/123e4567-e89b-12d3-a456-426614174000/views", { method: "POST" }), { params });

    expect(response.status).toBe(401);
    expect(updateList).not.toHaveBeenCalled();
  });
});
