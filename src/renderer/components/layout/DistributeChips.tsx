import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import type { Layer } from "../../../document/layer";
import type { Distribute } from "../../../document/layout";
import { Segmented } from "./Segmented";
import type { SegmentOption } from "./Segmented";

const LABEL: Readonly<Record<Distribute, string>> = {
	pack: "Pack",
	between: "Between",
	around: "Around",
	evenly: "Evenly",
};

const OPTIONS: readonly SegmentOption<Distribute>[] = (
	["pack", "between", "around", "evenly"] as const
).map((distribute) => ({
	value: distribute,
	label: LABEL[distribute],
	title: LABEL[distribute],
}));

export function DistributeChips({
	doc,
	layer,
}: {
	doc: DesignDocument;
	layer: Layer;
}): ReactElement {
	return (
		<div className="layout-row">
			<Segmented
				label="Distribute"
				onPick={(next) => {
					doc.update(layer.id, { layout: { distribute: next } });
					doc.commit("set distribute");
				}}
				options={OPTIONS}
				value={layer.layout.distribute}
			/>
		</div>
	);
}
