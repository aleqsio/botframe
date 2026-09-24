import { DOCUMENT_SCOPE, fitsType, isReference } from "./variable";
import type { Literal, Variable, VariableValue } from "./variable";

export interface Declared {
	variable: Variable;
	owner: string;
}

export interface ResolveSource {
	declared: (id: string) => Declared | null;
	assigned: (copy: string, id: string) => VariableValue | undefined;
	componentOf: (copy: string) => string | null;
	cell: (owner: string, choice: string, option: string, id: string) => VariableValue | undefined;
	drivingChoice: (owner: string, id: string) => string | null;
}

type Origin =
	| { kind: "assigned"; copy: string; variable: string }
	| { kind: "table"; owner: string; choice: string; option: string; variable: string }
	| { kind: "initial"; owner: string; variable: string };

export interface Found {
	value: Literal;
	origin: Origin;
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

function deref(walk: Walk, value: VariableValue, at: number, origin: Origin): Found | null {
	return isReference(value) ? resolveFrom(deeper(walk), value.var, at) : { value, origin };
}

function fromScope(walk: Walk, declared: Declared, at: number): Found | null {
	const { owner, variable } = declared;
	const choice = walk.source.drivingChoice(owner, variable.id);
	const option = choice === null ? null : resolveFrom(deeper(walk), choice, at)?.value;
	if (choice !== null && typeof option === "string") {
		const cell = walk.source.cell(owner, choice, option, variable.id);
		if (cell !== undefined) {
			const origin = { kind: "table", owner, choice, option, variable: variable.id } as const;
			return deref(walk, cell, at, origin);
		}
	}
	return deref(walk, variable.initial, at, { kind: "initial", owner, variable: variable.id });
}

function resolveFrom(walk: Walk, id: string, from: number): Found | null {
	const declared = walk.depth > MAX_DEPTH ? null : walk.source.declared(id);
	if (declared === null) {
		return null;
	}
	for (let at = from; at < walk.chain.length; at += 1) {
		const copy = walk.chain[at] ?? "";
		const held = walk.source.assigned(copy, id);
		if (held !== undefined) {
			return deref(walk, held, at + 1, { kind: "assigned", copy, variable: id });
		}
		if (declared.owner !== DOCUMENT_SCOPE && walk.source.componentOf(copy) === declared.owner) {
			return fromScope(walk, declared, at);
		}
	}
	return fromScope(walk, declared, declared.owner === DOCUMENT_SCOPE ? 0 : walk.chain.length);
}

export function traceVariable(
	source: ResolveSource,
	id: string,
	chain: readonly string[],
): Found | null {
	const declared = source.declared(id);
	const found = resolveFrom({ source, chain, depth: 0 }, id, 0);
	if (declared === null || found === null) {
		return null;
	}
	const { variable, owner } = declared;
	if (fitsType(variable.type, variable.options, found.value)) {
		return found;
	}
	const { initial } = variable;
	return isReference(initial) || !fitsType(variable.type, variable.options, initial)
		? null
		: { value: initial, origin: { kind: "initial", owner, variable: id } };
}

export function resolveVariable(
	source: ResolveSource,
	id: string,
	chain: readonly string[],
): Literal | null {
	return traceVariable(source, id, chain)?.value ?? null;
}
