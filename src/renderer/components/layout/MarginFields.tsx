import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import type { Layer } from "../../../document/layer";
import { MARGIN_UNITS } from "../../../document/layout";
import type { DisplayMode, MarginSide, Side } from "../../../document/layout";
import { outOfFlow } from "../../layerStyle";
import { SideFields } from "./SideFields";
import { marginMeasure, marginSideOf } from "./measure";
import type { Measure, MarginUnit } from "./measure";
import { PERCENT_TIP } from "./selfText";

const MARGIN_TIP = "Margins do nothing on an absolutely positioned child here.";
const MARGIN_TIPS: Partial<Record<MarginUnit, string>> = { "%": PERCENT_TIP };

type Margins = Record<Side, MarginSide>;

function measuresOf(margin: Margins): Record<Side, Measure<MarginUnit>> {
	return {
		top: marginMeasure(margin.top),
		right: marginMeasure(margin.right),
		bottom: marginMeasure(margin.bottom),
		left: marginMeasure(margin.left),
	};
}

export function MarginFields({
	display,
	doc,
	layer,
}: {
	display: DisplayMode;
	doc: DesignDocument;
	layer: Layer;
}): ReactElement {
	const { margin } = layer.layout;
	const dim = outOfFlow(display, layer.layout.position);

	return (
		<div
			className={dim ? "layout-sides layout-margin layout-dim" : "layout-sides layout-margin"}
			title={dim ? MARGIN_TIP : undefined}
		>
			<SideFields
				group="Margin"
				onChange={(side, next) => {
					doc.update(layer.id, { layout: { margin: { ...margin, [side]: marginSideOf(next) } } });
					doc.commit("set margin");
				}}
				tips={MARGIN_TIPS}
				units={MARGIN_UNITS}
				values={measuresOf(margin)}
				worded
			/>
		</div>
	);
}
