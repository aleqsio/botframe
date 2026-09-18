import type { ReactElement } from "react";
import type { DesignDocument } from "../../document/document";
import type { Layer } from "../../document/layer";
import { useLayer } from "../useDocument";
import { ArtboardFooter } from "./ArtboardFooter";
import { ChipGroup } from "./ChipGroup";
import { ColorField } from "./ColorField";
import { GuideList } from "./GuideList";
import { LayoutSection } from "./LayoutSection";
import { PropertyField } from "./PropertyField";
import { isArtboard } from "./layerEntry";
import { fieldGroupsOf } from "./layerFields";
import { cellGroupOf } from "./layoutFields";

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

function ArtboardSections({ doc, layer }: { doc: DesignDocument; layer: Layer }): ReactElement {
	return (
		<>
			<LayoutSection doc={doc} layer={layer} />
			<GuideList doc={doc} layer={layer} />
			<ArtboardFooter doc={doc} layer={layer} />
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
	const container = useLayer(doc, layer.parent);
	const placed = container !== null && container.layout.kind !== "free";
	const cell = cellGroupOf(layer, container);

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
			{cell === null ? null : <ChipGroup doc={doc} group={cell} layer={layer} />}
			{fieldGroupsOf(layer, doc.basisOf(layer.id), placed).map((group) => (
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
			{isArtboard(layer) ? <ArtboardSections doc={doc} layer={layer} /> : null}
		</>
	);
}
