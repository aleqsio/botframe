import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import type { Layer } from "../../../document/layer";
import { DISPLAY_MODES } from "../../../document/layout";
import type { DisplayMode } from "../../../document/layout";
import { DisplayRows } from "./DisplayRows";
import { DisplayIcon, WrapIcon } from "./LayoutIcons";
import { Segmented } from "./Segmented";
import type { SegmentOption } from "./Segmented";
import { resetChildren, unhugPatch } from "./resetChildren";
import { drawnLayer } from "../../input/drawn";
import { isFlex } from "./selfText";

const BLOCK_NOTE = "Block. Children position with X and Y.";
const WRAP_TIP = "Wrap: let the children flow onto more lines";
const LABEL: Readonly<Record<DisplayMode, string>> = {
	block: "Block",
	row: "Row",
	column: "Column",
	grid: "Grid",
};

const OPTIONS: readonly SegmentOption<DisplayMode>[] = DISPLAY_MODES.map((display) => ({
	value: display,
	label: LABEL[display],
	icon: <DisplayIcon display={display} />,
	title: LABEL[display],
}));

function WrapToggle({ doc, layer }: { doc: DesignDocument; layer: Layer }): ReactElement {
	const { display, wrap } = layer.layout;

	return (
		<button
			aria-pressed={wrap}
			className="layout-wrapchip"
			disabled={!isFlex(display)}
			onClick={() => {
				doc.update(layer.id, { layout: { wrap: !wrap } });
				doc.commit("set wrap");
			}}
			title={WRAP_TIP}
			type="button"
		>
			<WrapIcon />
			Wrap
		</button>
	);
}

export function DisplaySection({
	doc,
	layer,
}: {
	doc: DesignDocument;
	layer: Layer;
}): ReactElement {
	const { display } = layer.layout;

	return (
		<section className="layout-section">
			<span className="group-label">Display</span>
			<div className="layout-row layout-display">
				<Segmented
					label="Display"
					onPick={(next) => {
						if (next === "block") {
							doc.update(layer.id, unhugPatch(drawnLayer((id) => doc.layer(id), layer)));
						}
						doc.update(layer.id, { layout: { display: next } });
						resetChildren(doc, layer.id, display);
						doc.commit("set display");
					}}
					options={OPTIONS}
					value={display}
				/>
				<WrapToggle doc={doc} layer={layer} />
			</div>
			{display === "block" ? (
				<p className="layout-note">{BLOCK_NOTE}</p>
			) : (
				<DisplayRows doc={doc} layer={layer} />
			)}
		</section>
	);
}
