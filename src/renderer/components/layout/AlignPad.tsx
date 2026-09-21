import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import type { Layer } from "../../../document/layer";
import type { LayerLayout } from "../../../document/layout";
import { editEach, useTargets } from "../targets";
import { activeCell, alignAt, onCrossLine, spreadBar } from "./padCells";
import type { PadCell } from "./padCells";

const DOWN: readonly string[] = ["top", "middle", "bottom"];
const ACROSS: readonly string[] = ["left", "center", "right"];

interface PadButton extends PadCell {
	name: string;
}

const BUTTONS: readonly PadButton[] = DOWN.flatMap((down, row) =>
	ACROSS.map((across, column) => ({ row, column, name: `Align ${down} ${across}` })),
);

function isOn(layout: LayerLayout, cell: PadCell): boolean {
	if (layout.distribute !== "pack") {
		return onCrossLine(layout, cell);
	}
	const active = activeCell(layout);
	return active.row === cell.row && active.column === cell.column;
}

export function AlignPad({ doc, layer }: { doc: DesignDocument; layer: Layer }): ReactElement {
	const targets = useTargets();
	const { layout } = layer;
	const spread = layout.distribute !== "pack";
	const marks = spreadBar(layout);

	return (
		<div className={spread ? "layout-alignpad layout-alignpad-spread" : "layout-alignpad"}>
			{spread ? (
				<>
					<span className="layout-alignpad-ring" style={marks.ring} />
					<span className="layout-alignpad-bar" style={marks.bar} />
				</>
			) : null}
			{BUTTONS.map((button) => (
				<button
					aria-label={button.name}
					aria-pressed={isOn(layout, button)}
					className="layout-alignpad-cell"
					key={button.name}
					onClick={() => {
						editEach(doc, targets, (target) => ({
							layout: { align: alignAt(target.layout, button) },
						}));
						doc.commit("set align");
					}}
					title={button.name}
					type="button"
				/>
			))}
		</div>
	);
}
