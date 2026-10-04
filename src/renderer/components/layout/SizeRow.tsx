import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import { isChanged } from "../../../document/layer";
import type { Layer, LayerPatch } from "../../../document/layer";
import { PIXELS } from "../../../document/length";
import type { Axis, Unit } from "../../../document/length";
import { SIZE_MODES } from "../../../document/layout";
import type { LayoutPatch, SizeMode } from "../../../document/layout";
import { useDrawnOutline } from "../../useDocument";
import { boxField } from "../layerFields";
import type { LayerField } from "../layerFields";
import { isFrame } from "../layerEntry";
import { FieldChip } from "./LayerChip";
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
const SHAPE_HUG_TIP = "A shape has no children to hug";

function hugs(layer: Layer): boolean {
	return isFrame(layer) || layer.geometry.kind === "text";
}

function sizeTip(mode: SizeMode, layer: Layer): string | undefined {
	if (mode === "fill" && layer.parent === null) {
		return ROOT_FILL_TIP;
	}
	return mode === "hug" && !hugs(layer) ? SHAPE_HUG_TIP : undefined;
}

function sizeOptions(layer: Layer): readonly SegmentOption<SizeMode>[] {
	return SIZE_MODES.map((mode) => {
		const tip = sizeTip(mode, layer);
		return {
			value: mode,
			label: SIZE_LABEL[mode],
			icon: <SizeModeIcon mode={mode} />,
			disabled: tip !== undefined,
			title: tip,
		};
	});
}

export function hugPatch(layer: Layer, axis: Axis, next: SizeMode): LayoutPatch {
	const hugsBlock =
		next === "hug" && layer.geometry.kind !== "text" && layer.layout.display === "block";
	return { [axis]: next, ...(hugsBlock ? { display: "row" } : {}) };
}

function resolvedField(field: LayerField, unit: Unit, bound: boolean): LayerField {
	return { ...field, unit, choice: null, bind: bound ? field.bind : undefined };
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
	const drawn = useDrawnOutline(doc, layer.id);
	const field = boxField(AXIS_LABEL[axis], axis, layer, doc.basisOf(layer.id));
	const write = (patch: LayerPatch): void => {
		doc.update(layer.id, patch);
	};
	const commit = (): void => {
		doc.commit(field.message);
	};

	return (
		<div className={`layout-row layout-size layout-size-${axis}`}>
			<ChipGrip {...fieldGrip(field, field.read(layer), write, commit)} disabled={!fixed} />
			<Segmented
				changed={isChanged(layer, `layout.${axis}`)}
				label={`${AXIS_LABEL[axis]} size`}
				onPick={(next) => {
					const layout = hugPatch(layer, axis, next);
					write({ layout });
					if (layout.display !== undefined) {
						resetChildren(doc, layer.id, "block");
					}
					doc.commit("set size");
				}}
				options={sizeOptions(layer)}
				value={mode}
			/>
			<FieldChip
				box={{
					disabled: !fixed,
					field: fixed
						? field
						: resolvedField(field, full ? "%" : PIXELS, layer.bindings[axis] !== undefined),
					onCommit: commit,
					onPatch: write,
					value: fixed ? field.read(layer) : full ? FULL : (drawn?.[axis] ?? layer[axis]),
				}}
				doc={doc}
				layer={layer}
			/>
		</div>
	);
}
