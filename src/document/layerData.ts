import { LoroMap } from "loro-crdt";
import { CENTER_ORIGIN, heldSkew } from "./layer";
import type { Geometry, LayerPatch, LayerTraits, Origin, Rect } from "./layer";
import { guidesOf } from "./guides";
import type { Guide } from "./guides";
import { DEFAULT_LAYOUT, layoutOf } from "./layout";
import type { LayerLayout, LayoutPatch } from "./layout";
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
import { mediaOf } from "./media";
import type { MediaFill } from "./media";
import { readBoolean, readNumber, readString, readVariant } from "./read";
import { writeVariant } from "./write";

const GEOMETRY = "geometry";
const LAYOUT = "layout";
const GUIDES = "guides";
const MEDIA = "media";
const ORIGIN_KEYS: Readonly<Record<keyof Origin, string>> = { x: "originX", y: "originY" };
const ORIGIN_AXES: readonly (keyof Origin)[] = ["x", "y"];
const UNIT_SUFFIX = "Unit";
const BLACK = "#000000";

type BoxPixels = Readonly<Record<BoxKey, number | undefined>>;

const DEFAULT_LAYOUT_TEXT: ReadonlyMap<string, string> = new Map(
	Object.entries(DEFAULT_LAYOUT).map(([key, value]) => [key, JSON.stringify(value)]),
);

const GEOMETRY_READERS: Readonly<
	Record<Exclude<Geometry["kind"], "unsupported">, (fields: LoroMap | null) => Geometry>
> = {
	rectangle: (fields) => ({
		kind: "rectangle",
		cornerRadius: readNumber(fields, "cornerRadius", 0),
		cornerSmoothing: readNumber(fields, "cornerSmoothing", 0),
		frame: readBoolean(fields, "frame", false),
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

function readOrigin(data: LoroMap): Origin {
	return {
		x: readNumber(data, ORIGIN_KEYS.x, CENTER_ORIGIN.x),
		y: readNumber(data, ORIGIN_KEYS.y, CENTER_ORIGIN.y),
	};
}

function readLayout(data: LoroMap): LayerLayout {
	const held = data.get(LAYOUT);
	return layoutOf(held instanceof LoroMap ? held.toJSON() : undefined);
}

export function readLayerData(data: LoroMap, basis: Basis): LayerTraits {
	const lengths = readLengths(data);
	return {
		...resolveBox(lengths, basis),
		lengths,
		layout: readLayout(data),
		guides: guidesOf(data.get(GUIDES)),
		rotation: readNumber(data, "rotation", 0),
		skewX: heldSkew(readNumber(data, "skewX", 0)),
		skewY: heldSkew(readNumber(data, "skewY", 0)),
		mirrored: readBoolean(data, "mirrored", false),
		origin: readOrigin(data),
		fill: readString(data, "fill", BLACK),
		media: mediaOf(data.get(MEDIA)),
		geometry: readVariant<Geometry>(data.get(GEOMETRY), GEOMETRY_READERS, { kind: "unsupported" }),
		name: readString(data, "name", ""),
		clip: readBoolean(data, "clip", false),
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

function writeLayoutKey(map: LoroMap, key: string, value: unknown): void {
	if (JSON.stringify(value) !== DEFAULT_LAYOUT_TEXT.get(key)) {
		map.set(key, value);
	} else if (map.get(key) !== undefined) {
		map.delete(key);
	}
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

function writeOrigin(data: LoroMap, origin: Partial<Origin>): void {
	for (const axis of ORIGIN_AXES) {
		const value = origin[axis];
		if (value === CENTER_ORIGIN[axis]) {
			data.delete(ORIGIN_KEYS[axis]);
		} else if (value !== undefined) {
			data.set(ORIGIN_KEYS[axis], value);
		}
	}
}

function writeMedia(data: LoroMap, media: MediaFill | null): void {
	if (media === null) {
		data.delete(MEDIA);
		return;
	}
	data.set(MEDIA, { asset: media.asset, fit: media.fit });
}

function writeLayout(map: LoroMap, patch: LayoutPatch): void {
	for (const [key, value] of Object.entries(patch)) {
		writeLayoutKey(map, key, value);
	}
}

export function writePatch(data: LoroMap, patch: LayerPatch, basis: Basis): void {
	const { geometry, guides, layout, lengths, media, origin, x, y, width, height, ...plain } = patch;
	for (const [key, value] of Object.entries(plain)) {
		data.set(key, value);
	}
	writeBox(data, { x, y, width, height }, basis);
	writeLengths(data, lengths, basis);
	if (geometry !== undefined) {
		writeVariant(data.ensureMergeableMap(GEOMETRY), geometry);
	}
	if (layout !== undefined) {
		writeLayout(data.ensureMergeableMap(LAYOUT), layout);
	}
	if (guides !== undefined) {
		writeGuides(data, guides);
	}
	if (origin !== undefined) {
		writeOrigin(data, origin);
	}
	if (media !== undefined) {
		writeMedia(data, media);
	}
}
