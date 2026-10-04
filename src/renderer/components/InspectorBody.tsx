import type { ReactElement, ReactNode } from "react";
import type { DesignDocument } from "../../document/document";
import type { Layer } from "../../document/layer";
import type { UserState } from "../state/userState";
import { useLayerCount } from "../useDocument";
import { LayerProperties } from "./LayerProperties";
import { LayoutActions } from "./LayoutActions";
import { MixedProperties } from "./MixedProperties";
import { NameField } from "./NameField";
import { LayerPanels } from "./variables/ComponentPanels";
import { DocumentSection } from "./variables/DocumentSection";

function PageProperties({ doc }: { doc: DesignDocument }): ReactElement {
	const count = useLayerCount(doc);

	return (
		<div className="property-field">
			<span className="property-label">Layers</span>
			<output className="inspector-value">{count}</output>
		</div>
	);
}

export function InspectorBody({
	doc,
	layers,
	user,
}: {
	doc: DesignDocument;
	layers: readonly Layer[];
	user: UserState;
}): ReactNode {
	const [first, peer] = layers;

	if (first === undefined) {
		return (
			<>
				<PageProperties doc={doc} />
				<DocumentSection doc={doc} selection={[]} />
			</>
		);
	}
	return (
		<>
			<NameField doc={doc} layers={layers} />
			{peer === undefined ? <LayerPanels doc={doc} layer={first} user={user} /> : null}
			<LayoutActions doc={doc} layers={layers} user={user} />
			{peer === undefined ? (
				<LayerProperties doc={doc} layer={first} />
			) : (
				<MixedProperties doc={doc} layers={layers} />
			)}
			<DocumentSection doc={doc} selection={layers.map((layer) => layer.id)} />
		</>
	);
}
