import { LoroMap } from "loro-crdt";
import { storedVariable, variableOf } from "./variable";
import type { Variable } from "./variable";

const VARIABLES = "variables";

function shallowOf(value: unknown): Readonly<Record<string, unknown>> {
	return value instanceof LoroMap ? value.getShallowValue() : {};
}

export class Scope {
	readonly #map: LoroMap;
	readonly #onChange: () => void;
	#variables: readonly Variable[] | null = null;

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

	put(variable: Variable): void {
		this.#map.ensureMergeableMap(VARIABLES).set(variable.id, storedVariable(variable));
		this.forget();
	}

	remove(id: string): void {
		this.#map.ensureMergeableMap(VARIABLES).delete(id);
		this.forget();
	}

	forget(): void {
		this.#variables = null;
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
}
