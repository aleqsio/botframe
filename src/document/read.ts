import { LoroMap } from "loro-crdt";

function asMap(value: unknown): LoroMap | null {
	return value instanceof LoroMap ? value : null;
}

export function readNumber(data: LoroMap | null, key: string, fallback: number): number {
	const value = data?.get(key);
	return typeof value === "number" ? value : fallback;
}

export function readString(data: LoroMap | null, key: string, fallback: string): string {
	const value = data?.get(key);
	return typeof value === "string" ? value : fallback;
}

export function readVariant<T>(
	bag: unknown,
	readers: Readonly<Record<string, (fields: LoroMap | null) => T>>,
	fallback: T,
): T {
	const map = asMap(bag);
	const kind = readString(map, "kind", "");
	const read = readers[kind];
	return read === undefined ? fallback : read(asMap(map?.get(kind)));
}
