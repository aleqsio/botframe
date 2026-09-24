import { LoroMap } from "loro-crdt";
import { bagOf, listOf } from "./bag";
import { isReference, valueOf, variableOf } from "./variable";
import type { Variable, VariableValue } from "./variable";

const VARIABLES = "variables";
const TABLES = "tables";

export interface Cell {
	choice: string;
	option: string;
	variable: string;
}

function cellKey(cell: Cell): string {
	return JSON.stringify([cell.choice, cell.option, cell.variable]);
}

export function cellFrom(value: unknown): Cell | null {
	const { choice, option, variable } = bagOf(value);
	return typeof choice === "string" && typeof option === "string" && typeof variable === "string"
		? { choice, option, variable }
		: null;
}

function cellOf(key: string): Cell | null {
	try {
		const parsed: unknown = JSON.parse(key);
		const [choice, option, variable] = listOf(parsed);
		return cellFrom({ choice, option, variable });
	} catch {
		return null;
	}
}

function shallowOf(value: unknown): Readonly<Record<string, unknown>> {
	return value instanceof LoroMap ? value.getShallowValue() : {};
}

function stored(variable: Variable): Record<string, unknown> {
	const { name, type, initial, options, prop } = variable;
	return { name, type, initial, options, prop };
}

export interface ScopeView {
	variables: readonly Variable[];
	cells: ReadonlyMap<string, VariableValue>;
}

export function cellIn(view: ScopeView, cell: Cell): VariableValue | undefined {
	return view.cells.get(cellKey(cell));
}

export function drivingIn(view: ScopeView, variable: string): string | null {
	for (const key of view.cells.keys()) {
		const cell = cellOf(key);
		if (cell?.variable === variable) {
			return cell.choice;
		}
	}
	return null;
}

export function drivenIn(view: ScopeView, choice: string): ReadonlySet<string> {
	const driven = new Set<string>();
	for (const key of view.cells.keys()) {
		const cell = cellOf(key);
		if (cell?.choice === choice) {
			driven.add(cell.variable);
		}
	}
	return driven;
}

export class Scope {
	readonly #map: LoroMap;
	readonly #onChange: () => void;
	#variables: readonly Variable[] | null = null;
	#cells: ReadonlyMap<string, VariableValue> | null = null;
	#view: ScopeView | null = null;

	constructor(map: LoroMap, onChange: () => void) {
		this.#map = map;
		this.#onChange = onChange;
		if (map.isAttached()) {
			map.subscribe(() => {
				this.forget();
			});
		}
	}

	isOn(map: LoroMap): boolean {
		return this.#map.id === map.id;
	}

	variables(): readonly Variable[] {
		this.#variables ??= this.#readVariables();
		return this.#variables;
	}

	view(): ScopeView {
		this.#view ??= { variables: this.variables(), cells: this.#cellMap() };
		return this.#view;
	}

	put(variable: Variable): void {
		this.#variableMap().set(variable.id, stored(variable));
		this.forget();
	}

	remove(id: string): void {
		this.#variableMap().delete(id);
		for (const [key] of this.#readCells()) {
			const cell = cellOf(key);
			if (cell !== null && (cell.choice === id || cell.variable === id)) {
				this.#tableMap().delete(key);
			}
		}
		this.forget();
	}

	cell(cell: Cell): VariableValue | undefined {
		return cellIn(this.view(), cell);
	}

	setCell(cell: Cell, value: VariableValue | null): void {
		if (value === null) {
			this.#tableMap().delete(cellKey(cell));
		} else {
			this.#tableMap().set(cellKey(cell), isReference(value) ? { var: value.var } : value);
		}
		this.forget();
	}

	takeOut(choice: string, variable: string): void {
		for (const [cell] of this.cells()) {
			if (cell.choice === choice && cell.variable === variable) {
				this.#tableMap().delete(cellKey(cell));
			}
		}
		this.forget();
	}

	dropOptions(choice: string, options: readonly string[]): void {
		for (const [cell] of this.cells()) {
			if (cell.choice === choice && !options.includes(cell.option)) {
				this.#tableMap().delete(cellKey(cell));
			}
		}
		this.forget();
	}

	cells(): readonly (readonly [Cell, VariableValue])[] {
		return [...this.#cellMap()].flatMap(([key, value]) => {
			const cell = cellOf(key);
			return cell === null ? [] : [[cell, value] as const];
		});
	}

	drivingChoice(variable: string): string | null {
		return drivingIn(this.view(), variable);
	}

	forget(): void {
		this.#variables = null;
		this.#cells = null;
		this.#view = null;
		this.#onChange();
	}

	#readVariables(): readonly Variable[] {
		const values = shallowOf(this.#map.get(VARIABLES));
		return Object.entries(values)
			.flatMap(([id, value]) => {
				const variable = variableOf(id, value);
				return variable === null ? [] : [variable];
			})
			.toSorted((left, right) => left.name.localeCompare(right.name));
	}

	#cellMap(): ReadonlyMap<string, VariableValue> {
		this.#cells ??= this.#readCells();
		return this.#cells;
	}

	#readCells(): ReadonlyMap<string, VariableValue> {
		const cells = new Map<string, VariableValue>();
		const values = shallowOf(this.#map.get(TABLES));
		for (const [key, value] of Object.entries(values)) {
			const held = valueOf(value);
			if (held !== null && cellOf(key) !== null) {
				cells.set(key, held);
			}
		}
		return cells;
	}

	#variableMap(): LoroMap {
		return this.#map.ensureMergeableMap(VARIABLES);
	}

	#tableMap(): LoroMap {
		return this.#map.ensureMergeableMap(TABLES);
	}
}
