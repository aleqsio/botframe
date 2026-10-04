import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import { isChanged } from "../../../document/layer";
import type { Layer } from "../../../document/layer";
import type { LayerLayout, Placement } from "../../../document/layout";
import { CellPicker } from "./CellPicker";
import { Segmented } from "./Segmented";
import type { SegmentOption } from "./Segmented";
import { anchorOf, clampPlacement, placedAt } from "./cellPlacement";
import { placementText } from "./selfText";
import { ChangedMark } from "../ChangedMark";

const CELL_MODES: readonly SegmentOption<Placement["mode"]>[] = [
	{ value: "auto", label: "Auto" },
	{ value: "place", label: "Place" },
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

	const changed = isChanged(layer, "layout.cell");
	return (
		<ChangedMark changed={changed}>
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
		</ChangedMark>
	);
}
