import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import type { Layer, LayerId } from "../../../document/layer";
import { PIXELS } from "../../../document/length";
import type { Axis, Unit } from "../../../document/length";
import { SIZE_MODES } from "../../../document/layout";
import type { LayoutPatch, SizeMode } from "../../../document/layout";
import { useDrawnFrame } from "../../useDocument";
import { boxField } from "../layerFields";
import type { LayerField } from "../layerFields";
import { editEach, useTargets } from "../targets";
import type { LayerEdit } from "../targets";
import { ChipBox } from "./ChipBox";
import { ChipGrip, fieldGrip } from "./ChipGrip";
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

const ROOT_FILL_TIP = "A layer at the root has no parent to fill";

function sizeOptions(root: boolean): readonly SegmentOption<SizeMode>[] {
	return SIZE_MODES.map((mode) => ({
		value: mode,
		label: SIZE_LABEL[mode],
		icon: <SizeModeIcon mode={mode} />,
		disabled: mode === "fill" && root,
		title: mode === "fill" && root ? ROOT_FILL_TIP : undefined,
	}));
}

export function hugPatch(layer: Layer, axis: Axis, next: SizeMode): LayoutPatch {
	const hugsBlock = next === "hug" && layer.layout.display === "block";
	return { [axis]: next, ...(hugsBlock ? { display: "row" } : {}) };
}

function resolvedField(field: LayerField, unit: Unit): LayerField {
	return { ...field, unit, choice: null };
}

function setSizeMode(
	doc: DesignDocument,
	targets: readonly LayerId[],
	axis: Axis,
	next: SizeMode,
): void {
	editEach(doc, targets, (held) => {
		const layout = hugPatch(held, axis, next);
		if (layout.display !== undefined) {
			resetChildren(doc, held.id, "block");
		}
		return { layout };
	});
	doc.commit("set size");
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
	const targets = useTargets();
	const field = boxField(AXIS_LABEL[axis], axis, layer, (target) => doc.basisOf(target.id));
	const write = (edit: LayerEdit): void => {
		editEach(doc, targets, edit);
	};
	const commit = (): void => {
		doc.commit(field.message);
	};

	return (
		<div className={`layout-row layout-size layout-size-${axis}`}>
			<ChipGrip {...fieldGrip(field, field.read(layer), write, commit)} disabled={!fixed} />
			<Segmented
				label={`${AXIS_LABEL[axis]} size`}
				onPick={(next) => {
					setSizeMode(doc, targets, axis, next);
				}}
				options={sizeOptions(layer.parent === null)}
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
