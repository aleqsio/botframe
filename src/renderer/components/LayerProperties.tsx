import type { ReactElement } from "react";
import type { DesignDocument } from "../../document/document";
import type { Layer } from "../../document/layer";
import { ColorField } from "./ColorField";
import { FrameFooter } from "./FrameFooter";
import { PropertyField } from "./PropertyField";
import { isFrame } from "./layerEntry";
import { fieldGroupsOf } from "./layerFields";
import type { FieldGroup } from "./layerFields";
import { GuideList } from "./layout/GuideList";
import { ChipSection } from "./layout/ChipSection";
import { LayerChip } from "./layout/LayerChip";
import { LayoutPanel } from "./layout/LayoutPanel";
import { TurnToggle } from "./layout/TurnToggle";

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
		<ChipSection name={group.name}>
			{group.fields.map((field) => (
				<LayerChip doc={doc} field={field} key={field.label} layer={layer} />
			))}
			{group.name === TURN_GROUP ? <TurnToggle doc={doc} layer={layer} /> : null}
		</ChipSection>
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
			<LayoutPanel doc={doc} layer={layer} />
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
			{isFrame(layer) ? <GuideList doc={doc} layer={layer} /> : null}
			{isFrame(layer) ? <FrameFooter doc={doc} layer={layer} /> : null}
		</>
	);
}
