import type { LoroMap } from "loro-crdt";
import type { Geometry, LayerPatch, LayerTraits, Rect } from "./layer";
import {
	AXIS_OF,
	BOX_KEYS,
	PIXELS,
	holdsUnit,
	isUnit,
	lengthIn,
	resolveLength,
	roundNumber,
} from "./length";
import type { Basis, BoxKey, LayerLengths, Length, Unit } from "./length";
import { FREE_LAYOUT } from "./layout";
import type { Cell, Guide, Layout } from "./layout";
import { LAYOUT_READERS, cellOf, guidesOf } from "./layoutData";
import { readBoolean, readMap, readNumber, readString, readVariant } from "./read";
import { writeVariant } from "./write";

const GEOMETRY = "geometry";
const LAYOUT = "layout";
const CELL = "cell";
const GUIDES = "guides";
const UNIT_SUFFIX = "Unit";
const BLACK = "#000000";

type BoxPixels = Readonly<Record<BoxKey, number | undefined>>;

const GEOMETRY_READERS: Readonly<
	Record<Exclude<Geometry["kind"], "unsupported">, (fields: LoroMap | null) => Geometry>
> = {
	rectangle: (fields) => ({
		kind: "rectangle",
		cornerRadius: readNumber(fields, "cornerRadius", 0),
		cornerSmoothing: readNumber(fields, "cornerSmoothing", 0),
		artboard: readBoolean(fields, "artboard", false),
	}),
	ellipse: () => ({ kind: "ellipse" }),
	path: (fields) => ({ kind: "path", d: readString(fields, "d", "") }),
};

function unitKey(key: BoxKey): string {
	return `${key}${UNIT_SUFFIX}`;
}

function readUnit(data: LoroMap, key: BoxKey): Unit {
	const text = readString(data, unitKey(key), PIXELS);
	return isUnit(text) ? text : PIXELS;
}

function readLength(data: LoroMap, key: BoxKey): Length {
	return { value: readNumber(data, key, 0), unit: readUnit(data, key) };
}

function readLengths(data: LoroMap): LayerLengths {
	return {
		x: readLength(data, "x"),
		y: readLength(data, "y"),
		width: readLength(data, "width"),
		height: readLength(data, "height"),
	};
}

function resolveBox(lengths: LayerLengths, basis: Basis): Rect {
	return {
		x: resolveLength(lengths.x, AXIS_OF.x, basis),
		y: resolveLength(lengths.y, AXIS_OF.y, basis),
		width: resolveLength(lengths.width, AXIS_OF.width, basis),
		height: resolveLength(lengths.height, AXIS_OF.height, basis),
	};
}

export function readLayerData(data: LoroMap, basis: Basis): LayerTraits {
	const lengths = readLengths(data);
	return {
		...resolveBox(lengths, basis),
		lengths,
		rotation: readNumber(data, "rotation", 0),
		fill: readString(data, "fill", BLACK),
		geometry: readVariant<Geometry>(data.get(GEOMETRY), GEOMETRY_READERS, { kind: "unsupported" }),
		name: readString(data, "name", ""),
		clip: readBoolean(data, "clip", false),
		layout: readVariant<Layout>(data.get(LAYOUT), LAYOUT_READERS, FREE_LAYOUT),
		cell: cellOf(readMap(data, CELL)),
		slot: null,
		guides: guidesOf(data.get(GUIDES)),
	};
}

function writeUnit(data: LoroMap, key: BoxKey, unit: Unit): void {
	if (unit === readUnit(data, key)) {
		return;
	}
	if (unit === PIXELS) {
		data.delete(unitKey(key));
		return;
	}
	data.set(unitKey(key), unit);
}

function writeLength(data: LoroMap, key: BoxKey, length: Length): void {
	data.set(key, roundNumber(length.value));
	writeUnit(data, key, length.unit);
}

function writeBox(data: LoroMap, box: BoxPixels, basis: Basis): void {
	for (const key of BOX_KEYS) {
		const pixels = box[key];
		if (pixels !== undefined) {
			writeLength(data, key, lengthIn(pixels, readUnit(data, key), AXIS_OF[key], basis));
		}
	}
}

function writeLengths(
	data: LoroMap,
	lengths: Partial<LayerLengths> | undefined,
	basis: Basis,
): void {
	for (const key of BOX_KEYS) {
		const length = lengths?.[key];
		if (length !== undefined && holdsUnit(length.unit, AXIS_OF[key], basis)) {
			writeLength(data, key, length);
		}
	}
}

function writeCell(data: LoroMap, cell: Cell | null): void {
	if (cell === null) {
		data.delete(CELL);
		return;
	}
	const held = data.ensureMergeableMap(CELL);
	held.set("column", cell.column);
	held.set("row", cell.row);
}

function writeGuides(data: LoroMap, guides: readonly Guide[]): void {
	if (guides.length === 0) {
		data.delete(GUIDES);
		return;
	}
	data.set(
		GUIDES,
		guides.map(({ axis, at }) => ({ axis, at })),
	);
}

export function writePatch(data: LoroMap, patch: LayerPatch, basis: Basis): void {
	const { geometry, lengths, layout, cell, guides, x, y, width, height, ...plain } = patch;
	for (const [key, value] of Object.entries(plain)) {
		data.set(key, value);
	}
	writeBox(data, { x, y, width, height }, basis);
	writeLengths(data, lengths, basis);
	if (geometry !== undefined) {
		writeVariant(data.ensureMergeableMap(GEOMETRY), geometry);
	}
	if (layout !== undefined) {
		writeVariant(data.ensureMergeableMap(LAYOUT), layout);
	}
	if (cell !== undefined) {
		writeCell(data, cell);
	}
	if (guides !== undefined) {
		writeGuides(data, guides);
	}
}
