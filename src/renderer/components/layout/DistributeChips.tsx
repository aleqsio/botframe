import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import type { Layer } from "../../../document/layer";
import { DISTRIBUTIONS } from "../../../document/layout";
import type { Distribute } from "../../../document/layout";
import { DistributeIcon } from "./LayoutIcons";
import { Segmented } from "./Segmented";
import type { SegmentOption } from "./Segmented";

const LABEL: Readonly<Record<Distribute, string>> = {
	pack: "Pack",
	between: "Between",
	around: "Around",
	evenly: "Evenly",
};

const OPTIONS: readonly SegmentOption<Distribute>[] = DISTRIBUTIONS.map((distribute) => ({
	value: distribute,
	label: LABEL[distribute],
	icon: <DistributeIcon distribute={distribute} />,
	title: LABEL[distribute],
}));

export function DistributeChips({
	doc,
	layer,
}: {
	doc: DesignDocument;
	layer: Layer;
}): ReactElement {
	const turned = layer.layout.display === "column";

	return (
		<div className={turned ? "layout-row layout-dist layout-dist-turn" : "layout-row layout-dist"}>
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
