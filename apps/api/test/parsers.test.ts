import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import path from "node:path";
import { parseLinkedInHtml } from "../src/scrapers/linkedin";
import { parseInstagramHtml } from "../src/scrapers/instagram";
import { InvalidUrlError, normalizeInstagram, normalizeLinkedIn } from "../src/scrapers/normalize";

const fx = (f: string) => path.join(import.meta.dir, "../../../data/raw/fixtures", f);

describe("normalize", () => {
  test("linkedin", () => {
    expect(normalizeLinkedIn("linkedin.com/in/Warikoo/?trk=x")).toBe("https://www.linkedin.com/in/warikoo");
    expect(() => normalizeLinkedIn("https://linkedin.com/company/x")).toThrow(InvalidUrlError);
    expect(() => normalizeLinkedIn("not a url at all")).toThrow(InvalidUrlError);
  });
  test("instagram", () => {
    expect(normalizeInstagram("https://www.instagram.com/NatGeo/?hl=en")).toBe("natgeo");
    expect(normalizeInstagram("@natgeo")).toBe("natgeo");
    expect(() => normalizeInstagram("https://instagram.com/p/abc123")).toThrow(InvalidUrlError);
  });
});

describe.skipIf(!existsSync(fx("linkedin-gates.html")))("linkedin parser", () => {
  test("extracts person + posts from JSON-LD", async () => {
    const d = parseLinkedInHtml(await Bun.file(fx("linkedin-gates.html")).text())!;
    expect(d.name).toBe("Bill Gates");
    expect(d.experience.length).toBeGreaterThan(0);
    expect(d.posts.length).toBeGreaterThan(0);
  });
});

describe.skipIf(!existsSync(fx("instagram-natgeo.html")))("instagram parser", () => {
  test("extracts bio, counts, captions", async () => {
    const d = parseInstagramHtml(await Bun.file(fx("instagram-natgeo.html")).text(), "natgeo")!;
    expect(d.bio).toBeTruthy();
    expect(d.isPrivate).toBe(false);
    expect(d.followers).toBeGreaterThan(1e6);
    expect(d.captions.length).toBeGreaterThan(0);
  });
});
