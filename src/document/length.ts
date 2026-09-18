export const UNITS = ["px", "rem", "%", "vw", "vh"] as const;

export type Unit = (typeof UNITS)[number];

export type Axis = "width" | "height";

export type BoxKey = "x" | "y" | "width" | "height";

export interface Length {
	value: number;
	unit: Unit;
}

export type LayerLengths = Record<BoxKey, Length>;

export interface Size {
	width: number;
	height: number;
}

export interface Basis {
	container: Size;
	root: Size;
}

const PERCENT = 100;
const REM_PIXELS = 16;
const DECIMALS = 100;
const LENGTH_TEXT = /^([+-]?(?:\d+\.?\d*|\.\d+))\s*([a-z%]*)$/iu;
const UNIT_NAMES: ReadonlySet<string> = new Set(UNITS);
const NO_SIZE: Size = { width: 0, height: 0 };

export const PIXELS: Unit = "px";
export const NO_BASIS: Basis = { container: NO_SIZE, root: NO_SIZE };
export const BOX_KEYS: readonly BoxKey[] = ["x", "y", "width", "height"];
export const AXIS_OF: Readonly<Record<BoxKey, Axis>> = {
	x: "width",
	y: "height",
	width: "width",
	height: "height",
};

const HUNDRED_PIXELS: Readonly<Record<Unit, (basis: Basis, axis: Axis) => number>> = {
	px: () => PERCENT,
	rem: () => REM_PIXELS * PERCENT,
	"%": (basis, axis) => basis.container[axis],
	vw: (basis) => basis.root.width,
	vh: (basis) => basis.root.height,
};

function pixelsPerHundred(unit: Unit, axis: Axis, basis: Basis): number {
	return HUNDRED_PIXELS[unit](basis, axis);
}

export function roundNumber(value: number): number {
	return Math.round(value * DECIMALS) / DECIMALS;
}

export function isUnit(text: string): text is Unit {
	return UNIT_NAMES.has(text);
}

export function resolveLength(length: Length, axis: Axis, basis: Basis): number {
	return (length.value * pixelsPerHundred(length.unit, axis, basis)) / PERCENT;
}

export function lengthIn(pixels: number, unit: Unit, axis: Axis, basis: Basis): Length {
	const reference = pixelsPerHundred(unit, axis, basis);
	return { value: reference === 0 ? 0 : roundNumber((pixels * PERCENT) / reference), unit };
}

export function availableUnits(axis: Axis, basis: Basis): readonly Unit[] {
	return UNITS.filter((unit) => pixelsPerHundred(unit, axis, basis) > 0);
}

export function parseUnitText<U extends string>(
	text: string,
	units: readonly U[],
	fallback: U,
): { value: number; unit: U } | null {
	const match = LENGTH_TEXT.exec(text.trim());
	if (match === null) {
		return null;
	}
	const [, digits = "", written = ""] = match;
	const value = Number(digits);
	if (!Number.isFinite(value)) {
		return null;
	}
	if (written === "") {
		return { value, unit: fallback };
	}
	const unit = units.find((known) => known === written.toLowerCase());
	return unit === undefined ? null : { value, unit };
}

export function parseLength(text: string, fallback: Unit): Length | null {
	return parseUnitText(text, UNITS, fallback);
}

export interface Box {
	lengths: LayerLengths;
	pixels: Readonly<Record<BoxKey, number>>;
}

export function settledLengths(
	wanted: LayerLengths,
	box: Box,
	basis: Basis,
): Partial<LayerLengths> {
	const settled: Partial<LayerLengths> = {};
	for (const key of BOX_KEYS) {
		const held = box.lengths[key];
		const next = holdsUnit(wanted[key].unit, AXIS_OF[key], basis)
			? wanted[key]
			: { value: box.pixels[key], unit: PIXELS };
		if (next.unit !== held.unit || next.value !== held.value) {
			settled[key] = next;
		}
	}
	return settled;
}

export function holdsUnit(unit: Unit, axis: Axis, basis: Basis): boolean {
	return pixelsPerHundred(unit, axis, basis) > 0;
}

export function hasRelativeLength(lengths: LayerLengths): boolean {
	return BOX_KEYS.some((key) => lengths[key].unit !== PIXELS);
}
