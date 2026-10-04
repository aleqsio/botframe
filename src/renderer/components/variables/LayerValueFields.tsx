import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import { isChanged } from "../../../document/layer";
import type { Layer } from "../../../document/layer";
import { ColorField } from "../ColorField";
import { ClipLayerPicker } from "../ClipLayerPicker";
import {
	CLIP_MESSAGE,
	clipCandidates,
	clipLabelOf,
	clipLayerTitle,
	clipModeOf,
	clipModeOfValue,
	clipOptions,
	clipPatch,
	firstClipSource,
} from "../clipChoice";
import type { ClipMode } from "../clipChoice";
import { Segmented } from "../layout/Segmented";
import { BindButton } from "./BindButton";
import { BoundSummary } from "./BoundSummary";
import { useLayerTarget } from "./layerTarget";

interface FieldProps {
	doc: DesignDocument;
	layer: Layer;
}

export function FillField({ doc, layer }: FieldProps): ReactElement {
	const target = useLayerTarget(doc, layer, {
		key: "fill",
		label: "Fill",
		plain: (value) => (typeof value === "string" ? { fill: value } : null),
	});
	const bound = layer.bindings.fill;

	return (
		<ColorField
			after={<BindButton target={target} />}
			changed={isChanged(layer, "fill")}
			replace={
				bound === undefined ? undefined : (
					<BoundSummary bound={bound} now={layer.fill} view={target.reach.view} />
				)
			}
			label="Fill"
			onChange={(text) => {
				doc.update(layer.id, { fill: text });
			}}
			onCommit={() => {
				doc.commit("set fill");
			}}
			value={layer.fill}
		/>
	);
}

export function ClipField({ doc, layer }: FieldProps): ReactElement {
	const candidates = clipCandidates(doc, layer);
	const target = useLayerTarget(doc, layer, {
		key: "clip",
		label: "Clip",
		plain: (value) => {
			const next = clipModeOfValue(value);
			const source = layer.clipLayer ?? firstClipSource(doc, layer, candidates);
			return next === null ? null : clipPatch(next, next === "layer" ? source : null);
		},
	});
	const bound = layer.bindings.clip;
	const mode = clipModeOf(layer);
	const title = clipLayerTitle(doc, layer, candidates);

	function pick(next: ClipMode): void {
		if (next === mode) {
			return;
		}
		if (next !== "layer") {
			target.onChange(next === "shape");
			return;
		}
		doc.update(layer.id, clipPatch("layer", firstClipSource(doc, layer, candidates)));
		doc.commit(CLIP_MESSAGE);
	}

	return (
		<section aria-label="Clip" className="field-group layout-section">
			<span className="group-label">Clip</span>
			<div className="property-switch-row" data-changed={isChanged(layer, "clip") ? "" : undefined}>
				{bound === undefined ? (
					<Segmented label="Clip" onPick={pick} options={clipOptions(title)} value={mode} />
				) : (
					<BoundSummary bound={bound} now={clipLabelOf(layer)} view={target.reach.view} />
				)}
				<BindButton target={target} />
			</div>
			{mode === "layer" || bound !== undefined ? (
				<ClipLayerPicker candidates={candidates} doc={doc} layer={layer} />
			) : null}
		</section>
	);
}
