import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import type { Layer, LayerPatch } from "../../../document/layer";
import { PIXELS } from "../../../document/length";
import type { Axis } from "../../../document/length";
import { SIZE_MODES } from "../../../document/layout";
import type { SizeMode } from "../../../document/layout";
import { boxField } from "../layerFields";
import type { LayerField } from "../layerFields";
import { ChipBox } from "./ChipBox";
import { ChipGrip } from "./ChipGrip";
import { SizeModeIcon } from "./LayoutIcons";
import { Segmented } from "./Segmented";
import type { SegmentOption } from "./Segmented";

const SIZE_LABEL: Readonly<Record<SizeMode, string>> = {
	fixed: "Fixed",
	hug: "Hug",
	fill: "Fill",
};
const AXIS_LABEL: Readonly<Record<Axis, string>> = { width: "W", height: "H" };
const FILL_TIP = "parent is not flex, falls back to 100%";

function sizeOptions(blocked: boolean): readonly SegmentOption<SizeMode>[] {
	return SIZE_MODES.map((mode) => ({
		value: mode,
		label: SIZE_LABEL[mode],
		icon: <SizeModeIcon mode={mode} />,
		muted: mode === "fill" && blocked,
		title: mode === "fill" && blocked ? FILL_TIP : undefined,
	}));
}

function resolvedField(field: LayerField): LayerField {
	return { ...field, unit: PIXELS, choice: null };
}

export function SizeRow({
	axis,
	blocked,
	doc,
	layer,
}: {
	axis: Axis;
	blocked: boolean;
	doc: DesignDocument;
	layer: Layer;
}): ReactElement {
	const mode = layer.layout[axis];
	const fixed = mode === "fixed";
	const field = boxField(AXIS_LABEL[axis], axis, layer, doc.basisOf(layer.id));
	const write = (patch: LayerPatch): void => {
		doc.update(layer.id, patch);
	};
	const commit = (): void => {
		doc.commit(field.message);
	};

	return (
		<div className={`layout-row layout-size layout-size-${axis}`}>
			<ChipGrip
				disabled={!fixed}
				field={field}
				onCommit={commit}
				onPatch={write}
				value={field.read(layer)}
			/>
			<Segmented
				label={`${AXIS_LABEL[axis]} size`}
				onPick={(next) => {
					write({ layout: axis === "width" ? { width: next } : { height: next } });
					doc.commit("set size");
				}}
				options={sizeOptions(blocked)}
				value={mode}
			/>
			<ChipBox
				disabled={!fixed}
				field={fixed ? field : resolvedField(field)}
				onCommit={commit}
				onPatch={write}
				value={fixed ? field.read(layer) : layer[axis]}
			/>
		</div>
	);
}
