import { bagOf } from "./bag";
import type { VariableType } from "./variable";

export const BINDING_TYPES = {
	fill: "color",
	x: "length",
	y: "length",
	width: "length",
	height: "length",
	rotation: "number",
	cornerRadius: "length",
	cornerSmoothing: "number",
	clip: "boolean",
} as const satisfies Readonly<Record<string, VariableType>>;

export type BindingKey = keyof typeof BINDING_TYPES;

export type Bindings = Readonly<Partial<Record<BindingKey, string>>>;

export type BindingsPatch = Readonly<Partial<Record<BindingKey, string | null>>>;

export const BINDING_KEYS: readonly BindingKey[] = [
	"fill",
	"x",
	"y",
	"width",
	"height",
	"rotation",
	"cornerRadius",
	"cornerSmoothing",
	"clip",
];

export const NO_BINDINGS: Bindings = {};

const PLACEMENT_BINDINGS: ReadonlySet<BindingKey> = new Set([
	"x",
	"y",
	"width",
	"height",
	"rotation",
]);

export function isPlacementBinding(key: string): boolean {
	return BINDING_KEYS.some((held) => held === key && PLACEMENT_BINDINGS.has(held));
}

export function bindingsOf(value: unknown): Bindings {
	const bag = bagOf(value);
	const bindings: Partial<Record<BindingKey, string>> = {};
	for (const key of BINDING_KEYS) {
		const held = bag[key];
		if (typeof held === "string" && held !== "") {
			bindings[key] = held;
		}
	}
	return bindings;
}
