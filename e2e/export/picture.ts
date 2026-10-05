export interface Picture {
	width: number;
	height: number;
	data: Uint8Array;
}

export interface Difference {
	changed: number;
	blob: number;
	mask: Uint8Array;
}

const CHANNELS = 4;
const OPAQUE = 255;
const SOLID = 2;

export function blankPicture(width: number, height: number): Picture {
	return { width, height, data: new Uint8Array(width * height * CHANNELS) };
}

export function onWhite(picture: Picture): Picture {
	const data = new Uint8Array(picture.data.length);
	for (let index = 0; index < data.length; index += CHANNELS) {
		const alpha = (picture.data[index + 3] ?? 0) / OPAQUE;
		for (let channel = 0; channel < 3; channel += 1) {
			const value = picture.data[index + channel] ?? 0;
			data[index + channel] = Math.round(value * alpha + OPAQUE * (1 - alpha));
		}
		data[index + 3] = OPAQUE;
	}
	return { ...picture, data };
}

interface Sample {
	low: number;
	high: number;
	part: number;
}

function samples(from: number, to: number): readonly Sample[] {
	return Array.from({ length: to }, (_, index) => {
		const at = Math.min(Math.max(((index + 0.5) * from) / to - 0.5, 0), from - 1);
		const low = Math.floor(at);
		return { low, high: Math.min(low + 1, from - 1), part: at - low };
	});
}

function blend(low: number, high: number, part: number): number {
	return low + (high - low) * part;
}

export function resized(picture: Picture, width: number, height: number): Picture {
	if (picture.width === width && picture.height === height) {
		return picture;
	}
	const out = blankPicture(width, height);
	const columns = samples(picture.width, width);
	const rows = samples(picture.height, height);
	const value = (x: number, y: number, channel: number): number =>
		picture.data[(y * picture.width + x) * CHANNELS + channel] ?? 0;
	rows.forEach((row, y) => {
		columns.forEach((column, x) => {
			for (let channel = 0; channel < CHANNELS; channel += 1) {
				const top = blend(
					value(column.low, row.low, channel),
					value(column.high, row.low, channel),
					column.part,
				);
				const bottom = blend(
					value(column.low, row.high, channel),
					value(column.high, row.high, channel),
					column.part,
				);
				out.data[(y * width + x) * CHANNELS + channel] = Math.round(blend(top, bottom, row.part));
			}
		});
	});
	return out;
}

function pixelDistance(first: Picture, second: Picture, pixel: number): number {
	let largest = 0;
	for (let channel = 0; channel < CHANNELS; channel += 1) {
		const at = pixel * CHANNELS + channel;
		largest = Math.max(largest, Math.abs((first.data[at] ?? 0) - (second.data[at] ?? 0)));
	}
	return largest;
}

function isInside(mask: Uint8Array, width: number, pixel: number): boolean {
	const x = pixel % width;
	const height = mask.length / width;
	const y = Math.floor(pixel / width);
	return x > 0 && y > 0 && x < width - 1 && y < height - 1;
}

function isSolid(mask: Uint8Array, width: number, pixel: number): boolean {
	if (mask[pixel] === 0 || !isInside(mask, width, pixel)) {
		return false;
	}
	const around = [-width - 1, -width, -width + 1, -1, 1, width - 1, width, width + 1];
	return around.every((step) => mask[pixel + step] !== 0);
}

function neighbours(pixel: number, width: number, size: number): readonly number[] {
	const x = pixel % width;
	return [
		x > 0 ? pixel - 1 : -1,
		x < width - 1 ? pixel + 1 : -1,
		pixel - width,
		pixel + width < size ? pixel + width : -1,
	].filter((next) => next >= 0);
}

function areaFrom(mask: Uint8Array, width: number, start: number): number {
	const stack = [start];
	mask[start] = 0;
	let area = 0;
	for (let pixel = stack.pop(); pixel !== undefined; pixel = stack.pop()) {
		area += 1;
		for (const next of neighbours(pixel, width, mask.length)) {
			if (mask[next] === SOLID) {
				mask[next] = 0;
				stack.push(next);
			}
		}
	}
	return area;
}

export function largestBlob(mask: Uint8Array, width: number): number {
	const solid = mask.map((_, pixel) => (isSolid(mask, width, pixel) ? SOLID : 0));
	let largest = 0;
	solid.forEach((value, pixel) => {
		if (value === SOLID) {
			largest = Math.max(largest, areaFrom(solid, width, pixel));
		}
	});
	return largest;
}

export function difference(first: Picture, second: Picture, threshold: number): Difference {
	if (first.width !== second.width || first.height !== second.height) {
		throw new Error(
			`The sizes differ: ${first.width}×${first.height}, ${second.width}×${second.height}.`,
		);
	}
	const size = first.width * first.height;
	const mask = new Uint8Array(size);
	let count = 0;
	for (let pixel = 0; pixel < size; pixel += 1) {
		if (pixelDistance(first, second, pixel) > threshold) {
			mask[pixel] = 1;
			count += 1;
		}
	}
	return { changed: count / size, blob: largestBlob(mask, first.width), mask };
}

const FADED = 0.25;
const SOLID_MARK = [255, 0, 0];

export function differencePicture(reference: Picture, found: Difference): Picture {
	const out = blankPicture(reference.width, reference.height);
	found.mask.forEach((changed, pixel) => {
		const at = pixel * CHANNELS;
		for (let channel = 0; channel < 3; channel += 1) {
			const faded = OPAQUE - (OPAQUE - (reference.data[at + channel] ?? 0)) * FADED;
			out.data[at + channel] = changed === 0 ? Math.round(faded) : (SOLID_MARK[channel] ?? 0);
		}
		out.data[at + 3] = OPAQUE;
	});
	return out;
}
