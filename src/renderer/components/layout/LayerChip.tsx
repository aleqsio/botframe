import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import type { Layer } from "../../../document/layer";
import type { LayerField } from "../layerFields";
import { editEach, useTargets } from "../targets";
import type { LayerEdit } from "../targets";
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
	const targets = useTargets();
	const value = field.read(layer);
	const onCommit = (): void => {
		doc.commit(field.message);
	};
	const onPatch = (edit: LayerEdit): void => {
		editEach(doc, targets, edit);
	};

	return (
		<ChipBox field={field} onCommit={onCommit} onPatch={onPatch} value={value}>
			<ChipGrip {...fieldGrip(field, value, onPatch, onCommit)} />
		</ChipBox>
	);
}
