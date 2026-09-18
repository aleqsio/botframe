import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import type { Layer } from "../../../document/layer";
import { MARGIN_UNITS } from "../../../document/layout";
import type { MarginSide, Side } from "../../../document/layout";
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
	blocked,
	doc,
	layer,
}: {
	blocked: boolean;
	doc: DesignDocument;
	layer: Layer;
}): ReactElement {
	const { margin } = layer.layout;

	return (
		<div
			className={blocked ? "layout-sides layout-margin layout-dim" : "layout-sides layout-margin"}
			title={blocked ? MARGIN_TIP : undefined}
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
