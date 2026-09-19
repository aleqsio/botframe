import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import type { Layer } from "../../../document/layer";
import { AlignPad } from "./AlignPad";
import { DistributeChips } from "./DistributeChips";
import { GapFields } from "./GapFields";
import { LayoutPreview } from "./LayoutPreview";
import { TracksEditor } from "./TracksEditor";

export function DisplayRows({ doc, layer }: { doc: DesignDocument; layer: Layer }): ReactElement {
	return (
		<>
			{layer.layout.display === "grid" ? <TracksEditor doc={doc} layer={layer} /> : null}
			<span className="layout-sub">Distribute</span>
			<DistributeChips doc={doc} layer={layer} />
			<div className="layout-padwrap">
				<AlignPad doc={doc} layer={layer} />
				<LayoutPreview layout={layer.layout} />
			</div>
			<GapFields doc={doc} layer={layer} />
		</>
	);
}
