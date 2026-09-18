import type { Size } from "./length";

export type Direction = "row" | "column";

export type GuideAxis = "x" | "y";

type FlexLayout = { kind: "flex"; direction: Direction; gap: number; padding: number };

export type GridLayout = {
	kind: "grid";
	columns: number;
	rows: number;
	gap: number;
	padding: number;
};

export type Layout = { kind: "free" } | FlexLayout | GridLayout;

export type LayoutKind = Layout["kind"];

export interface Cell {
	column: number;
	row: number;
}

export interface Guide {
	axis: GuideAxis;
	at: number;
}

export interface LaidChild<Id> extends Size {
	id: Id;
	cell: Cell | null;
}

export interface Placement {
	x: number;
	y: number;
	slot: Cell | null;
}

export interface Point {
	x: number;
	y: number;
}

export interface GridTracks {
	columns: number;
	rows: number;
	cell: Size;
	gap: number;
	padding: number;
}

export const FREE_LAYOUT: Layout = { kind: "free" };
export const NO_GUIDES: readonly Guide[] = [];
const NO_PLACEMENTS: ReadonlyMap<never, Placement> = new Map<never, Placement>();

function flexPlacements<Id>(
	layout: FlexLayout,
	children: readonly LaidChild<Id>[],
): ReadonlyMap<Id, Placement> {
	const placements = new Map<Id, Placement>();
	const along = layout.direction === "row" ? "width" : "height";
	let offset = layout.padding;
	for (const child of children) {
		const x = along === "width" ? offset : layout.padding;
		const y = along === "width" ? layout.padding : offset;
		placements.set(child.id, { x, y, slot: null });
		offset += child[along] + layout.gap;
	}
	return placements;
}

function trackSize(extent: number, count: number, layout: GridLayout): number {
	return Math.max(0, (extent - 2 * layout.padding - layout.gap * (count - 1)) / count);
}

export function gridTracks(container: Size, layout: GridLayout): GridTracks {
	const columns = Math.max(1, Math.floor(layout.columns));
	const rows = Math.max(1, Math.floor(layout.rows));
	return {
		columns,
		rows,
		cell: {
			width: trackSize(container.width, columns, layout),
			height: trackSize(container.height, rows, layout),
		},
		gap: layout.gap,
		padding: layout.padding,
	};
}

function clampIndex(index: number, count: number): number {
	return Math.min(Math.max(0, Math.floor(index)), count - 1);
}

function clampCell(cell: Cell, tracks: GridTracks): Cell {
	return {
		column: clampIndex(cell.column, tracks.columns),
		row: clampIndex(cell.row, tracks.rows),
	};
}

function slotOf(cell: Cell, tracks: GridTracks): number {
	return cell.row * tracks.columns + cell.column;
}

function cellOfSlot(slot: number, tracks: GridTracks): Cell {
	return { column: slot % tracks.columns, row: Math.floor(slot / tracks.columns) };
}

function cellOrigin(cell: Cell, tracks: GridTracks): Point {
	return {
		x: tracks.padding + cell.column * (tracks.cell.width + tracks.gap),
		y: tracks.padding + cell.row * (tracks.cell.height + tracks.gap),
	};
}

function nextFreeSlot(taken: ReadonlySet<number>, from: number): number {
	let slot = from;
	while (taken.has(slot)) {
		slot += 1;
	}
	return slot;
}

function gridPlacements<Id>(
	container: Size,
	layout: GridLayout,
	children: readonly LaidChild<Id>[],
): ReadonlyMap<Id, Placement> {
	const tracks = gridTracks(container, layout);
	const cells = new Map<Id, Cell>();
	const taken = new Set<number>();
	for (const child of children) {
		if (child.cell !== null) {
			const cell = clampCell(child.cell, tracks);
			cells.set(child.id, cell);
			taken.add(slotOf(cell, tracks));
		}
	}
	let cursor = 0;
	for (const child of children) {
		if (child.cell === null) {
			cursor = nextFreeSlot(taken, cursor);
			cells.set(child.id, cellOfSlot(cursor, tracks));
			cursor += 1;
		}
	}
	return new Map(
		[...cells].map(([id, cell]) => [id, { ...cellOrigin(cell, tracks), slot: cell }] as const),
	);
}

export function placeChildren<Id>(
	container: Size,
	layout: Layout,
	children: readonly LaidChild<Id>[],
): ReadonlyMap<Id, Placement> {
	if (layout.kind === "flex") {
		return flexPlacements(layout, children);
	}
	return layout.kind === "grid" ? gridPlacements(container, layout, children) : NO_PLACEMENTS;
}

function trackAt(offset: number, size: number, tracks: GridTracks, count: number): number {
	const pitch = size + tracks.gap;
	return pitch <= 0 ? 0 : clampIndex((offset - tracks.padding) / pitch, count);
}

export function cellAt(container: Size, layout: GridLayout, point: Point): Cell {
	const tracks = gridTracks(container, layout);
	return {
		column: trackAt(point.x, tracks.cell.width, tracks, tracks.columns),
		row: trackAt(point.y, tracks.cell.height, tracks, tracks.rows),
	};
}

export function sameCell(held: Cell | null, next: Cell | null): boolean {
	if (held === null || next === null) {
		return held === next;
	}
	return held.column === next.column && held.row === next.row;
}

export function samePlacement(held: Placement | undefined, next: Placement | undefined): boolean {
	if (held === undefined || next === undefined) {
		return held === next;
	}
	return held.x === next.x && held.y === next.y && sameCell(held.slot, next.slot);
}
