import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import { isChanged } from "../../../document/layer";
import type { Layer } from "../../../document/layer";
import { AlignPad } from "./AlignPad";
import { DistributeChips } from "./DistributeChips";
import { GapFields } from "./GapFields";
import { LayoutPreview } from "./LayoutPreview";
import { TracksEditor } from "./TracksEditor";
import { ChangedMark } from "../ChangedMark";

export function DisplayRows({ doc, layer }: { doc: DesignDocument; layer: Layer }): ReactElement {
	return (
		<>
			{layer.layout.display === "grid" ? (
				<ChangedMark changed={isChanged(layer, "layout.tracks")}>
					<TracksEditor doc={doc} layer={layer} />
				</ChangedMark>
			) : null}
			<span className="layout-sub">Distribute</span>
			<ChangedMark changed={isChanged(layer, "layout.distribute")}>
				<DistributeChips doc={doc} layer={layer} />
			</ChangedMark>
			<div className="layout-padwrap">
				<ChangedMark changed={isChanged(layer, "layout.align")}>
					<AlignPad doc={doc} layer={layer} />
				</ChangedMark>
				<LayoutPreview layout={layer.layout} />
			</div>
			<ChangedMark changed={isChanged(layer, "layout.gap")}>
				<GapFields doc={doc} layer={layer} />
			</ChangedMark>
		</>
	);
}
