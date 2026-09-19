import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import type { Layer } from "../../../document/layer";
import type { LayerLayout } from "../../../document/layout";
import { CellSection } from "./CellSection";
import { DisplayIcon } from "./LayoutIcons";
import { MarginFields } from "./MarginFields";
import { PositionRow } from "./PositionRow";
import { SizeRow } from "./SizeRow";
import { contextText } from "./selfText";

export function SelfSection({
	doc,
	layer,
	parent,
}: {
	doc: DesignDocument;
	layer: Layer;
	parent: LayerLayout | null;
}): ReactElement {
	const display = parent?.display ?? "block";
	const blocked = display === "block";

	return (
		<section className="layout-section">
			<header className="layout-head">
				<span className="group-label">Self</span>
				<span className={blocked ? "layout-badge" : "layout-badge layout-badge-on"}>
					<DisplayIcon display={display} />
					{contextText(parent)}
				</span>
			</header>
			<span className="layout-sub">Size</span>
			<SizeRow axis="width" blocked={blocked} doc={doc} layer={layer} />
			<SizeRow axis="height" blocked={blocked} doc={doc} layer={layer} />
			<span className="layout-sub">Position</span>
			<PositionRow blocked={blocked} doc={doc} layer={layer} />
			{parent !== null && parent.display === "grid" ? (
				<>
					<span className="layout-sub">Cell</span>
					<CellSection doc={doc} layer={layer} tracks={parent.tracks} />
				</>
			) : null}
			<span className="layout-sub">Margin</span>
			<MarginFields display={display} doc={doc} layer={layer} />
		</section>
	);
}
