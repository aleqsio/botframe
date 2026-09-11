import type { Layer, LayerPatch, Rect, RectangleGeometry } from "../../document/layer";
import { COMMIT_MESSAGES } from "../input/layerCommand";
import { ANGLE_STEP, FACTOR_STEP, LENGTH_STEP } from "../input/step";
import type { StepRule } from "../input/step";
import { MIN_LAYER_SIZE } from "../input/transform";
import { boundValue } from "./numberValue";
import type { Bound } from "./numberValue";

const COORDINATE_LIMIT = 100_000;
const FULL_TURN = 360;
const SMOOTHING_LIMIT = 1;
const PIXELS = "px";
const DEGREES = "deg";
const NO_UNIT = "";
const CORNER_MESSAGE = "set corners";

type BoxKey = "x" | "y" | "width" | "height";
type CornerKey = "cornerRadius" | "cornerSmoothing";

const PLACE_BOUND: Bound = { kind: "clamp", min: -COORDINATE_LIMIT, max: COORDINATE_LIMIT };
const SIZE_BOUND: Bound = { kind: "clamp", min: MIN_LAYER_SIZE, max: COORDINATE_LIMIT };
const TURN_BOUND: Bound = { kind: "wrap", min: 0, max: FULL_TURN };
const RADIUS_BOUND: Bound = { kind: "clamp", min: 0, max: COORDINATE_LIMIT };
const SMOOTHING_BOUND: Bound = { kind: "clamp", min: 0, max: SMOOTHING_LIMIT };

export interface LayerField {
	label: string;
	unit: string;
	bound: Bound;
	step: StepRule;
	message: string;
	read: (layer: Layer) => number;
	patch: (value: number) => LayerPatch;
}

export interface FieldGroup {
	name: string;
	fields: readonly LayerField[];
}

function boxField(label: string, key: BoxKey): LayerField {
	const place = key === "x" || key === "y";
	return {
		label,
		unit: PIXELS,
		bound: place ? PLACE_BOUND : SIZE_BOUND,
		step: LENGTH_STEP,
		message: place ? COMMIT_MESSAGES.move : COMMIT_MESSAGES.resize,
		read: (layer) => layer[key],
		patch: (value) => ({ [key]: value }),
	};
}

function cornerField(label: string, key: CornerKey, geometry: RectangleGeometry): LayerField {
	const smooth = key === "cornerSmoothing";
	return {
		label,
		unit: smooth ? NO_UNIT : PIXELS,
		bound: smooth ? SMOOTHING_BOUND : RADIUS_BOUND,
		step: smooth ? FACTOR_STEP : LENGTH_STEP,
		message: CORNER_MESSAGE,
		read: () => geometry[key],
		patch: (value) => ({ geometry: { ...geometry, [key]: value } }),
	};
}

const TURN_FIELD: LayerField = {
	label: "Rotation",
	unit: DEGREES,
	bound: TURN_BOUND,
	step: ANGLE_STEP,
	message: COMMIT_MESSAGES.rotate,
	read: (layer) => layer.rotation,
	patch: (value) => ({ rotation: value }),
};

const BOX_GROUPS: readonly FieldGroup[] = [
	{ name: "Position", fields: [boxField("X", "x"), boxField("Y", "y")] },
	{ name: "Size", fields: [boxField("W", "width"), boxField("H", "height")] },
	{ name: "Rotation", fields: [TURN_FIELD] },
];

function cornerGroup(geometry: RectangleGeometry): FieldGroup {
	return {
		name: "Corners",
		fields: [
			cornerField("Radius", "cornerRadius", geometry),
			cornerField("Smoothing", "cornerSmoothing", geometry),
		],
	};
}

export function fieldGroupsOf(layer: Layer): readonly FieldGroup[] {
	const { geometry } = layer;
	if (geometry.kind !== "rectangle") {
		return BOX_GROUPS;
	}
	return [...BOX_GROUPS, cornerGroup(geometry)];
}

export function fieldsOf(layer: Layer): readonly LayerField[] {
	return fieldGroupsOf(layer).flatMap((group) => group.fields);
}

export function fieldPatch(field: LayerField, value: number): LayerPatch {
	return field.patch(boundValue(field.bound, value));
}

export type Size = Pick<Rect, "width" | "height">;

export function swappedBox(box: Size): Size {
	return { width: box.height, height: box.width };
}
