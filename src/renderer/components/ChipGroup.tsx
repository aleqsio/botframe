import type { ReactElement } from "react";
import type { DesignDocument } from "../../document/document";
import type { Layer } from "../../document/layer";
import { NumberChip } from "./NumberChip";
import type { FieldGroup, LayerField } from "./layerFields";

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

export function ChipGroup({
	doc,
	group,
	layer,
}: {
	doc: DesignDocument;
	group: FieldGroup;
	layer: Layer;
}): ReactElement {
	return (
		<div className="field-group">
			<span className="group-label">{group.name}</span>
			<div className="chip-row">
				{group.fields.map((field) => (
					<LayerChip doc={doc} field={field} key={field.label} layer={layer} />
				))}
			</div>
		</div>
	);
}
