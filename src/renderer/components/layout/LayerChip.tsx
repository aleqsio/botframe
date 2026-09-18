import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import type { Layer } from "../../../document/layer";
import { NumberChip } from "../NumberChip";
import type { LayerField } from "../layerFields";

export function LayerChip({
	doc,
	field,
	layer,
}: {
	doc: DesignDocument;
	field: LayerField;
	layer: Layer;
}): ReactElement {
	return (
		<NumberChip
			field={field}
			onCommit={() => {
				doc.commit(field.message);
			}}
			onPatch={(patch) => {
				doc.update(layer.id, patch);
			}}
			value={field.read(layer)}
		/>
	);
}
