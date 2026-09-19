import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import type { Layer } from "../../../document/layer";
import type { BoxKey } from "../../../document/length";
import { POSITION_MODES } from "../../../document/layout";
import type { PositionMode } from "../../../document/layout";
import { boxField } from "../layerFields";
import { LayerChip } from "./LayerChip";
import { Segmented } from "./Segmented";
import type { SegmentOption } from "./Segmented";

const PLACE_KEYS: readonly { label: string; key: BoxKey }[] = [
	{ label: "X", key: "x" },
	{ label: "Y", key: "y" },
];

const POSITION_LABEL: Readonly<Record<PositionMode, string>> = {
	flow: "Flow",
	offset: "Offset",
	absolute: "Absolute",
};

function positionOptions(blocked: boolean): readonly SegmentOption<PositionMode>[] {
	return POSITION_MODES.map((mode) => ({
		value: mode,
		label: POSITION_LABEL[mode],
		disabled: blocked && mode !== "absolute",
	}));
}

export function PositionRow({
	blocked,
	doc,
	layer,
}: {
	blocked: boolean;
	doc: DesignDocument;
	layer: Layer;
}): ReactElement {
	const basis = doc.basisOf(layer.id);
	const mode = blocked ? "absolute" : layer.layout.position;

	return (
		<>
			<div className="layout-row">
				<Segmented
					label="Position"
					onPick={(next) => {
						doc.update(layer.id, { layout: { position: next } });
						doc.commit("set position");
					}}
					options={positionOptions(blocked)}
					value={mode}
				/>
			</div>
			{mode === "flow" ? null : (
				<div className="chip-row">
					{PLACE_KEYS.map(({ key, label }) => (
						<LayerChip
							doc={doc}
							field={boxField(label, key, layer, basis)}
							key={key}
							layer={layer}
						/>
					))}
				</div>
			)}
		</>
	);
}
