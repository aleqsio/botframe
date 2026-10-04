import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import { isChanged } from "../../../document/layer";
import type { Layer } from "../../../document/layer";
import type { TextGeometry } from "../../../document/text";
import { LENGTH_STEP } from "../../input/step";
import type { LayerField } from "../layerFields";
import { BindButton } from "../variables/BindButton";
import { BoundSummary } from "../variables/BoundSummary";
import { useLayerTarget } from "../variables/layerTarget";

export const TEXT_MESSAGE = "set text style";
const SIZE_BOUND = { kind: "clamp", min: 1, max: 1000 } as const;
const EMPTY_TEXT = "No text";

export function fontSizeField(geometry: TextGeometry): LayerField {
	const sized = (fontSize: number): { geometry: TextGeometry } => ({
		geometry: { ...geometry, fontSize },
	});
	return {
		label: "Size",
		unit: "px",
		choice: null,
		bound: SIZE_BOUND,
		step: LENGTH_STEP,
		message: TEXT_MESSAGE,
		read: () => geometry.fontSize,
		patch: sized,
		bind: { key: "fontSize", plain: sized },
	};
}

export function ContentRow({
	doc,
	geometry,
	layer,
}: {
	doc: DesignDocument;
	geometry: TextGeometry;
	layer: Layer;
}): ReactElement {
	const target = useLayerTarget(doc, layer, {
		key: "content",
		label: "Content",
		plain: (value) =>
			typeof value === "string" ? { geometry: { ...geometry, content: value } } : null,
	});
	const bound = layer.bindings.content;
	const [firstLine = ""] = geometry.content.split("\n");

	return (
		<div className="mirror-row" data-changed={isChanged(layer, "content") ? "" : undefined}>
			{bound === undefined ? (
				<span className="text-content">{firstLine === "" ? EMPTY_TEXT : firstLine}</span>
			) : (
				<BoundSummary bound={bound} now={geometry.content} view={target.reach.view} />
			)}
			<BindButton target={target} />
		</div>
	);
}
