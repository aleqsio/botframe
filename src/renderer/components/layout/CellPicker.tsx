import { useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import type { LayerId } from "../../../document/layer";
import type { LayerLayout, Placement } from "../../../document/layout";
import { editEach, useTargets } from "../targets";
import { anchorOf, clampPlacement, holdsCell, placedAt } from "./cellPlacement";
import type { Cell } from "./cellPlacement";

function cellAt(target: Element | null): Cell | null {
	const button = target?.closest<HTMLElement>("button[data-column]") ?? null;
	const { column, row } = button?.dataset ?? {};
	if (column === undefined || row === undefined) {
		return null;
	}
	return { column: Number(column), row: Number(row) };
}

function lines(count: number): readonly number[] {
	return Array.from({ length: count }, (_unused, index) => index + 1);
}

function CellButtons({
	cell,
	columns,
	rows,
}: {
	cell: Placement;
	columns: number;
	rows: number;
}): ReactElement {
	return (
		<>
			{lines(rows).map((row) =>
				lines(columns).map((column) => (
					<button
						aria-label={`column ${column} row ${row}`}
						aria-pressed={holdsCell(cell, { column, row })}
						className="layout-cell"
						data-column={column}
						data-row={row}
						key={`${column} ${row}`}
						type="button"
					/>
				)),
			)}
		</>
	);
}

export function CellPicker({
	cell,
	doc,
	parent,
	tracks,
}: {
	cell: Placement;
	doc: DesignDocument;
	parent: LayerId | null;
	tracks: LayerLayout["tracks"];
}): ReactElement {
	const [anchor, setAnchor] = useState<Cell | null>(null);
	const targets = useTargets();
	const write = (next: Placement): void => {
		const held = clampPlacement(next, tracks.columns.length, tracks.rows.length);
		editEach(doc, targets, (target) =>
			target.parent === parent ? { layout: { cell: held } } : null,
		);
	};

	function begin(event: ReactPointerEvent<HTMLElement>): void {
		const at = cellAt(event.target instanceof Element ? event.target : null);
		if (at === null) {
			return;
		}
		event.currentTarget.setPointerCapture(event.pointerId);
		const from = event.shiftKey ? anchorOf(cell) : at;
		setAnchor(from);
		write(placedAt(from, at));
	}

	function extend(event: ReactPointerEvent<HTMLElement>): void {
		const at =
			anchor === null ? null : cellAt(document.elementFromPoint(event.clientX, event.clientY));
		if (at !== null && anchor !== null) {
			write(placedAt(anchor, at));
		}
	}

	function settle(): void {
		if (anchor !== null) {
			setAnchor(null);
			doc.commit("set cell");
		}
	}

	return (
		<div
			aria-disabled={cell.mode === "auto"}
			className={cell.mode === "auto" ? "layout-cells layout-cells-auto" : "layout-cells"}
			onPointerCancel={settle}
			onPointerDown={begin}
			onPointerMove={extend}
			onPointerUp={settle}
			style={{
				gridTemplateColumns: `repeat(${tracks.columns.length}, minmax(0, 1fr))`,
				gridTemplateRows: `repeat(${tracks.rows.length}, minmax(0, 1fr))`,
			}}
		>
			<CellButtons cell={cell} columns={tracks.columns.length} rows={tracks.rows.length} />
		</div>
	);
}
