import type { CSSProperties } from "react";
import { ALIGNMENTS } from "../../../document/layout";
import type { Alignment, LayerLayout } from "../../../document/layout";

export interface PadCell {
	row: number;
	column: number;
}

const THIRD = 100 / 3;
const BAR = 3;
const EDGE = 1;

function lineOf(alignment: Alignment): number {
	return ALIGNMENTS.indexOf(alignment);
}

function alignmentAt(index: number): Alignment {
	return ALIGNMENTS[index] ?? "start";
}

function isVertical(layout: LayerLayout): boolean {
	return layout.display === "column";
}

export function crossLine(layout: LayerLayout): number {
	return lineOf(layout.align.cross);
}

export function alignAt(layout: LayerLayout, cell: PadCell): LayerLayout["align"] {
	const vertical = isVertical(layout);
	const cross = alignmentAt(vertical ? cell.column : cell.row);
	if (layout.distribute !== "pack") {
		return { ...layout.align, cross };
	}
	return { ...layout.align, main: alignmentAt(vertical ? cell.row : cell.column), cross };
}

export function activeCell(layout: LayerLayout): PadCell {
	const main = lineOf(layout.align.main);
	const cross = crossLine(layout);
	return isVertical(layout) ? { row: main, column: cross } : { row: cross, column: main };
}

export function onCrossLine(layout: LayerLayout, cell: PadCell): boolean {
	return (isVertical(layout) ? cell.column : cell.row) === crossLine(layout);
}

function percent(lines: number): string {
	return `${(lines * THIRD).toFixed(3)}%`;
}

export function spreadBar(layout: LayerLayout): { bar: CSSProperties; ring: CSSProperties } {
	const line = crossLine(layout);
	const edge = `calc(${percent(line)} + ${EDGE}px)`;
	const middle = `calc(${percent(line + 0.5)} - ${BAR / 2}px)`;
	const span = `calc(${percent(1)} - ${EDGE * 2}px)`;
	if (isVertical(layout)) {
		return {
			bar: { left: middle, top: `${BAR}px`, bottom: `${BAR}px`, width: `${BAR}px` },
			ring: { left: edge, top: `${EDGE}px`, bottom: `${EDGE}px`, width: span },
		};
	}
	return {
		bar: { top: middle, left: `${BAR}px`, right: `${BAR}px`, height: `${BAR}px` },
		ring: { top: edge, left: `${EDGE}px`, right: `${EDGE}px`, height: span },
	};
}
