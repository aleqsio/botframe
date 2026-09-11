import type { ReactElement } from "react";
import type { DesignDocument } from "../../document/document";
import type { Layer } from "../../document/layer";
import { ArtboardFooter } from "./ArtboardFooter";
import { ColorField } from "./ColorField";
import { NumberChip } from "./NumberChip";
import { PropertyField } from "./PropertyField";
import { isArtboard } from "./layerEntry";
import { fieldGroupsOf } from "./layerFields";
import type { FieldGroup, LayerField } from "./layerFields";

function LayerChip({
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

function ChipGroup({
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

function ClipSwitch({ doc, layer }: { doc: DesignDocument; layer: Layer }): ReactElement {
	return (
		<label className="property-switch">
			<input
				checked={layer.clip}
				onChange={(event) => {
					doc.update(layer.id, { clip: event.target.checked });
					doc.commit("set clip");
				}}
				type="checkbox"
			/>
			Clip content
		</label>
	);
}

export function LayerProperties({
	doc,
	layer,
}: {
	doc: DesignDocument;
	layer: Layer;
}): ReactElement {
	return (
		<>
			<PropertyField
				label="Name"
				onCommit={(text) => {
					doc.update(layer.id, { name: text });
					doc.commit("rename layer");
				}}
				value={layer.name}
			/>
			{fieldGroupsOf(layer).map((group) => (
				<ChipGroup doc={doc} group={group} key={group.name} layer={layer} />
			))}
			<ColorField
				label="Fill"
				onChange={(text) => {
					doc.update(layer.id, { fill: text });
				}}
				onCommit={() => {
					doc.commit("set fill");
				}}
				value={layer.fill}
			/>
			<ClipSwitch doc={doc} layer={layer} />
			{isArtboard(layer) ? <ArtboardFooter doc={doc} layer={layer} /> : null}
		</>
	);
}
