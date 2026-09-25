import { isCondition, isLiteral } from "./value";
import type { Condition, Literal, VariableValue } from "./value";
import { DOCUMENT_SCOPE, fitsType } from "./variable";
import type { Variable } from "./variable";

export interface Declared {
	variable: Variable;
	owner: string;
}

export interface ResolveSource {
	declared: (id: string) => Declared | null;
	assigned: (copy: string, id: string) => VariableValue | undefined;
	componentOf: (copy: string) => string | null;
}

interface Walk {
	source: ResolveSource;
	chain: readonly string[];
	depth: number;
}

const MAX_DEPTH = 32;

function deeper(walk: Walk): Walk {
	return { ...walk, depth: walk.depth + 1 };
}

function conditionAt(walk: Walk, condition: Condition, at: number): Literal | null {
	const next = deeper(walk);
	const met = condition.when.find((held) => variableFrom(next, held.test, at) === held.is);
	return valueAt(next, met === undefined ? condition.else : met.result, at);
}

function valueAt(walk: Walk, value: VariableValue, at: number): Literal | null {
	if (isLiteral(value)) {
		return value;
	}
	if (walk.depth > MAX_DEPTH) {
		return null;
	}
	return isCondition(value)
		? conditionAt(walk, value, at)
		: variableFrom(deeper(walk), value.var, at);
}

function fitted(declared: Declared, value: Literal | null): Literal | null {
	const { type, options } = declared.variable;
	return value !== null && fitsType(type, options, value) ? value : null;
}

function initialAt(walk: Walk, declared: Declared, at: number): Literal | null {
	const from = declared.owner === DOCUMENT_SCOPE ? 0 : at;
	return fitted(declared, valueAt(walk, declared.variable.initial, from));
}

function variableFrom(walk: Walk, id: string, from: number): Literal | null {
	const declared = walk.depth > MAX_DEPTH ? null : walk.source.declared(id);
	if (declared === null) {
		return null;
	}
	for (let at = from; at < walk.chain.length; at += 1) {
		const copy = walk.chain[at] ?? "";
		const held = walk.source.assigned(copy, id);
		if (held !== undefined) {
			return fitted(declared, valueAt(walk, held, at + 1)) ?? initialAt(walk, declared, at);
		}
		if (declared.owner !== DOCUMENT_SCOPE && walk.source.componentOf(copy) === declared.owner) {
			return initialAt(walk, declared, at);
		}
	}
	return initialAt(walk, declared, walk.chain.length);
}

export function resolveVariable(
	source: ResolveSource,
	id: string,
	chain: readonly string[],
): Literal | null {
	return variableFrom({ source, chain, depth: 0 }, id, 0);
}

export function resolveValue(
	source: ResolveSource,
	value: VariableValue,
	chain: readonly string[],
): Literal | null {
	return valueAt({ source, chain, depth: 0 }, value, 0);
}
