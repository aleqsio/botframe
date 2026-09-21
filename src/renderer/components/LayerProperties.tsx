import type { ReactElement } from "react";
import type { DesignDocument } from "../../document/document";
import type { Layer } from "../../document/layer";
import { ArtboardFooter } from "./ArtboardFooter";
import { ColorField } from "./ColorField";
import { PropertyField } from "./PropertyField";
import { isArtboard } from "./layerEntry";
import { fieldGroupsOf } from "./layerFields";
import type { FieldGroup } from "./layerFields";
import { GuideList } from "./layout/GuideList";
import { LayerChip } from "./layout/LayerChip";
import { LayoutPanel } from "./layout/LayoutPanel";
import { TurnToggle } from "./layout/TurnToggle";
import { editEach, plainEdit, useTargets } from "./targets";

const TURN_GROUP = "Rotation";

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
		<div className="field-group layout-section">
			<span className="group-label">{group.name}</span>
			<div className="chip-row">
				{group.fields.map((field) => (
					<LayerChip doc={doc} field={field} key={field.label} layer={layer} />
				))}
				{group.name === TURN_GROUP ? <TurnToggle doc={doc} layer={layer} /> : null}
			</div>
		</div>
	);
}

function ClipSwitch({ doc, layer }: { doc: DesignDocument; layer: Layer }): ReactElement {
	const targets = useTargets();

	return (
		<label className="property-switch">
			<input
				checked={layer.clip}
				onChange={(event) => {
					editEach(doc, targets, plainEdit({ clip: event.target.checked }));
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
	const targets = useTargets();

	return (
		<>
			<PropertyField
				label="Name"
				onCommit={(text) => {
					editEach(doc, targets, plainEdit({ name: text }));
					doc.commit("rename layer");
				}}
				value={layer.name}
			/>
			<LayoutPanel doc={doc} layer={layer} />
			{fieldGroupsOf(layer).map((group) => (
				<ChipGroup doc={doc} group={group} key={group.name} layer={layer} />
			))}
			<ColorField
				label="Fill"
				onChange={(text) => {
					editEach(doc, targets, plainEdit({ fill: text }));
				}}
				onCommit={() => {
					doc.commit("set fill");
				}}
				value={layer.fill}
			/>
			<ClipSwitch doc={doc} layer={layer} />
			{isArtboard(layer) ? <GuideList doc={doc} layer={layer} /> : null}
			{isArtboard(layer) ? <ArtboardFooter doc={doc} layer={layer} /> : null}
		</>
	);
}
