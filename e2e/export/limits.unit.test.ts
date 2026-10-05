import { describe, expect, it } from "vitest";
import { MAX_BLOB, OPTIONS, problemsOf } from "./limits";

const BY_ID = new Map(OPTIONS.map((held) => [held.id, held]));

function option(id: string): (typeof OPTIONS)[number] {
	const found = BY_ID.get(id);
	if (found === undefined) {
		throw new Error(`No option ${id}`);
	}
	return found;
}

describe("the limit table", () => {
	it("has each export option once", () => {
		expect([...BY_ID.keys()]).toEqual([
			"png@2",
			"png@1",
			"png@0.5",
			"jpg",
			"svg",
			"pdf",
			"pdf-quartz",
			"html",
			"zip",
		]);
	});

	it("is strictest for a PNG at the reference scale", () => {
		const strictest = Math.min(...OPTIONS.map((held) => held.changed));
		expect(option("png@2").changed).toBe(strictest);
		expect(option("jpg").threshold).toBeGreaterThan(option("png@2").threshold);
		expect(option("pdf").changed).toBeGreaterThan(option("png@2").changed);
	});

	it("passes a change inside the limits", () => {
		expect(problemsOf(option("pdf"), { changed: 0.01, blob: 10 })).toEqual([]);
	});

	it("fails a share of changed pixels over the limit of the format", () => {
		expect(problemsOf(option("png@2"), { changed: 0.01, blob: 0 })).toEqual([
			"1.00% of the pixels changed; the limit is 0.20%",
		]);
	});

	it("fails a large changed area at each format", () => {
		for (const held of OPTIONS) {
			expect(problemsOf(held, { changed: 0, blob: MAX_BLOB + 1 })).toHaveLength(1);
		}
	});
});
