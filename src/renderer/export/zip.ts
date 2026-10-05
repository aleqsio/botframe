export interface ZipEntry {
	path: string;
	bytes: Uint8Array;
}

const LOCAL_HEADER = 0x04_03_4b_50;
const CENTRAL_HEADER = 0x02_01_4b_50;
const END_RECORD = 0x06_05_4b_50;
const VERSION = 20;
const UTF8_NAMES = 0x8_00;
const LOCAL_SIZE = 30;
const CENTRAL_SIZE = 46;
const END_SIZE = 22;
const CRC_POLYNOMIAL = 0xed_b8_83_20;

const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, index) => {
	let value = index;
	for (let bit = 0; bit < 8; bit += 1) {
		value = value & 1 ? CRC_POLYNOMIAL ^ (value >>> 1) : value >>> 1;
	}
	return value;
});

export function crc32(bytes: Uint8Array): number {
	let crc = 0xff_ff_ff_ff;
	for (const byte of bytes) {
		crc = (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
	}
	return (crc ^ 0xff_ff_ff_ff) >>> 0;
}

interface Packed {
	name: Uint8Array;
	bytes: Uint8Array;
	crc: number;
	offset: number;
}

function header(packed: Packed, central: boolean): Uint8Array {
	const size = central ? CENTRAL_SIZE : LOCAL_SIZE;
	const out = new Uint8Array(size + packed.name.length);
	const view = new DataView(out.buffer);
	const at = central ? 2 : 0;
	view.setUint32(0, central ? CENTRAL_HEADER : LOCAL_HEADER, true);
	if (central) {
		view.setUint16(4, VERSION, true);
	}
	view.setUint16(4 + at, VERSION, true);
	view.setUint16(6 + at, UTF8_NAMES, true);
	view.setUint32(14 + at, packed.crc, true);
	view.setUint32(18 + at, packed.bytes.length, true);
	view.setUint32(22 + at, packed.bytes.length, true);
	view.setUint16(26 + at, packed.name.length, true);
	if (central) {
		view.setUint32(42, packed.offset, true);
	}
	out.set(packed.name, size);
	return out;
}

function endRecord(count: number, size: number, offset: number): Uint8Array {
	const out = new Uint8Array(END_SIZE);
	const view = new DataView(out.buffer);
	view.setUint32(0, END_RECORD, true);
	view.setUint16(8, count, true);
	view.setUint16(10, count, true);
	view.setUint32(12, size, true);
	view.setUint32(16, offset, true);
	return out;
}

export function joined(parts: readonly Uint8Array[]): Uint8Array {
	const out = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
	let offset = 0;
	for (const part of parts) {
		out.set(part, offset);
		offset += part.length;
	}
	return out;
}

export function zipOf(entries: readonly ZipEntry[]): Uint8Array {
	const encoder = new TextEncoder();
	let offset = 0;
	const packed = entries.map((entry): Packed => {
		const name = encoder.encode(entry.path);
		const item = { name, bytes: entry.bytes, crc: crc32(entry.bytes), offset };
		offset += LOCAL_SIZE + name.length + entry.bytes.length;
		return item;
	});
	const local = packed.flatMap((item) => [header(item, false), item.bytes]);
	const central = packed.map((item) => header(item, true));
	const centralSize = central.reduce((total, part) => total + part.length, 0);
	return joined([...local, ...central, endRecord(packed.length, centralSize, offset)]);
}
