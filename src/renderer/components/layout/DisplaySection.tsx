import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import { isChanged } from "../../../document/layer";
import type { Layer } from "../../../document/layer";
import { DISPLAY_MODES } from "../../../document/layout";
import type { DisplayMode } from "../../../document/layout";
import { DisplayRows } from "./DisplayRows";
import { DisplayIcon, WrapIcon } from "./LayoutIcons";
import { Segmented } from "./Segmented";
import type { SegmentOption } from "./Segmented";
import { resetChildren } from "./resetChildren";
import { isFlex } from "./selfText";

const WRAP_TIP = "Wrap: let the children flow onto more lines";
const LABEL: Readonly<Record<DisplayMode, string>> = {
	block: "Block",
	row: "Row",
	column: "Column",
	grid: "Grid",
};

const BLOCK_HUG_TIP = "Block cannot hug its children";

function displayOptions(hugs: boolean): readonly SegmentOption<DisplayMode>[] {
	return DISPLAY_MODES.map((display) => ({
		value: display,
		label: LABEL[display],
		icon: <DisplayIcon display={display} />,
		disabled: display === "block" && hugs,
		title: display === "block" && hugs ? BLOCK_HUG_TIP : LABEL[display],
	}));
}

function WrapToggle({ doc, layer }: { doc: DesignDocument; layer: Layer }): ReactElement {
	const { display, wrap } = layer.layout;

	return (
		<button
			aria-pressed={wrap}
			className="layout-flag"
			data-changed={isChanged(layer, "layout.wrap") ? "" : undefined}
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
	const { display, width, height } = layer.layout;

	return (
		<section className="layout-section">
			<span className="group-label">Display</span>
			<div className="layout-row layout-display">
				<Segmented
					changed={isChanged(layer, "layout.display")}
					label="Display"
					onPick={(next) => {
						doc.update(layer.id, { layout: { display: next } });
						resetChildren(doc, layer.id, display);
						doc.commit("set display");
					}}
					options={displayOptions(width === "hug" || height === "hug")}
					value={display}
				/>
				<WrapToggle doc={doc} layer={layer} />
			</div>
			{display === "block" ? null : <DisplayRows doc={doc} layer={layer} />}
		</section>
	);
}
