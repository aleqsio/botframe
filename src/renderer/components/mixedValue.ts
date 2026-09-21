interface MixedState {
	kind: "mixed";
}

export type Mixed<T> = { kind: "same"; value: T } | MixedState;

const MIXED: MixedState = { kind: "mixed" };

export const MIXED_TEXT = "Mixed";

export function sharedOf<T>(values: readonly T[]): Mixed<T> | null {
	const [first, ...rest] = values;
	if (first === undefined) {
		return null;
	}
	return rest.every((value) => Object.is(value, first)) ? { kind: "same", value: first } : MIXED;
}

export function mixedText<T>(shared: Mixed<T> | null, show: (value: T) => string): string {
	if (shared === null) {
		return "";
	}
	return shared.kind === "mixed" ? MIXED_TEXT : show(shared.value);
}
