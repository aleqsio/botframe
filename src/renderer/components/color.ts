export interface Rgba {
	r: number;
	g: number;
	b: number;
	a: number;
}

export interface Hsva {
	h: number;
	s: number;
	v: number;
	a: number;
}

const HEX_TEXT = /^#([0-9a-f]+)$/iu;
const RGB_TEXT = /^rgba?\(([^)]+)\)$/iu;
const PARTS = /[\s,/]+/u;
const HEX_SIZES: ReadonlySet<number> = new Set([3, 4, 6, 8]);
const CHANNEL_MAX = 255;
const HEX_BASE = 16;
const HEX_DIGITS = 2;
const SECTOR = 60;
const SECTORS = 6;
const SHORT_HEX = 4;
const EACH_DIGIT = /./gu;

export const BLACK: Rgba = { r: 0, g: 0, b: 0, a: 1 };

function expanded(digits: string): string {
	return digits.length > SHORT_HEX ? digits : digits.replace(EACH_DIGIT, (digit) => digit + digit);
}

function hexColor(digits: string): Rgba | null {
	if (!HEX_SIZES.has(digits.length)) {
		return null;
	}
	const full = expanded(digits);
	const at = (index: number): number =>
		Number.parseInt(full.slice(index * HEX_DIGITS, (index + 1) * HEX_DIGITS), HEX_BASE);
	const alpha = at(3);
	return { r: at(0), g: at(1), b: at(2), a: Number.isNaN(alpha) ? 1 : alpha / CHANNEL_MAX };
}

function rgbColor(body: string): Rgba | null {
	const parts = body
		.split(PARTS)
		.filter((part) => part !== "")
		.map(Number);
	const [r, g, b, a = 1] = parts;
	if (r === undefined || g === undefined || b === undefined) {
		return null;
	}
	if (![r, g, b, a].every((part) => Number.isFinite(part))) {
		return null;
	}
	return { r: Math.round(r), g: Math.round(g), b: Math.round(b), a };
}

export function parseColor(text: string): Rgba | null {
	const trimmed = text.trim();
	const digits = HEX_TEXT.exec(trimmed)?.[1];
	if (digits !== undefined) {
		return hexColor(digits);
	}
	const body = RGB_TEXT.exec(trimmed)?.[1];
	return body === undefined ? null : rgbColor(body);
}

function hexOf(value: number): string {
	return Math.round(Math.min(Math.max(value, 0), CHANNEL_MAX))
		.toString(HEX_BASE)
		.padStart(HEX_DIGITS, "0");
}

export function formatColor(color: Rgba): string {
	const solid = `#${hexOf(color.r)}${hexOf(color.g)}${hexOf(color.b)}`;
	return color.a >= 1 ? solid : `${solid}${hexOf(color.a * CHANNEL_MAX)}`;
}

function hueOf(color: Rgba): number {
	const { r, g, b } = color;
	const max = Math.max(r, g, b);
	const span = max - Math.min(r, g, b);
	if (span === 0) {
		return 0;
	}
	if (max === r) {
		return SECTOR * ((((g - b) / span) % SECTORS) + SECTORS);
	}
	return max === g ? SECTOR * ((b - r) / span + 2) : SECTOR * ((r - g) / span + 4);
}

export function toHsva(color: Rgba): Hsva {
	const max = Math.max(color.r, color.g, color.b);
	const span = max - Math.min(color.r, color.g, color.b);
	return {
		h: hueOf(color) % (SECTOR * SECTORS),
		s: max === 0 ? 0 : span / max,
		v: max / CHANNEL_MAX,
		a: color.a,
	};
}

function channelOf(offset: number, color: Hsva): number {
	const sector = (offset + color.h / SECTOR) % SECTORS;
	return color.v - color.v * color.s * Math.max(0, Math.min(sector, 4 - sector, 1));
}

export function toRgba(color: Hsva): Rgba {
	return {
		r: Math.round(channelOf(5, color) * CHANNEL_MAX),
		g: Math.round(channelOf(3, color) * CHANNEL_MAX),
		b: Math.round(channelOf(1, color) * CHANNEL_MAX),
		a: color.a,
	};
}

const AREA_KEYS: Readonly<Record<string, { s: number; v: number }>> = {
	ArrowLeft: { s: -1, v: 0 },
	ArrowRight: { s: 1, v: 0 },
	ArrowUp: { s: 0, v: 1 },
	ArrowDown: { s: 0, v: -1 },
};

export function heldRatio(value: number): number {
	return Math.min(Math.max(value, 0), 1);
}

export function steppedHsva(color: Hsva, key: string, step: number): Hsva | null {
	const move = AREA_KEYS[key];
	if (move === undefined) {
		return null;
	}
	return {
		...color,
		s: heldRatio(color.s + move.s * step),
		v: heldRatio(color.v + move.v * step),
	};
}

export function hueText(hue: number): string {
	return formatColor(toRgba({ h: hue, s: 1, v: 1, a: 1 }));
}
