import type { Placement, Span } from "../../../document/layout";

export interface Cell {
	column: number;
	row: number;
}

const FIRST: Cell = { column: 1, row: 1 };

function spanBetween(one: number, two: number): Span {
	return { start: Math.min(one, two), end: Math.max(one, two) + 1 };
}

export function anchorOf(cell: Placement): Cell {
	return cell.mode === "auto" ? FIRST : { column: cell.column.start, row: cell.row.start };
}

export function placedAt(anchor: Cell, at: Cell): Placement {
	return {
		mode: "place",
		column: spanBetween(anchor.column, at.column),
		row: spanBetween(anchor.row, at.row),
	};
}

function inSpan(span: Span, line: number): boolean {
	return line >= span.start && line < span.end;
}

export function holdsCell(cell: Placement, at: Cell): boolean {
	return cell.mode === "place" && inSpan(cell.column, at.column) && inSpan(cell.row, at.row);
}
