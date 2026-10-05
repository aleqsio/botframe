import { crc32, deflateSync } from "node:zlib";
import { blankPicture } from "./picture";
import type { Picture } from "./picture";

const SIGNATURE = Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
const BIT_DEPTH = 8;
const RGBA = 6;
const CHANNELS = 4;

function chunk(type: string, body: Uint8Array): Buffer {
	const head = Buffer.alloc(8);
	head.writeUInt32BE(body.length, 0);
	head.write(type, 4, "ascii");
	const tail = Buffer.alloc(4);
	tail.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), body])), 0);
	return Buffer.concat([head, body, tail]);
}

export function pngOf(picture: Picture): Buffer {
	const header = Buffer.alloc(13);
	header.writeUInt32BE(picture.width, 0);
	header.writeUInt32BE(picture.height, 4);
	header.writeUInt8(BIT_DEPTH, 8);
	header.writeUInt8(RGBA, 9);
	const row = picture.width * CHANNELS;
	const lines = Buffer.alloc((row + 1) * picture.height);
	for (let y = 0; y < picture.height; y += 1) {
		lines.set(picture.data.subarray(y * row, (y + 1) * row), y * (row + 1) + 1);
	}
	return Buffer.concat([
		SIGNATURE,
		chunk("IHDR", header),
		chunk("IDAT", deflateSync(lines)),
		chunk("IEND", new Uint8Array(0)),
	]);
}

const PATTERN = { width: 96, height: 64, cell: 16 };

export function patternPng(): Buffer {
	const { width, height, cell } = PATTERN;
	const picture = blankPicture(width, height);
	for (let pixel = 0; pixel < width * height; pixel += 1) {
		const x = pixel % width;
		const y = Math.floor(pixel / width);
		const check = (Math.floor(x / cell) + Math.floor(y / cell)) % 2;
		picture.data.set(
			[Math.round((x / width) * 255), check * 200, Math.round((y / height) * 255), 255],
			pixel * CHANNELS,
		);
	}
	return pngOf(picture);
}
