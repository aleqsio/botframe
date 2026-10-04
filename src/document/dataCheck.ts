import { bagOf, isList } from "./bag";
import { bindingsOf } from "./bindings";
import { sourceProblems } from "./component";
import { isSyncMode } from "./instanceState";
import { assignmentsOf } from "./layerLinks";
import { layoutOf } from "./layout";
import { isUnit } from "./length";
import { mediaOf } from "./media";
import { guidesOf } from "./guides";
import { isLayerId, isNodeId } from "./path";
import { variableOf } from "./variable";

type Check = (value: unknown) => boolean;

const SHAPES: ReadonlySet<unknown> = new Set(["rectangle", "ellipse", "path", "group"]);

function isNumber(value: unknown): boolean {
	return typeof value === "number" && Number.isFinite(value);
}

function isText(value: unknown): value is string {
	return typeof value === "string";
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
	return typeof value === "object" && value !== null && !isList(value);
}

function keepsEach(read: (value: unknown) => object): Check {
	return (value) =>
		isRecord(value) && Object.keys(read(value)).length === Object.keys(value).length;
}

function isLayout(value: unknown): boolean {
	if (!isRecord(value)) {
		return false;
	}
	const read = bagOf(layoutOf(value));
	return Object.entries(value).every(
		([key, held]) => JSON.stringify(read[key]) === JSON.stringify(held),
	);
}

const UNIT: Check = (value) => isText(value) && isUnit(value);

const LAYER_FIELDS: Readonly<Record<string, Check>> = {
	x: isNumber,
	y: isNumber,
	width: isNumber,
	height: isNumber,
	xUnit: UNIT,
	yUnit: UNIT,
	widthUnit: UNIT,
	heightUnit: UNIT,
	rotation: isNumber,
	skewX: isNumber,
	skewY: isNumber,
	originX: isNumber,
	originY: isNumber,
	mirrored: (value) => typeof value === "boolean",
	clip: (value) => typeof value === "boolean",
	fill: isText,
	name: isText,
	component: isText,
	definition: isText,
	clipLayer: (value) => isText(value) && isLayerId(value),
	media: (value) => mediaOf(value) !== null,
	guides: (value) => isList(value) && guidesOf(value).length === value.length,
	geometry: (value) => SHAPES.has(bagOf(value)["kind"]),
	layout: isLayout,
	props: keepsEach(assignmentsOf),
	bindings: keepsEach(bindingsOf),
	sync: isSyncMode,
	overrides: isRecord,
};

function isContainer(geometry: unknown): boolean {
	const bag = bagOf(geometry);
	return (
		bag["kind"] === "group" ||
		(bag["kind"] === "rectangle" && bagOf(bag["rectangle"])["frame"] === true)
	);
}

function layerProblems(data: unknown, keys: readonly string[], parent: boolean): readonly string[] {
	const bag = bagOf(data);
	const holds = !parent || !keys.includes("geometry") || isContainer(bag["geometry"]);
	const kept = holds ? [] : ["geometry (a layer with children must stay a frame or a group)"];
	return [
		...kept,
		...keys.flatMap((key) => {
			const check = LAYER_FIELDS[key];
			if (check === undefined) {
				return [`${key} (botframe does not read this layer field)`];
			}
			return bag[key] === undefined || check(bag[key]) ? [] : [key];
		}),
	];
}

function variableProblems(scope: unknown): readonly string[] {
	if (scope === undefined) {
		return [];
	}
	const variables = bagOf(scope)["variables"];
	if (!isRecord(scope) || (variables !== undefined && !isRecord(variables))) {
		return ["scope"];
	}
	return Object.entries(bagOf(variables)).flatMap(([id, held]) =>
		variableOf(id, held) === null ? [`scope.variables.${id}`] : [],
	);
}

function bodyProblems(bag: Readonly<Record<string, unknown>>): readonly string[] {
	if (bag["kind"] === "html") {
		return isText(bag["source"]) && bag["source"] !== ""
			? []
			: ["source (the address of a source)"];
	}
	if (bag["kind"] === "layers") {
		return isText(bag["root"]) && isNodeId(bag["root"]) ? [] : ["root (a node id)"];
	}
	return ["kind (html or layers)"];
}

function componentProblems(value: unknown): readonly string[] {
	if (!isRecord(value)) {
		return ["the component (a map {name, kind, source or root, scope})"];
	}
	return [
		...(isText(value["name"]) ? [] : ["name (text)"]),
		...bodyProblems(value),
		...variableProblems(value["scope"]),
	];
}

export function entryProblems(
	root: string,
	entry: unknown,
	keys: readonly string[],
	parent: boolean,
): readonly string[] {
	if (entry === undefined) {
		return [];
	}
	switch (root) {
		case "sources": {
			return sourceProblems(entry);
		}
		case "components": {
			return componentProblems(entry);
		}
		case "layers": {
			return layerProblems(entry, keys, parent);
		}
		default: {
			return [];
		}
	}
}
