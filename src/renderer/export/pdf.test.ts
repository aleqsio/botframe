import { describe, expect, it } from "vitest";
import { pdfOfPixels } from "./pdf";

const PIXELS = {
	width: 2,
	height: 1,
	data: Uint8ClampedArray.of(255, 0, 0, 255, 0, 0, 255, 128),
};

function latin1(bytes: Uint8Array): string {
	return Array.from(bytes, (byte) => String.fromCodePoint(byte)).join("");
}

function objectOffsets(text: string): readonly number[] {
	return [...text.matchAll(/(?<=\n)\d+ 0 obj\n/gu)].map((match) => match.index);
}

function xrefOffsets(text: string): readonly number[] {
	return [...text.matchAll(/^(\d{10}) 00000 n $/gmu)].map((match) => Number(match[1]));
}

async function inflated(text: string, object: number): Promise<readonly number[]> {
	const start = text.indexOf("stream\n", text.indexOf(`\n${object} 0 obj\n`)) + "stream\n".length;
	const length = Number(
		/\/Length (\d+)/u.exec(text.slice(text.indexOf(`\n${object} 0 obj\n`)))?.[1],
	);
	const bytes = Uint8Array.from(
		text.slice(start, start + length),
		(char) => char.codePointAt(0) ?? 0,
	);
	const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate"));
	return [...new Uint8Array(await new Response(stream).arrayBuffer())];
}

describe("pdfOfPixels", () => {
	it("writes one page of the given size with the picture and its alpha", async () => {
		const text = latin1(await pdfOfPixels(PIXELS, { width: 300, height: 150.5 }));

		expect(text.startsWith("%PDF-1.4\n")).toBe(true);
		expect(text.endsWith("%%EOF\n")).toBe(true);
		expect(text).toContain("/MediaBox [0 0 300 150.5]");
		expect(text).toContain("/Width 2 /Height 1");
		expect(text).toContain("/ColorSpace /DeviceRGB /SMask 5 0 R");
		expect(text).toContain("q 300 0 0 150.5 0 0 cm /Im0 Do Q");
		expect(objectOffsets(text)).toHaveLength(6);
		expect(xrefOffsets(text)).toEqual(objectOffsets(text));
		expect(Number(/startxref\n(\d+)/u.exec(text)?.[1])).toBe(text.indexOf("xref\n"));
		expect(await inflated(text, 4)).toEqual([255, 0, 0, 0, 0, 255]);
		expect(await inflated(text, 5)).toEqual([255, 128]);
	});
});
