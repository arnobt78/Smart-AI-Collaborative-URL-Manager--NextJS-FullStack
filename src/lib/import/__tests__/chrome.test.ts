/**
 * Tests for Chrome bookmark import functionality
 */

import { parseChromeBookmarks } from "../chrome";
import type { ImportResult } from "../types";

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

beforeAll(() => {
  console.error = jest.fn();
  console.log = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
});

describe("parseChromeBookmarks", () => {
  it("should parse a valid Chrome bookmarks HTML file", () => {
    const html = `
      <!DOCTYPE NETSCAPE-Bookmark-file-1>
      <HTML>
        <BODY>
          <H1>Bookmarks</H1>
          <DL>
            <DT><H3>Bookmarks Bar</H3>
            <DL>
              <DT><A HREF="https://example.com" ADD_DATE="1234567890">Example Site</A></DT>
              <DT><A HREF="https://test.com" ADD_DATE="1234567891">Test Site</A></DT>
            </DL>
          </DL>
        </BODY>
      </HTML>
    `;

    const result = parseChromeBookmarks(html);

    expect(result.count).toBe(2);
    expect(result.items).toHaveLength(2);
    expect(result.source).toBe("Chrome Bookmarks");
    expect(result.items[0].url).toBe("https://example.com");
    expect(result.items[0].title).toBe("Example Site");
    expect(result.items[1].url).toBe("https://test.com");
    expect(result.items[1].title).toBe("Test Site");
  });

  it("should decode HTML entities in titles", () => {
    const html = `
      <!DOCTYPE NETSCAPE-Bookmark-file-1>
      <HTML>
        <BODY>
          <H1>Bookmarks</H1>
          <DL>
            <DT><A HREF="https://example.com">Test &amp; Example</A></DT>
            <DT><A HREF="https://test.com">Test&#233;</A></DT>
          </DL>
        </BODY>
      </HTML>
    `;

    const result = parseChromeBookmarks(html);

    expect(result.count).toBe(2);
    expect(result.items[0].title).toBe("Test & Example");
    // HTML entity &#233; should be decoded to é
    expect(result.items[1].title).toBe("Testé");
  });

  it("should extract folder path as category and tags", () => {
    const html = `
      <!DOCTYPE NETSCAPE-Bookmark-file-1>
      <HTML>
        <BODY>
          <H1>Bookmarks</H1>
          <DL>
            <DT><H3>Bookmarks Bar</H3>
            <DL>
              <DT><H3>Work</H3>
              <DL>
                <DT><A HREF="https://example.com">Example</A></DT>
              </DL>
            </DL>
          </DL>
        </BODY>
      </HTML>
    `;

    const result = parseChromeBookmarks(html);

    expect(result.count).toBe(1);
    // The parser finds folders in parent hierarchy - adjust expectations based on actual DOM structure
    expect(result.items[0].category).toContain("Bookmarks Bar");
    expect(result.items[0].category).toContain("Work");
    expect(result.items[0].tags).toBeDefined();
    expect(result.items[0].tags?.length).toBeGreaterThan(0);
  });

  it("should mark favorites correctly", () => {
    const html = `
      <!DOCTYPE NETSCAPE-Bookmark-file-1>
      <HTML>
        <BODY>
          <H1>Bookmarks</H1>
          <DL>
            <DT><H3>Favorites</H3>
            <DL>
              <DT><A HREF="https://example.com">Example</A></DT>
            </DL>
            <DT><H3>Bookmarks Bar</H3>
            <DL>
              <DT><A HREF="https://test.com">Test</A></DT>
            </DL>
          </DL>
        </BODY>
      </HTML>
    `;

    const result = parseChromeBookmarks(html);

    expect(result.count).toBe(2);
    // Check that at least one is marked as favorite (in Favorites folder)
    const favoritesCount = result.items.filter(item => item.isFavorite).length;
    expect(favoritesCount).toBeGreaterThan(0);
  });

  it("should handle ADD_DATE and create notes", () => {
    const html = `
      <!DOCTYPE NETSCAPE-Bookmark-file-1>
      <HTML>
        <BODY>
          <H1>Bookmarks</H1>
          <DL>
            <DT><A HREF="https://example.com" ADD_DATE="1234567890">Example</A></DT>
          </DL>
        </BODY>
      </HTML>
    `;

    const result = parseChromeBookmarks(html);

    expect(result.count).toBe(1);
    expect(result.items[0].notes).toContain("Imported from Chrome");
  });

  it("should validate URLs and skip invalid ones", () => {
    const html = `
      <!DOCTYPE NETSCAPE-Bookmark-file-1>
      <HTML>
        <BODY>
          <H1>Bookmarks</H1>
          <DL>
            <DT><A HREF="https://example.com">Valid URL</A></DT>
            <DT><A HREF="not-a-valid-url">Invalid URL</A></DT>
            <DT><A HREF="https://test.com">Another Valid URL</A></DT>
          </DL>
        </BODY>
      </HTML>
    `;

    const result = parseChromeBookmarks(html);

    // Should only parse valid URLs
    expect(result.count).toBe(2);
    expect(result.errors).toBeDefined();
    expect(result.errors?.length).toBeGreaterThan(0);
    expect(result.items[0].url).toBe("https://example.com");
    expect(result.items[1].url).toBe("https://test.com");
  });

  it("should handle empty HTML gracefully", () => {
    const html = `<!DOCTYPE NETSCAPE-Bookmark-file-1><HTML><BODY></BODY></HTML>`;

    const result = parseChromeBookmarks(html);

    expect(result.count).toBe(0);
    expect(result.items).toHaveLength(0);
    expect(result.errors).toBeDefined();
    expect(result.errors?.[0]).toContain("No bookmarks found");
  });

  it("should handle malformed HTML gracefully", () => {
    const html = `This is not valid HTML`;

    const result = parseChromeBookmarks(html);

    // Should still try to parse or return empty result
    expect(result).toBeDefined();
    expect(result.count).toBeDefined();
  });

  it("should handle bookmarks with no title", () => {
    const html = `
      <!DOCTYPE NETSCAPE-Bookmark-file-1>
      <HTML>
        <BODY>
          <H1>Bookmarks</H1>
          <DL>
            <DT><A HREF="https://example.com"></A></DT>
            <DT><A HREF="https://test.com">Has Title</A></DT>
          </DL>
        </BODY>
      </HTML>
    `;

    const result = parseChromeBookmarks(html);

    expect(result.count).toBe(2);
    expect(result.items[0].title).toBeUndefined();
    expect(result.items[1].title).toBe("Has Title");
  });

  it("should parse all 48 URLs from the actual bookmarks.html file", () => {
    // Read the actual bookmarks.html file
    const fs = require("fs");
    const path = require("path");
    const htmlPath = path.join(process.cwd(), "db-data", "bookmarks.html");
    const htmlContent = fs.readFileSync(htmlPath, "utf8");

    const result = parseChromeBookmarks(htmlContent);

    expect(result.count).toBe(48);
    expect(result.items).toHaveLength(48);
    expect(result.errors).toBeUndefined();
    
    // Verify first bookmark structure matches expected format
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        url: expect.stringMatching(/^https?:\/\//),
        title: expect.any(String),
        category: expect.stringContaining("Bookmarks Bar"),
        tags: expect.arrayContaining([expect.stringContaining("Bookmarks Bar")]),
        isFavorite: expect.any(Boolean),
        notes: expect.stringContaining("Imported from Chrome"),
      })
    );
    
    // Verify all items have valid URLs
    result.items.forEach((item) => {
      expect(item.url).toMatch(/^https?:\/\//);
      expect(item.category).toContain("Bookmarks Bar");
    });
  });

  it("should handle special characters in titles", () => {
    const html = `
      <!DOCTYPE NETSCAPE-Bookmark-file-1>
      <HTML>
        <BODY>
          <H1>Bookmarks</H1>
          <DL>
            <DT><A HREF="https://example.com">Test &lt;Special&gt; Characters</A></DT>
            <DT><A HREF="https://test.com">Another &quot;Test&quot;</A></DT>
          </DL>
        </BODY>
      </HTML>
    `;

    const result = parseChromeBookmarks(html);

    expect(result.count).toBe(2);
    // HTML entities should be decoded - titles should not contain raw entities
    expect(result.items[0].title).toBeDefined();
    expect(result.items[1].title).toBeDefined();
    expect(result.items[0].title).not.toContain("&lt;");
    expect(result.items[0].title).not.toContain("&gt;");
  });

  it("should handle nested folder structures", () => {
    const html = `
      <!DOCTYPE NETSCAPE-Bookmark-file-1>
      <HTML>
        <BODY>
          <H1>Bookmarks</H1>
          <DL>
            <DT><H3>Bookmarks Bar</H3>
            <DL>
              <DT><H3>Category 1</H3>
              <DL>
                <DT><H3>Subcategory</H3>
                <DL>
                  <DT><A HREF="https://example.com">Deep Nested</A></DT>
                </DL>
              </DL>
            </DL>
          </DL>
        </BODY>
      </HTML>
    `;

    const result = parseChromeBookmarks(html);

    expect(result.count).toBe(1);
    // Verify nested structure is captured
    expect(result.items[0].category).toBeDefined();
    expect(result.items[0].category).toContain("Bookmarks Bar");
    expect(result.items[0].category).toContain("Category 1");
    expect(result.items[0].category).toContain("Subcategory");
    expect(result.items[0].tags).toBeDefined();
    expect(result.items[0].tags?.length).toBeGreaterThanOrEqual(3);
  });
});

