import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import type { Layer } from "../../../document/layer";
import type { LayerLayout, Placement } from "../../../document/layout";
import { CellPicker } from "./CellPicker";
import { Segmented } from "./Segmented";
import type { SegmentOption } from "./Segmented";
import { anchorOf, clampPlacement, placedAt } from "./cellPlacement";
import { placementText } from "./selfText";

const CELL_MODES: readonly SegmentOption<Placement["mode"]>[] = [
	{ value: "auto", label: "Auto", title: "The grid puts the layer in the next free cell." },
	{ value: "place", label: "Place", title: "Write the column and the row of the layer." },
];

export function CellSection({
	doc,
	layer,
	tracks,
}: {
	doc: DesignDocument;
	layer: Layer;
	tracks: LayerLayout["tracks"];
}): ReactElement {
	const cell = clampPlacement(layer.layout.cell, tracks.columns.length, tracks.rows.length);

	return (
		<>
			<div className="layout-row">
				<Segmented
					label="Cell"
					onPick={(mode) => {
						const anchor = anchorOf(cell);
						doc.update(layer.id, {
							layout: { cell: mode === "auto" ? { mode } : placedAt(anchor, anchor) },
						});
						doc.commit("set cell");
					}}
					options={CELL_MODES}
					value={cell.mode}
				/>
			</div>
			<CellPicker cell={cell} doc={doc} layer={layer} tracks={tracks} />
			<p className="layout-note">{placementText(cell)}</p>
		</>
	);
}
