const mockCookies = jest.fn();
const mockPrisma = {
  session: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
  },
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
};

jest.mock("next/headers", () => ({ cookies: mockCookies }));
jest.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

describe("REQ-0025 digest-backed cookie sessions", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.spyOn(Math, "random").mockReturnValue(0.9);
    mockPrisma.session.findMany.mockResolvedValue([]);
    mockPrisma.session.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.session.update.mockResolvedValue(undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it("persists a SHA-256 digest while returning only the opaque cookie token", async () => {
    const { createSession, hashSessionToken } = await import("@/lib/auth");
    mockPrisma.session.create.mockResolvedValue({});

    const token = await createSession("user-1");

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(mockPrisma.session.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ userId: "user-1", token: hashSessionToken(token) }),
    }));
    expect(mockPrisma.session.create.mock.calls[0][0].data.token).not.toBe(token);
  });

  it("looks up an existing digest without falling back to plaintext", async () => {
    const token = "legacy-compatible-cookie-token";
    const { getCurrentSession, hashSessionToken } = await import("@/lib/auth");
    mockCookies.mockResolvedValue({ get: () => ({ value: token }) });
    const session = {
      id: "session-1",
      token: hashSessionToken(token),
      userId: "user-1",
      expiresAt: new Date(Date.now() + 60_000),
      user: { id: "user-1", email: "user@example.com" },
    };
    mockPrisma.session.findUnique.mockResolvedValueOnce(session);

    await expect(getCurrentSession()).resolves.toMatchObject({ id: "session-1" });
    expect(mockPrisma.session.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { token: hashSessionToken(token) },
    }));
    expect(mockPrisma.session.findUnique).toHaveBeenCalledTimes(1);
  });

  it("rotates a valid legacy plaintext record in place", async () => {
    const token = "legacy-plaintext-cookie-token";
    const { getCurrentSession, hashSessionToken } = await import("@/lib/auth");
    mockCookies.mockResolvedValue({ get: () => ({ value: token }) });
    const legacy = {
      id: "session-legacy",
      token,
      userId: "user-1",
      expiresAt: new Date(Date.now() + 60_000),
      user: { id: "user-1", email: "user@example.com" },
    };
    const rotated = { ...legacy, token: hashSessionToken(token) };
    mockPrisma.session.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(legacy);
    mockPrisma.session.update.mockResolvedValueOnce(rotated).mockResolvedValueOnce(undefined);

    await expect(getCurrentSession()).resolves.toMatchObject({ id: legacy.id, token: rotated.token });
    expect(mockPrisma.session.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: legacy.id },
      data: { token: hashSessionToken(token) },
    }));
  });

  it("uses the concurrent digest record when legacy rotation conflicts", async () => {
    const token = "legacy-race-cookie-token";
    const { getCurrentSession, hashSessionToken } = await import("@/lib/auth");
    mockCookies.mockResolvedValue({ get: () => ({ value: token }) });
    const legacy = {
      id: "session-legacy",
      token,
      userId: "user-1",
      expiresAt: new Date(Date.now() + 60_000),
      user: { id: "user-1", email: "user@example.com" },
    };
    const rotated = { ...legacy, token: hashSessionToken(token) };
    mockPrisma.session.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(legacy)
      .mockResolvedValueOnce(rotated);
    mockPrisma.session.update.mockRejectedValueOnce(new Error("Unique constraint"));

    await expect(getCurrentSession()).resolves.toMatchObject({
      id: legacy.id,
      token: rotated.token,
    });
  });

  it("removes both token representations during transition logout", async () => {
    const { deleteSession, hashSessionToken } = await import("@/lib/auth");

    await deleteSession("cookie-token");

    expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({
      where: { token: { in: ["cookie-token", hashSessionToken("cookie-token")] } },
    });
  });
});
