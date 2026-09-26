import { bagOf } from "./bag";
import { boundOf } from "./value";
import type { Bound } from "./value";
import type { VariableType } from "./variable";

export const BINDING_TYPES = {
	fill: "color",
	x: "length",
	y: "length",
	width: "length",
	height: "length",
	rotation: "number",
	skewX: "number",
	skewY: "number",
	mirrored: "boolean",
	cornerRadius: "length",
	cornerSmoothing: "number",
	clip: "boolean",
} as const satisfies Readonly<Record<string, VariableType>>;

export type BindingKey = keyof typeof BINDING_TYPES;

export type Bindings = Readonly<Partial<Record<BindingKey, Bound>>>;

export type BindingsPatch = Readonly<Partial<Record<BindingKey, Bound | null>>>;

export const BINDING_KEYS: readonly BindingKey[] = [
	"fill",
	"x",
	"y",
	"width",
	"height",
	"rotation",
	"skewX",
	"skewY",
	"mirrored",
	"cornerRadius",
	"cornerSmoothing",
	"clip",
];

export const NO_BINDINGS: Bindings = {};

const PLACEMENT_BINDINGS: ReadonlySet<BindingKey> = new Set(["x", "y"]);

export function isPlacementBinding(key: string): boolean {
	return BINDING_KEYS.some((held) => held === key && PLACEMENT_BINDINGS.has(held));
}

export function bindingsOf(value: unknown): Bindings {
	const bag = bagOf(value);
	const bindings: Partial<Record<BindingKey, Bound>> = {};
	for (const key of BINDING_KEYS) {
		const held = boundOf(bag[key]);
		if (held !== null) {
			bindings[key] = held;
		}
	}
	return bindings;
}
