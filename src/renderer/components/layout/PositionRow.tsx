import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import type { Layer } from "../../../document/layer";
import type { Basis, BoxKey } from "../../../document/length";
import { POSITION_MODES } from "../../../document/layout";
import type { PositionMode } from "../../../document/layout";
import { boxField } from "../layerFields";
import { editEach, plainEdit, useTargets } from "../targets";
import { LayerChip } from "./LayerChip";
import { Segmented } from "./Segmented";
import type { SegmentOption } from "./Segmented";

const PLACE_KEYS: readonly { label: string; key: BoxKey }[] = [
	{ label: "X", key: "x" },
	{ label: "Y", key: "y" },
];

const POSITION_LABEL: Readonly<Record<PositionMode, string>> = {
	default: "Default",
	offset: "Offset",
	absolute: "Absolute",
};

const POSITION_OPTIONS: readonly SegmentOption<PositionMode>[] = POSITION_MODES.map((mode) => ({
	value: mode,
	label: POSITION_LABEL[mode],
}));

export function PositionRow({
	blocked,
	doc,
	layer,
}: {
	blocked: boolean;
	doc: DesignDocument;
	layer: Layer;
}): ReactElement {
	const targets = useTargets();
	const basisOf = (target: Layer): Basis => doc.basisOf(target.id);
	const mode = blocked ? "absolute" : layer.layout.position;

	return (
		<>
			{blocked ? null : (
				<div className="layout-row">
					<Segmented
						label="Position"
						onPick={(next) => {
							editEach(doc, targets, plainEdit({ layout: { position: next } }));
							doc.commit("set position");
						}}
						options={POSITION_OPTIONS}
						value={mode}
					/>
				</div>
			)}
			{mode === "default" ? null : (
				<div className="chip-row">
					{PLACE_KEYS.map(({ key, label }) => (
						<LayerChip
							doc={doc}
							field={boxField(label, key, layer, basisOf)}
							key={key}
							layer={layer}
						/>
					))}
				</div>
			)}
		</>
	);
}
