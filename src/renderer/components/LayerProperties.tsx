import type { ReactElement } from "react";
import type { DesignDocument } from "../../document/document";
import type { Layer } from "../../document/layer";
import { FrameFooter } from "./FrameFooter";
import { isFrame } from "./layerEntry";
import { SKEW_FIELDS, fieldGroupsOf } from "./layerFields";
import type { FieldGroup } from "./layerFields";
import { GuideList } from "./layout/GuideList";
import { ChipSection } from "./layout/ChipSection";
import { LayerChip } from "./layout/LayerChip";
import { LayoutPanel } from "./layout/LayoutPanel";
import { MirrorToggle } from "./layout/MirrorToggle";
import { TurnToggle } from "./layout/TurnToggle";
import { ClipField } from "./variables/LayerValueFields";
import { FillSection } from "./fill/FillSection";
import { TextSection } from "./text/TextSection";

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
	const turns = group.name === TURN_GROUP;
	return (
		<ChipSection after={turns ? <SkewRows doc={doc} layer={layer} /> : null} name={group.name}>
			{group.fields.map((field) => (
				<LayerChip doc={doc} field={field} key={field.label} layer={layer} />
			))}
			{turns ? <TurnToggle doc={doc} layer={layer} /> : null}
		</ChipSection>
	);
}

function SkewRows({ doc, layer }: { doc: DesignDocument; layer: Layer }): ReactElement {
	return (
		<>
			<div className="chip-row">
				{SKEW_FIELDS.map((field) => (
					<LayerChip doc={doc} field={field} key={field.label} layer={layer} />
				))}
			</div>
			<div className="chip-row">
				<MirrorToggle doc={doc} layer={layer} />
			</div>
		</>
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
			<LayoutPanel doc={doc} layer={layer} />
			{fieldGroupsOf(layer).map((group) => (
				<ChipGroup doc={doc} group={group} key={group.name} layer={layer} />
			))}
			{layer.geometry.kind === "text" ? (
				<TextSection doc={doc} geometry={layer.geometry} layer={layer} />
			) : null}
			<FillSection doc={doc} key={layer.id} layer={layer} />
			<ClipField doc={doc} layer={layer} />
			{isFrame(layer) ? <GuideList doc={doc} layer={layer} /> : null}
			{isFrame(layer) ? <FrameFooter doc={doc} layer={layer} /> : null}
		</>
	);
}
