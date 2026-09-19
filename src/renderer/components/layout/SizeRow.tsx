import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import type { Layer, LayerPatch } from "../../../document/layer";
import { PIXELS } from "../../../document/length";
import type { Axis, Unit } from "../../../document/length";
import { SIZE_MODES } from "../../../document/layout";
import type { LayoutPatch, SizeMode } from "../../../document/layout";
import { useDrawnFrame } from "../../useDocument";
import { boxField } from "../layerFields";
import type { LayerField } from "../layerFields";
import { ChipBox } from "./ChipBox";
import { ChipGrip } from "./ChipGrip";
import { SizeModeIcon } from "./LayoutIcons";
import { Segmented } from "./Segmented";
import { resetChildren } from "./resetChildren";
import type { SegmentOption } from "./Segmented";

const SIZE_LABEL: Readonly<Record<SizeMode, string>> = {
	fixed: "Fixed",
	hug: "Hug",
	fill: "Fill",
};
const AXIS_LABEL: Readonly<Record<Axis, string>> = { width: "W", height: "H" };
const FULL = 100;

const SIZE_OPTIONS: readonly SegmentOption<SizeMode>[] = SIZE_MODES.map((mode) => ({
	value: mode,
	label: SIZE_LABEL[mode],
	icon: <SizeModeIcon mode={mode} />,
}));

export function hugPatch(layer: Layer, axis: Axis, next: SizeMode): LayoutPatch {
	const hugsBlock = next === "hug" && layer.layout.display === "block";
	return { [axis]: next, ...(hugsBlock ? { display: "row" } : {}) };
}

function resolvedField(field: LayerField, unit: Unit): LayerField {
	return { ...field, unit, choice: null };
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
	const full = mode === "fill" && blocked;
	const drawn = useDrawnFrame(doc, layer.id);
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
					const layout = hugPatch(layer, axis, next);
					write({ layout });
					if (layout.display !== undefined) {
						resetChildren(doc, layer.id, "block");
					}
					doc.commit("set size");
				}}
				options={SIZE_OPTIONS}
				value={mode}
			/>
			<ChipBox
				disabled={!fixed}
				field={fixed ? field : resolvedField(field, full ? "%" : PIXELS)}
				onCommit={commit}
				onPatch={write}
				value={fixed ? field.read(layer) : full ? FULL : (drawn?.[axis] ?? layer[axis])}
			/>
		</div>
	);
}
