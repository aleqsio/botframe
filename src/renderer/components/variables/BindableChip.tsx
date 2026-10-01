import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import type { Layer } from "../../../document/layer";
import type { NumberBinding } from "../layerFields";
import { ChipBox } from "../layout/ChipBox";
import type { ChipBoxProps } from "../layout/ChipBox";
import { BindButton } from "./BindButton";
import { BoundSummary } from "./BoundSummary";
import { useLayerTarget } from "./layerTarget";

export function BindableChip({
	bind,
	box,
	doc,
	layer,
}: {
	doc: DesignDocument;
	layer: Layer;
	bind: NumberBinding;
	box: ChipBoxProps;
}): ReactElement {
	const target = useLayerTarget(doc, layer, {
		key: bind.key,
		label: box.field.label,
		plain: (value) => (typeof value === "number" ? bind.plain(value) : null),
	});
	const bound = layer.bindings[bind.key];

	return (
		<ChipBox
			{...box}
			after={<BindButton target={target} />}
			replace={
				bound === undefined ? undefined : (
					<BoundSummary bound={bound} now={target.current} view={target.reach.view} />
				)
			}
		/>
	);
}
