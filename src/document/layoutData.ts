import { FREE_LAYOUT, NO_GUIDES } from "./layout";
import type { Cell, Direction, Guide, Layout, LayoutKind } from "./layout";
import { isBag, readNumber, readString } from "./read";
import type { FieldSource } from "./read";

function directionOf(fields: FieldSource | null): Direction {
	return readString(fields, "direction", "row") === "column" ? "column" : "row";
}

function spaceOf(fields: FieldSource | null, key: string): number {
	const value = readNumber(fields, key, 0);
	return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function tracksOf(fields: FieldSource | null, key: string): number {
	const value = readNumber(fields, key, 1);
	return Number.isFinite(value) ? Math.max(1, Math.floor(value)) : 1;
}

function trackIndexOf(fields: FieldSource, key: string): number {
	const value = readNumber(fields, key, 0);
	return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

export const LAYOUT_READERS: Readonly<Record<LayoutKind, (fields: FieldSource | null) => Layout>> =
	{
		free: () => FREE_LAYOUT,
		flex: (fields) => ({
			kind: "flex",
			direction: directionOf(fields),
			gap: spaceOf(fields, "gap"),
			padding: spaceOf(fields, "padding"),
		}),
		grid: (fields) => ({
			kind: "grid",
			columns: tracksOf(fields, "columns"),
			rows: tracksOf(fields, "rows"),
			gap: spaceOf(fields, "gap"),
			padding: spaceOf(fields, "padding"),
		}),
	};

export function layoutOf(kind: string, fields: FieldSource | null): Layout {
	const readers: Readonly<Record<string, (fields: FieldSource | null) => Layout>> = LAYOUT_READERS;
	return readers[kind]?.(fields) ?? FREE_LAYOUT;
}

export function cellOf(fields: FieldSource | null): Cell | null {
	return fields === null
		? null
		: { column: trackIndexOf(fields, "column"), row: trackIndexOf(fields, "row") };
}

function guideOf(value: unknown): Guide | null {
	if (!isBag(value)) {
		return null;
	}
	const axis = value["axis"];
	const at = value["at"];
	if ((axis !== "x" && axis !== "y") || typeof at !== "number" || !Number.isFinite(at)) {
		return null;
	}
	return { axis, at };
}

export function guidesOf(value: unknown): readonly Guide[] {
	if (!Array.isArray(value)) {
		return NO_GUIDES;
	}
	const guides = value.flatMap((item: unknown) => guideOf(item) ?? []);
	return guides.length === 0 ? NO_GUIDES : guides;
}
