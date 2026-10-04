import type { Layer, LayerPatch, Origin, Rect, RectangleGeometry } from "../../document/layer";
import { SKEW_LIMIT } from "../../document/layer";
import {
	AXIS_OF,
	PERCENT,
	PIXELS,
	UNITS,
	availableUnits,
	lengthIn,
	parseUnitText,
} from "../../document/length";
import type { Basis, BoxKey, Length, Unit } from "../../document/length";
import { COMMIT_MESSAGES, SKEW_MESSAGE } from "../input/layerCommand";
import { ORIGIN_MESSAGE } from "../input/pivot";
import { ANGLE_STEP, FACTOR_STEP, LENGTH_STEP, PERCENT_STEP } from "../input/step";
import type { StepRule } from "../input/step";
import { MIN_LAYER_SIZE } from "../input/transform";
import { boundValue } from "./numberValue";
import type { Bound } from "./numberValue";

const COORDINATE_LIMIT = 100_000;
const RELATIVE_LIMIT = 10_000;
const SMALLEST_RELATIVE_SIZE = 0.1;
const FULL_TURN = 360;
const SMOOTHING_LIMIT = 1;
const DEGREES = "deg";
const NO_UNIT = "";
const PERCENT_UNIT = "%";
const CORNER_MESSAGE = "set corners";

type CornerKey = "cornerRadius" | "cornerSmoothing";

const PLACE_BOUND: Bound = { kind: "clamp", min: -COORDINATE_LIMIT, max: COORDINATE_LIMIT };
const SIZE_BOUND: Bound = { kind: "clamp", min: MIN_LAYER_SIZE, max: COORDINATE_LIMIT };
const RELATIVE_PLACE_BOUND: Bound = { kind: "clamp", min: -RELATIVE_LIMIT, max: RELATIVE_LIMIT };
const RELATIVE_SIZE_BOUND: Bound = {
	kind: "clamp",
	min: SMALLEST_RELATIVE_SIZE,
	max: RELATIVE_LIMIT,
};
const TURN_BOUND: Bound = { kind: "wrap", min: 0, max: FULL_TURN };
const SKEW_BOUND: Bound = { kind: "clamp", min: -SKEW_LIMIT, max: SKEW_LIMIT };
const RADIUS_BOUND: Bound = { kind: "clamp", min: 0, max: COORDINATE_LIMIT };
const SMOOTHING_BOUND: Bound = { kind: "clamp", min: 0, max: SMOOTHING_LIMIT };

export interface UnitChoice {
	held: Unit;
	possible: ReadonlySet<Unit>;
	tips: Partial<Record<Unit, string>>;
	convert: (unit: Unit) => LayerPatch;
	parse: (text: string) => LayerPatch | null;
}

export interface NumberBinding {
	key: BoxKey | CornerKey | "rotation" | "skewX" | "skewY" | "fontSize";
	plain: (value: number) => LayerPatch;
}

export interface LayerField {
	label: string;
	unit: string;
	choice: UnitChoice | null;
	bound: Bound;
	step: StepRule;
	message: string;
	read: (layer: Layer) => number;
	patch: (value: number) => LayerPatch;
	bind?: NumberBinding | undefined;
	stored?: string | undefined;
}

export interface FieldGroup {
	name: string;
	fields: readonly LayerField[];
}

function placeKey(key: BoxKey): boolean {
	return key === "x" || key === "y";
}

function boundOf(key: BoxKey, unit: Unit): Bound {
	if (unit === PIXELS) {
		return placeKey(key) ? PLACE_BOUND : SIZE_BOUND;
	}
	return placeKey(key) ? RELATIVE_PLACE_BOUND : RELATIVE_SIZE_BOUND;
}

function boxPatch(key: BoxKey, length: Length): LayerPatch {
	const value = boundValue(boundOf(key, length.unit), length.value);
	return { lengths: { [key]: { value, unit: length.unit } } };
}

function unitTips(possible: ReadonlySet<Unit>): Partial<Record<Unit, string>> {
	const tips: Partial<Record<Unit, string>> = {};
	for (const unit of UNITS) {
		if (!possible.has(unit)) {
			tips[unit] = `Put the layer in another layer to use ${unit}.`;
		}
	}
	return tips;
}

function unitChoice(key: BoxKey, layer: Layer, basis: Basis): UnitChoice {
	const axis = AXIS_OF[key];
	const held = layer.lengths[key].unit;
	const possible = new Set<Unit>([held, ...availableUnits(axis, basis)]);
	return {
		held,
		possible,
		tips: unitTips(possible),
		convert: (unit) => boxPatch(key, lengthIn(layer[key], unit, axis, basis)),
		parse: (text) => {
			const typed = parseUnitText(text, UNITS, held);
			return typed === null || !possible.has(typed.unit) ? null : boxPatch(key, typed);
		},
	};
}

export function boxField(label: string, key: BoxKey, layer: Layer, basis: Basis): LayerField {
	const { unit } = layer.lengths[key];
	return {
		label,
		unit,
		choice: unitChoice(key, layer, basis),
		bound: boundOf(key, unit),
		step: unit === PIXELS ? LENGTH_STEP : PERCENT_STEP,
		message: placeKey(key) ? COMMIT_MESSAGES.move : COMMIT_MESSAGES.resize,
		read: (target) => target.lengths[key].value,
		patch: (value) => boxPatch(key, { value, unit }),
		bind: { key, plain: (value) => boxPatch(key, { value, unit: PIXELS }) },
	};
}

function cornerField(label: string, key: CornerKey, geometry: RectangleGeometry): LayerField {
	const smooth = key === "cornerSmoothing";
	return {
		label,
		unit: smooth ? NO_UNIT : PIXELS,
		choice: null,
		bound: smooth ? SMOOTHING_BOUND : RADIUS_BOUND,
		step: smooth ? FACTOR_STEP : LENGTH_STEP,
		message: CORNER_MESSAGE,
		read: () => geometry[key],
		patch: (value) => ({ geometry: { ...geometry, [key]: value } }),
		bind: { key, plain: (value) => ({ geometry: { ...geometry, [key]: value } }) },
	};
}

const TURN_FIELD: LayerField = {
	label: "Rotation",
	unit: DEGREES,
	choice: null,
	bound: TURN_BOUND,
	step: ANGLE_STEP,
	message: COMMIT_MESSAGES.rotate,
	read: (layer) => layer.rotation,
	patch: (value) => ({ rotation: value }),
	bind: { key: "rotation", plain: (value) => ({ rotation: value }) },
};

function skewField(label: string, key: "skewX" | "skewY"): LayerField {
	return {
		label,
		unit: DEGREES,
		choice: null,
		bound: SKEW_BOUND,
		step: ANGLE_STEP,
		message: SKEW_MESSAGE,
		read: (layer) => layer[key],
		patch: (value) => ({ [key]: value }),
		bind: { key, plain: (value) => ({ [key]: value }) },
	};
}

export const SKEW_FIELDS: readonly LayerField[] = [
	skewField("Skew X", "skewX"),
	skewField("Skew Y", "skewY"),
];

function originField(label: string, axis: keyof Origin): LayerField {
	return {
		label,
		unit: PERCENT_UNIT,
		choice: null,
		bound: RELATIVE_PLACE_BOUND,
		step: PERCENT_STEP,
		message: ORIGIN_MESSAGE,
		stored: axis === "x" ? "originX" : "originY",
		read: (layer) => layer.origin[axis] * PERCENT,
		patch: (value) => ({ origin: { [axis]: value / PERCENT } }),
	};
}

const TURN_GROUP: FieldGroup = { name: "Rotation", fields: [TURN_FIELD] };

const ORIGIN_GROUP: FieldGroup = {
	name: "Origin",
	fields: [originField("Origin X", "x"), originField("Origin Y", "y")],
};

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
	const groups: readonly FieldGroup[] = [TURN_GROUP, ORIGIN_GROUP];
	const { geometry } = layer;
	return geometry.kind === "rectangle" ? [...groups, cornerGroup(geometry)] : groups;
}

export function fieldPatch(field: LayerField, value: number): LayerPatch {
	return field.patch(boundValue(field.bound, value));
}

export function typedPatch(field: LayerField, text: string): LayerPatch | null {
	if (field.choice !== null) {
		return field.choice.parse(text);
	}
	const value = Number.parseFloat(text);
	return Number.isFinite(value) ? fieldPatch(field, value) : null;
}

export type Size = Pick<Rect, "width" | "height">;

export function swappedBox(box: Size): Size {
	return { width: box.height, height: box.width };
}
