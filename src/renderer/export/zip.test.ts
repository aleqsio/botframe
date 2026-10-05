import { describe, expect, it } from "vitest";
import { crc32, zipOf } from "./zip";

describe("zipOf", () => {
	it("gives the standard CRC-32", () => {
		expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcb_f4_39_26);
	});

	it("writes stored entries with a central directory", () => {
		const bytes = new TextEncoder().encode("hello");
		const zip = zipOf([{ path: "a.txt", bytes }]);
		const view = new DataView(zip.buffer);
		expect(view.getUint32(0, true)).toBe(0x04_03_4b_50);
		expect(new TextDecoder().decode(zip.subarray(30, 35))).toBe("a.txt");
		expect(new TextDecoder().decode(zip.subarray(35, 40))).toBe("hello");
		const end = zip.length - 22;
		expect(view.getUint32(end, true)).toBe(0x06_05_4b_50);
		expect(view.getUint16(end + 10, true)).toBe(1);
		expect(view.getUint32(view.getUint32(end + 16, true), true)).toBe(0x02_01_4b_50);
	});
});
