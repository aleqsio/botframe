import type { DesignDocument } from "../../document/document";
import type { Layer, Rect, RectangleGeometry } from "../../document/layer";
import { COMMIT_MESSAGES } from "../input/layerCommand";
import { normalizeDegrees } from "../input/layerSpace";
import { MIN_LAYER_SIZE } from "../input/transform";

const DECIMALS = 100;
type CornerKey = "cornerRadius" | "cornerSmoothing";

const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/iu;

function clampSize(value: number): number {
	return Math.max(value, MIN_LAYER_SIZE);
}

function clampCorner(value: number): number {
	return Math.max(value, 0);
}

export interface LayerField {
	label: string;
	read: (layer: Layer) => number;
	apply: (doc: DesignDocument, layer: Layer, value: number) => void;
}

function boxOf(layer: Layer): Rect {
	return { x: layer.x, y: layer.y, width: layer.width, height: layer.height };
}

function resize(doc: DesignDocument, layer: Layer, box: Partial<Rect>): void {
	doc.resize(layer.id, { ...boxOf(layer), ...box });
	doc.commit(COMMIT_MESSAGES.resize);
}

function moveTo(doc: DesignDocument, layer: Layer, x: number, y: number): void {
	doc.move(layer.id, x, y);
	doc.commit(COMMIT_MESSAGES.move);
}

export const LAYER_FIELDS: readonly LayerField[] = [
	{
		label: "X",
		read: (layer) => layer.x,
		apply: (doc, layer, value) => {
			moveTo(doc, layer, value, layer.y);
		},
	},
	{
		label: "Y",
		read: (layer) => layer.y,
		apply: (doc, layer, value) => {
			moveTo(doc, layer, layer.x, value);
		},
	},
	{
		label: "W",
		read: (layer) => layer.width,
		apply: (doc, layer, value) => {
			resize(doc, layer, { width: clampSize(value) });
		},
	},
	{
		label: "H",
		read: (layer) => layer.height,
		apply: (doc, layer, value) => {
			resize(doc, layer, { height: clampSize(value) });
		},
	},
	{
		label: "Rotation",
		read: (layer) => layer.rotation,
		apply: (doc, layer, value) => {
			doc.rotate(layer.id, normalizeDegrees(value));
			doc.commit(COMMIT_MESSAGES.rotate);
		},
	},
];

function cornerField(label: string, key: CornerKey, geometry: RectangleGeometry): LayerField {
	return {
		label,
		read: () => geometry[key],
		apply: (doc, layer, value) => {
			doc.setGeometry(layer.id, { ...geometry, [key]: clampCorner(value) });
			doc.commit("set corners");
		},
	};
}

export function fieldsOf(layer: Layer): readonly LayerField[] {
	const { geometry } = layer;
	if (geometry.kind !== "rectangle") {
		return LAYER_FIELDS;
	}
	return [
		...LAYER_FIELDS,
		cornerField("Radius", "cornerRadius", geometry),
		cornerField("Smoothing", "cornerSmoothing", geometry),
	];
}

export function swappedBox(layer: Layer): Rect {
	return { x: layer.x, y: layer.y, width: layer.height, height: layer.width };
}

export function isHexColor(text: string): boolean {
	return HEX_COLOR.test(text);
}

export function formatNumber(value: number): string {
	return String(Math.round(value * DECIMALS) / DECIMALS);
}
