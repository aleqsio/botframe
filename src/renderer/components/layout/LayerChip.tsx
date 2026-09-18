import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import type { Layer } from "../../../document/layer";
import type { LayerField } from "../layerFields";
import { ChipBox } from "./ChipBox";
import { ChipGrip } from "./ChipGrip";
import type { ChipGripProps } from "./ChipGrip";

export function LayerChip({
	doc,
	field,
	layer,
}: {
	doc: DesignDocument;
	field: LayerField;
	layer: Layer;
}): ReactElement {
	const chip: ChipGripProps = {
		field,
		value: field.read(layer),
		onCommit: () => {
			doc.commit(field.message);
		},
		onPatch: (patch) => {
			doc.update(layer.id, patch);
		},
	};

	return (
		<ChipBox {...chip}>
			<ChipGrip {...chip} />
		</ChipBox>
	);
}
