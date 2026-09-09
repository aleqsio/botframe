import type { LoroMap } from "loro-crdt";

export function writeVariant<T extends { kind: string }>(
	bag: LoroMap,
	variant: "unsupported" extends T["kind"] ? never : T,
): void {
	const { kind, ...fields } = variant;
	bag.set("kind", kind);
	const values = bag.ensureMergeableMap(kind);
	for (const [key, value] of Object.entries(fields)) {
		values.set(key, value);
	}
}
