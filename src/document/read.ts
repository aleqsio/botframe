import { LoroMap } from "loro-crdt";

export interface FieldSource {
	get: (key: string) => unknown;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asSource(value: unknown): FieldSource | null {
	if (value instanceof LoroMap) {
		return value;
	}
	return isRecord(value) ? { get: (key) => value[key] } : null;
}

export function readNumber(data: FieldSource | null, key: string, fallback: number): number {
	const value = data?.get(key);
	return typeof value === "number" ? value : fallback;
}

export function readBoolean(data: FieldSource | null, key: string, fallback: boolean): boolean {
	const value = data?.get(key);
	return typeof value === "boolean" ? value : fallback;
}

export function readString(data: FieldSource | null, key: string, fallback: string): string {
	const value = data?.get(key);
	return typeof value === "string" ? value : fallback;
}

export function readVariant<T>(
	bag: unknown,
	readers: Readonly<Record<string, (fields: FieldSource | null) => T>>,
	fallback: T,
): T {
	const source = asSource(bag);
	const kind = readString(source, "kind", "");
	const read = readers[kind];
	return read === undefined ? fallback : read(asSource(source?.get(kind)));
}
