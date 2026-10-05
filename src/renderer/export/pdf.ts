import type { PageSize } from "../../shared/exportFile";
import { joined } from "./zip";

export interface Pixels {
	width: number;
	height: number;
	data: Uint8ClampedArray;
}

interface PdfImage {
	width: number;
	height: number;
	rgb: Uint8Array;
	alpha: Uint8Array;
}

const encoder = new TextEncoder();
const BINARY_MARK = [0xe2, 0xe3, 0xcf, 0xd3, 0x0a];
const HEADER = Uint8Array.of(...encoder.encode("%PDF-1.4\n%"), ...BINARY_MARK);

function text(value: string): Uint8Array {
	return encoder.encode(value);
}

function numberText(value: number): string {
	return String(Math.round(value * 100) / 100);
}

function stream(dictionary: string, bytes: Uint8Array): readonly Uint8Array[] {
	return [
		text(`<< ${dictionary} /Length ${bytes.length} >>\nstream\n`),
		bytes,
		text("\nendstream"),
	];
}

function bodiesOf(page: PageSize, image: PdfImage): readonly (readonly Uint8Array[])[] {
	const width = numberText(page.width);
	const height = numberText(page.height);
	const raster = `/Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /BitsPerComponent 8 /Filter /FlateDecode`;
	return [
		[text("<< /Type /Catalog /Pages 2 0 R >>")],
		[text("<< /Type /Pages /Kids [3 0 R] /Count 1 >>")],
		[
			text(
				`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 6 0 R >>`,
			),
		],
		stream(`${raster} /ColorSpace /DeviceRGB /SMask 5 0 R`, image.rgb),
		stream(`${raster} /ColorSpace /DeviceGray`, image.alpha),
		stream("", text(`q ${width} 0 0 ${height} 0 0 cm /Im0 Do Q`)),
	];
}

function lengthOf(parts: readonly Uint8Array[]): number {
	return parts.reduce((total, part) => total + part.length, 0);
}

function xrefOf(offsets: readonly number[], start: number): Uint8Array {
	const count = offsets.length + 1;
	const entries = offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`);
	return text(
		[
			`xref\n0 ${count}\n`,
			"0000000000 65535 f \n",
			...entries,
			`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`,
		].join(""),
	);
}

function pdfOf(page: PageSize, image: PdfImage): Uint8Array {
	const objects = bodiesOf(page, image).map((body, index) =>
		[text(`${index + 1} 0 obj\n`)].concat(body, text("\nendobj\n")),
	);
	const offsets: number[] = [];
	let offset = HEADER.length;
	for (const object of objects) {
		offsets.push(offset);
		offset += lengthOf(object);
	}
	return joined([HEADER, ...objects.flat(), xrefOf(offsets, offset)]);
}

async function deflated(bytes: Uint8Array): Promise<Uint8Array> {
	const compressed = new Blob([bytes.slice()])
		.stream()
		.pipeThrough(new CompressionStream("deflate"));
	return new Uint8Array(await new Response(compressed).arrayBuffer());
}

function channelsOf(pixels: Pixels): { rgb: Uint8Array; alpha: Uint8Array } {
	const count = pixels.width * pixels.height;
	const rgb = new Uint8Array(count * 3);
	const alpha = new Uint8Array(count);
	const { data } = pixels;
	for (let index = 0; index < count; index += 1) {
		rgb[index * 3] = data[index * 4] ?? 0;
		rgb[index * 3 + 1] = data[index * 4 + 1] ?? 0;
		rgb[index * 3 + 2] = data[index * 4 + 2] ?? 0;
		alpha[index] = data[index * 4 + 3] ?? 0;
	}
	return { rgb, alpha };
}

export async function pdfOfPixels(pixels: Pixels, page: PageSize): Promise<Uint8Array> {
	const channels = channelsOf(pixels);
	const [rgb, alpha] = await Promise.all([deflated(channels.rgb), deflated(channels.alpha)]);
	return pdfOf(page, { width: pixels.width, height: pixels.height, rgb, alpha });
}
