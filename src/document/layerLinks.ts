import { LoroMap } from "loro-crdt";
import { bagOf } from "./bag";
import { bindingsOf } from "./bindings";
import type { BindingKey, Bindings, BindingsPatch } from "./bindings";
import {
	OVERRIDES,
	SYNC,
	clearInstance,
	instanceStateOf,
	stringKeys,
	writeInstance,
} from "./instanceState";
import { NO_CONTENT, PLAIN_INSTANCE } from "./layer";
import type { InstanceState } from "./instanceState";
import type { ComponentLink, LayerContent, LayerPatch } from "./layer";
import { readString } from "./read";
import type { FieldSource } from "./read";
import { storedValue, valueOf } from "./value";
import type { VariableValue } from "./value";
import type { Assignments } from "./variable";

const COMPONENT = "component";
const PROPS = "props";
const BINDINGS = "bindings";

interface Links {
	content: LayerPatch["content"] | undefined;
	props: LayerPatch["props"] | undefined;
	bindings: LayerPatch["bindings"] | undefined;
}

export function jsonOf(value: unknown): unknown {
	return value instanceof LoroMap ? value.toJSON() : value;
}

export function assignmentsOf(value: unknown): Assignments {
	return Object.fromEntries(
		Object.entries(bagOf(value)).flatMap(([key, held]) => {
			const assigned = valueOf(held);
			return assigned === null ? [] : [[key, assigned] as const];
		}),
	);
}

export function instanceFrom(value: unknown): InstanceState {
	const bag = bagOf(value);
	return instanceStateOf(bag[SYNC], bag[OVERRIDES]);
}

export function readContent(data: FieldSource): LayerContent {
	const component = readString(data, COMPONENT, "");
	if (component === "") {
		return NO_CONTENT;
	}
	return {
		kind: "component",
		component,
		props: assignmentsOf(jsonOf(data.get(PROPS))),
		values: {},
		instance: instanceStateOf(data.get(SYNC), jsonOf(data.get(OVERRIDES))),
	};
}

export function readBindings(data: FieldSource): Bindings {
	return bindingsOf(jsonOf(data.get(BINDINGS)));
}

function writeEntries(map: LoroMap, entries: Readonly<Record<string, unknown>>): void {
	for (const [key, value] of Object.entries(entries)) {
		if (value === null) {
			map.delete(key);
		} else {
			map.set(key, value);
		}
	}
}

function writeProps(data: LoroMap, props: Readonly<Record<string, VariableValue | null>>): void {
	const entries: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(props)) {
		entries[key] = value === null ? null : storedValue(value);
	}
	writeEntries(data.ensureMergeableMap(PROPS), entries);
}

function writeContent(data: LoroMap, content: ComponentLink | null): void {
	if (content === null) {
		data.delete(COMPONENT);
		data.delete(PROPS);
		clearInstance(data);
		return;
	}
	data.set(COMPONENT, content.component);
	const held = data.ensureMergeableMap(PROPS);
	const stale = stringKeys(held).filter((key) => !Object.hasOwn(content.props, key));
	writeEntries(held, Object.fromEntries(stale.map((key) => [key, null])));
	writeProps(data, content.props);
	writeInstance(data, content.instance ?? PLAIN_INSTANCE);
}

function writeBindings(data: LoroMap, bindings: BindingsPatch): void {
	const entries: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(bindings)) {
		entries[key] = value === null ? null : storedValue(value);
	}
	writeEntries(data.ensureMergeableMap(BINDINGS), entries);
}

export function writeLinks(data: LoroMap, links: Links): void {
	if (links.content !== undefined) {
		writeContent(data, links.content);
	}
	if (links.props !== undefined) {
		writeProps(data, links.props);
	}
	if (links.bindings !== undefined) {
		writeBindings(data, links.bindings);
	}
}

const LITERAL_KEYS: readonly (readonly [keyof LayerPatch, BindingKey])[] = [
	["fill", "fill"],
	["clip", "clip"],
	["rotation", "rotation"],
	["x", "x"],
	["y", "y"],
	["width", "width"],
	["height", "height"],
];

function writesLength(patch: LayerPatch, key: BindingKey): boolean {
	return Object.hasOwn(patch.lengths ?? {}, key);
}

export function unboundBy(patch: LayerPatch): BindingsPatch {
	const written = LITERAL_KEYS.flatMap(([field, key]) =>
		patch[field] === undefined && !writesLength(patch, key) ? [] : [key],
	);
	const kept = written.filter((key) => patch.bindings?.[key] === undefined);
	return Object.fromEntries(kept.map((key) => [key, null]));
}
