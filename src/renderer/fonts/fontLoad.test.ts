import { afterEach, describe, expect, it, vi } from "vitest";
import { DesignDocument } from "../../document/document";
import { ensureFont } from "./fontLoad";

const LOBSTER_CSS = `@font-face {
  font-family: 'Lobster';
  font-style: normal;
  font-weight: 400;
  src: url(https://fonts.gstatic.com/lobster.woff2) format('woff2');
  unicode-range: U+0000-00FF;
}`;

function respond(body: BodyInit): Promise<Response> {
	return Promise.resolve(new Response(body, { status: 200 }));
}

function urlOf(input: RequestInfo | URL | undefined): string {
	return input instanceof Request ? input.url : (input?.toString() ?? "");
}

function answer(input: RequestInfo | URL): Promise<Response> {
	return urlOf(input).includes("css2") ? respond(LOBSTER_CSS) : respond(new Uint8Array([7, 7, 7]));
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("ensureFont", () => {
	it("puts the Inter files that the application ships in the document, with no network", async () => {
		const doc = DesignDocument.create();
		const fetch = vi.fn<typeof globalThis.fetch>();
		vi.stubGlobal("fetch", fetch);

		expect(await ensureFont(doc, { family: "Inter", italic: true, weight: 650 })).toBe(true);

		expect(doc.fonts.covers("Inter", true, 650)).toBe(true);
		expect(doc.fonts.faces()).toHaveLength(14);
		expect(fetch).not.toHaveBeenCalled();
	});

	it("downloads a Google font once, and gives it from the document after that", async () => {
		const doc = DesignDocument.create();
		const fetch = vi.fn<typeof globalThis.fetch>(answer);
		vi.stubGlobal("fetch", fetch);

		expect(await ensureFont(doc, { family: "Lobster", italic: true, weight: 700 })).toBe(true);
		expect(await ensureFont(doc, { family: "Lobster", italic: true, weight: 700 })).toBe(true);

		expect(doc.fonts.covers("Lobster", false, 400)).toBe(true);
		expect(fetch).toHaveBeenCalledTimes(2);
		expect(urlOf(fetch.mock.calls[0]?.[0])).toBe(
			"https://fonts.googleapis.com/css2?family=Lobster:ital,wght@0,400",
		);
	});

	it("gives false for a family that Google Fonts does not have", async () => {
		const doc = DesignDocument.create();
		vi.stubGlobal("fetch", vi.fn<typeof globalThis.fetch>());

		expect(await ensureFont(doc, { family: "No Such Font", italic: false, weight: 400 })).toBe(
			false,
		);
	});
});
