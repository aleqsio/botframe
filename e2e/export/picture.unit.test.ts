import { describe, expect, it } from "vitest";
import { blankPicture, difference, fitted, largestBlob, onWhite, resized } from "./picture";
import type { Picture } from "./picture";

function gray(width: number, height: number, values: readonly number[]): Picture {
	const picture = blankPicture(width, height);
	values.forEach((value, pixel) => {
		picture.data.set([value, value, value, 255], pixel * 4);
	});
	return picture;
}

function filled(width: number, height: number, value: number): Picture {
	return gray(
		width,
		height,
		Array.from({ length: width * height }, () => value),
	);
}

function withBlock(base: Picture, size: number, value: number): Picture {
	const data = base.data.slice();
	for (let y = 0; y < size; y += 1) {
		for (let x = 0; x < size; x += 1) {
			data.set([value, value, value], ((y + 2) * base.width + x + 2) * 4);
		}
	}
	return { ...base, data };
}

describe("onWhite", () => {
	it("puts each pixel over white and makes it opaque", () => {
		const picture = blankPicture(2, 1);
		picture.data.set([255, 0, 0, 128], 4);
		expect([...onWhite(picture).data]).toEqual([255, 255, 255, 255, 255, 127, 127, 255]);
	});
});

describe("resized", () => {
	it("keeps a picture that has the size", () => {
		const picture = filled(3, 2, 10);
		expect(resized(picture, 3, 2)).toBe(picture);
	});

	it("averages each pair of pixels when it halves the width", () => {
		const half = resized(gray(4, 1, [0, 255, 0, 255]), 2, 1);
		expect([half.data[0], half.data[4]]).toEqual([128, 128]);
	});

	it("keeps the edge pixels when it doubles the size", () => {
		const double = resized(gray(2, 1, [0, 200]), 4, 2);
		expect(double.width).toBe(4);
		expect(double.height).toBe(2);
		expect([double.data[0], double.data[12], double.data[16]]).toEqual([0, 200, 0]);
	});
});

describe("fitted", () => {
	it("crops a picture that is a few pixels larger, so that it does not move", () => {
		const picture = fitted(gray(3, 2, [10, 20, 30, 40, 50, 60]), 2, 1);
		expect([picture.width, picture.height, picture.data[0], picture.data[4]]).toEqual([
			2, 1, 10, 20,
		]);
	});

	it("resizes a picture at a different scale", () => {
		expect(fitted(filled(40, 20, 9), 20, 10).width).toBe(20);
	});
});

describe("difference", () => {
	it("finds no change between equal pictures", () => {
		const found = difference(filled(8, 8, 90), filled(8, 8, 90), 0);
		expect([found.changed, found.blob]).toEqual([0, 0]);
	});

	it("ignores a change that is not more than the threshold", () => {
		expect(difference(filled(8, 8, 90), filled(8, 8, 110), 20).changed).toBe(0);
		expect(difference(filled(8, 8, 90), filled(8, 8, 111), 20).changed).toBe(1);
	});

	it("gives the eroded area of a changed block", () => {
		const base = filled(20, 20, 255);
		const found = difference(base, withBlock(base, 10, 0), 32);
		expect(found.changed).toBe(100 / 400);
		expect(found.blob).toBe(64);
	});

	it("gives no area to a changed line one pixel wide", () => {
		const mask = new Uint8Array(100);
		mask.fill(1, 40, 50);
		expect(largestBlob(mask, 10)).toBe(0);
	});

	it("refuses pictures of different sizes", () => {
		expect(() => difference(filled(2, 2, 0), filled(3, 2, 0), 0)).toThrow(/sizes differ/u);
	});
});
