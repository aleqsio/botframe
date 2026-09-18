import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import type { Layer } from "../../../document/layer";
import type { BoxKey } from "../../../document/length";
import type { PositionMode } from "../../../document/layout";
import { boxField } from "../layerFields";
import { LayerChip } from "./LayerChip";
import { Segmented } from "./Segmented";
import type { SegmentOption } from "./Segmented";

const PLACE_KEYS: readonly { label: string; key: BoxKey }[] = [
	{ label: "X", key: "x" },
	{ label: "Y", key: "y" },
];

function positionOptions(blocked: boolean): readonly SegmentOption<PositionMode>[] {
	return [
		{ value: "offset", label: "Offset", disabled: blocked },
		{ value: "absolute", label: "Absolute" },
	];
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
					value={blocked ? "absolute" : layer.layout.position}
				/>
			</div>
			<div className="chip-row">
				{PLACE_KEYS.map(({ key, label }) => (
					<LayerChip doc={doc} field={boxField(label, key, layer, basis)} key={key} layer={layer} />
				))}
			</div>
		</>
	);
}
