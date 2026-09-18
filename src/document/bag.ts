export type Bag = Readonly<Record<string, unknown>>;

const NOTHING: Bag = {};

function isBag(value: unknown): value is Bag {
	return typeof value === "object" && value !== null;
}

export function isList(value: unknown): value is readonly unknown[] {
	return Array.isArray(value);
}

export function bagOf(value: unknown): Bag {
	return isBag(value) ? value : NOTHING;
}

export function listOf(value: unknown): readonly unknown[] {
	return isList(value) ? value : [];
}
