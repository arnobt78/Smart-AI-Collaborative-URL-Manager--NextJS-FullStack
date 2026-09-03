import { ensureAbsoluteHttpUrl, parseUserEnteredUrl } from "@/lib/utils";

describe("ensureAbsoluteHttpUrl", () => {
  it("returns empty for blank input", () => {
    expect(ensureAbsoluteHttpUrl("")).toBe("");
    expect(ensureAbsoluteHttpUrl("   ")).toBe("");
  });

  it("keeps http(s) URLs", () => {
    expect(ensureAbsoluteHttpUrl("https://example.com/a")).toBe(
      "https://example.com/a",
    );
    expect(ensureAbsoluteHttpUrl("http://example.com")).toBe(
      "http://example.com",
    );
  });

  it("prefixes bare hosts with https://", () => {
    expect(ensureAbsoluteHttpUrl("example.com")).toBe("https://example.com");
  });
});

describe("parseUserEnteredUrl", () => {
  it("accepts absolute https URLs", () => {
    expect(parseUserEnteredUrl("https://example.com/path").href).toBe(
      "https://example.com/path",
    );
  });

  it("accepts bare hosts", () => {
    expect(parseUserEnteredUrl("example.com").href).toBe(
      "https://example.com/",
    );
  });

  it("rejects empty and scheme-only values", () => {
    expect(() => parseUserEnteredUrl("")).toThrow(/Empty URL|Invalid URL/);
    expect(() => parseUserEnteredUrl("https://")).toThrow(/Invalid URL|hostname/);
    expect(() => parseUserEnteredUrl("   ")).toThrow(/Empty URL|Invalid URL/);
  });
});
