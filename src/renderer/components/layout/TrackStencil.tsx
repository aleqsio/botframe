import type { CSSProperties, ReactElement, ReactNode } from "react";
import type { Track } from "../../../document/layout";
import { trackLabel } from "./tracks";
import type { TrackEdit } from "./tracks";

interface StencilCell {
	row: number;
	column: number;
}

function cellsOf(columns: number, rows: number): readonly StencilCell[] {
	return Array.from({ length: rows * columns }, (_unused, index) => ({
		row: Math.floor(index / columns),
		column: index % columns,
	}));
}

function cellClass(edit: TrackEdit | null, cell: StencilCell): string {
	if (edit === null) {
		return "layout-stencil-cell";
	}
	const line = edit.axis === "columns" ? cell.column : cell.row;
	if (line !== edit.index) {
		return "layout-stencil-cell";
	}
	return edit.axis === "columns"
		? "layout-stencil-cell layout-stencil-on"
		: "layout-stencil-cell layout-stencil-under";
}

export function TrackStencil({
	bar,
	columns,
	edit,
	onOpen,
	rows,
	template,
}: {
	bar: ReactNode;
	columns: readonly Track[];
	edit: TrackEdit | null;
	onOpen: (column: number) => void;
	rows: readonly Track[];
	template: CSSProperties;
}): ReactElement {
	return (
		<div className="layout-stencil-body">
			<div className="layout-stencil" style={template}>
				{cellsOf(columns.length, rows.length).map((cell) => (
					<button
						aria-label={trackLabel("columns", cell.column)}
						className={cellClass(edit, cell)}
						key={`${cell.row} ${cell.column}`}
						onClick={() => {
							onOpen(cell.column);
						}}
						type="button"
					/>
				))}
			</div>
			{edit === null || edit.axis === "columns" ? null : (
				<div className="layout-rowlayer" style={{ gridTemplateRows: template.gridTemplateRows }}>
					<div className="layout-rowband" style={{ gridRow: edit.index + 1 }}>
						{bar}
					</div>
				</div>
			)}
		</div>
	);
}
