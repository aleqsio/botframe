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
	known: Map<string, Literal | null>;
	active: Set<string>;
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
	const key = `${id}@${from}`;
	const known = walk.known.get(key);
	if (known !== undefined) {
		return known;
	}
	if (walk.active.has(key)) {
		return null;
	}
	walk.active.add(key);
	const value = lookup(walk, id, from);
	walk.active.delete(key);
	walk.known.set(key, value);
	return value;
}

interface Nearest {
	held: VariableValue;
	at: number;
	assigned: boolean;
}

function nearest(source: ResolveSource, declared: Declared, chain: readonly string[]): Nearest {
	const { owner, variable } = declared;
	for (const [at, copy] of chain.entries()) {
		const held = source.assigned(copy, variable.id);
		if (held !== undefined) {
			return { held, at, assigned: true };
		}
		if (owner !== DOCUMENT_SCOPE && source.componentOf(copy) === owner) {
			return { held: variable.initial, at, assigned: false };
		}
	}
	return { held: variable.initial, at: chain.length, assigned: false };
}

function lookup(walk: Walk, id: string, from: number): Literal | null {
	const declared = walk.depth > MAX_DEPTH ? null : walk.source.declared(id);
	if (declared === null) {
		return null;
	}
	const found = nearest(walk.source, declared, walk.chain.slice(from));
	const at = from + found.at;
	if (!found.assigned) {
		return initialAt(walk, declared, at);
	}
	return fitted(declared, valueAt(walk, found.held, at + 1)) ?? initialAt(walk, declared, at);
}

function startWalk(source: ResolveSource, chain: readonly string[]): Walk {
	return { source, chain, depth: 0, known: new Map(), active: new Set() };
}

export function resolveVariable(
	source: ResolveSource,
	id: string,
	chain: readonly string[],
): Literal | null {
	return variableFrom(startWalk(source, chain), id, 0);
}

export function resolveValue(
	source: ResolveSource,
	value: VariableValue,
	chain: readonly string[],
): Literal | null {
	return valueAt(startWalk(source, chain), value, 0);
}

export function heldValue(
	source: ResolveSource,
	id: string,
	chain: readonly string[],
): VariableValue | null {
	const declared = source.declared(id);
	return declared === null ? null : nearest(source, declared, chain).held;
}
