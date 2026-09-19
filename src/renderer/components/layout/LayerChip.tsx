import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import type { Layer, LayerPatch } from "../../../document/layer";
import type { LayerField } from "../layerFields";
import { ChipBox } from "./ChipBox";
import { ChipGrip, fieldGrip } from "./ChipGrip";

export function LayerChip({
	doc,
	field,
	layer,
}: {
	doc: DesignDocument;
	field: LayerField;
	layer: Layer;
}): ReactElement {
	const value = field.read(layer);
	const onCommit = (): void => {
		doc.commit(field.message);
	};
	const onPatch = (patch: LayerPatch): void => {
		doc.update(layer.id, patch);
	};

	return (
		<ChipBox field={field} onCommit={onCommit} onPatch={onPatch} value={value}>
			<ChipGrip {...fieldGrip(field, value, onPatch, onCommit)} />
		</ChipBox>
	);
}
