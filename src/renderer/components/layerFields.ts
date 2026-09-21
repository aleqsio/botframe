import type { Layer, LayerPatch, Rect } from "../../document/layer";
import {
	AXIS_OF,
	PIXELS,
	UNITS,
	availableUnits,
	lengthIn,
	parseUnitText,
} from "../../document/length";
import type { Basis, BoxKey, Length, Unit } from "../../document/length";
import { COMMIT_MESSAGES } from "../input/layerCommand";
import { ANGLE_STEP, FACTOR_STEP, LENGTH_STEP, PERCENT_STEP } from "../input/step";
import type { StepRule } from "../input/step";
import { MIN_LAYER_SIZE } from "../input/transform";
import { boundValue } from "./numberValue";
import type { Bound } from "./numberValue";
import type { LayerEdit } from "./targets";

const COORDINATE_LIMIT = 100_000;
const RELATIVE_LIMIT = 10_000;
const SMALLEST_RELATIVE_SIZE = 0.1;
const FULL_TURN = 360;
const SMOOTHING_LIMIT = 1;
const DEGREES = "deg";
const NO_UNIT = "";
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
const RADIUS_BOUND: Bound = { kind: "clamp", min: 0, max: COORDINATE_LIMIT };
const SMOOTHING_BOUND: Bound = { kind: "clamp", min: 0, max: SMOOTHING_LIMIT };

export interface UnitChoice {
	possible: ReadonlySet<Unit>;
	convert: (unit: Unit) => LayerEdit;
	parse: (text: string) => LayerEdit | null;
}

export interface LayerField {
	label: string;
	unit: string;
	choice: UnitChoice | null;
	bound: Bound;
	step: StepRule;
	message: string;
	read: (layer: Layer) => number;
	patch: (value: number) => LayerEdit;
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

export type BasisOf = (layer: Layer) => Basis;

function unitsOf(key: BoxKey, layer: Layer, basis: Basis): Set<Unit> {
	return new Set<Unit>([layer.lengths[key].unit, ...availableUnits(AXIS_OF[key], basis)]);
}

function convertedLength(key: BoxKey, unit: Unit, basisOf: BasisOf): LayerEdit {
	return (target) => {
		const basis = basisOf(target);
		if (!unitsOf(key, target, basis).has(unit)) {
			return null;
		}
		return boxPatch(key, lengthIn(target[key], unit, AXIS_OF[key], basis));
	};
}

function unitChoice(key: BoxKey, layer: Layer, basisOf: BasisOf): UnitChoice {
	const held = layer.lengths[key].unit;
	const possible = unitsOf(key, layer, basisOf(layer));
	return {
		possible,
		convert: (unit) => convertedLength(key, unit, basisOf),
		parse: (text) => {
			const typed = parseUnitText(text, UNITS, held);
			return typed === null || !possible.has(typed.unit) ? null : () => boxPatch(key, typed);
		},
	};
}

export function boxField(label: string, key: BoxKey, layer: Layer, basisOf: BasisOf): LayerField {
	const { unit } = layer.lengths[key];
	return {
		label,
		unit,
		choice: unitChoice(key, layer, basisOf),
		bound: boundOf(key, unit),
		step: unit === PIXELS ? LENGTH_STEP : PERCENT_STEP,
		message: placeKey(key) ? COMMIT_MESSAGES.move : COMMIT_MESSAGES.resize,
		read: (target) => target.lengths[key].value,
		patch: (value) => (target) => boxPatch(key, { value, unit: target.lengths[key].unit }),
	};
}

function cornerPatch(target: Layer, key: CornerKey, value: number): LayerPatch | null {
	const { geometry } = target;
	return geometry.kind === "rectangle" ? { geometry: { ...geometry, [key]: value } } : null;
}

function cornerField(label: string, key: CornerKey): LayerField {
	const smooth = key === "cornerSmoothing";
	return {
		label,
		unit: smooth ? NO_UNIT : PIXELS,
		choice: null,
		bound: smooth ? SMOOTHING_BOUND : RADIUS_BOUND,
		step: smooth ? FACTOR_STEP : LENGTH_STEP,
		message: CORNER_MESSAGE,
		read: (target) => (target.geometry.kind === "rectangle" ? target.geometry[key] : 0),
		patch: (value) => (target) => cornerPatch(target, key, value),
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
	patch: (value) => () => ({ rotation: value }),
};

const CORNER_GROUP: FieldGroup = {
	name: "Corners",
	fields: [cornerField("Radius", "cornerRadius"), cornerField("Smoothing", "cornerSmoothing")],
};

export function fieldGroupsOf(layer: Layer): readonly FieldGroup[] {
	const groups: readonly FieldGroup[] = [{ name: "Rotation", fields: [TURN_FIELD] }];
	return layer.geometry.kind === "rectangle" ? [...groups, CORNER_GROUP] : groups;
}

export function fieldEdit(field: LayerField, value: number): LayerEdit {
	return field.patch(boundValue(field.bound, value));
}

export function typedEdit(field: LayerField, text: string): LayerEdit | null {
	if (field.choice !== null) {
		return field.choice.parse(text);
	}
	const value = Number.parseFloat(text);
	return Number.isFinite(value) ? fieldEdit(field, value) : null;
}

export type Size = Pick<Rect, "width" | "height">;

export function swappedBox(box: Size): Size {
	return { width: box.height, height: box.width };
}
