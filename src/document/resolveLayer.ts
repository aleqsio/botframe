import type { TreeID } from "loro-crdt";
import { BINDING_KEYS, isPlacementBinding } from "./bindings";
import type { BindingKey } from "./bindings";
import { boundTraits } from "./boundTraits";
import type { LayerTraits, ResolvedValues } from "./layer";
import { resolveValue, resolveVariable } from "./resolve";
import type { ResolveSource } from "./resolve";
import type { Variable } from "./variable";

export interface Context {
	source: ResolveSource;
	chain: readonly TreeID[];
	copy: boolean;
	variablesOf: (component: string) => readonly Variable[];
}

function chainFor(context: Context, key: BindingKey): readonly TreeID[] {
	return context.copy && isPlacementBinding(key) ? context.chain.slice(1) : context.chain;
}

function valuesOf(context: Context, component: string): ResolvedValues {
	const values: Record<string, string | number | boolean> = {};
	for (const variable of context.variablesOf(component)) {
		const value = resolveVariable(context.source, variable.id, context.chain);
		if (value !== null) {
			values[variable.id] = value;
		}
	}
	return values;
}

export function resolveTraits(traits: LayerTraits, context: Context): LayerTraits {
	let resolved = traits;
	for (const key of BINDING_KEYS) {
		const bound = traits.bindings[key];
		const value =
			bound === undefined ? null : resolveValue(context.source, bound, chainFor(context, key));
		resolved = value === null ? resolved : boundTraits(resolved, key, value);
	}
	const { content } = resolved;
	return content.kind === "component"
		? { ...resolved, content: { ...content, values: valuesOf(context, content.component) } }
		: resolved;
}
