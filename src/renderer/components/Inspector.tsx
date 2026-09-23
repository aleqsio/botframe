import type { ReactElement, ReactNode } from "react";
import type { DesignDocument } from "../../document/document";
import type { Layer } from "../../document/layer";
import { useSlot } from "../state/useSlot";
import type { UserState } from "../state/userState";
import { useLayerCount, useLayers } from "../useDocument";
import { LayerProperties } from "./LayerProperties";
import { MixedProperties } from "./MixedProperties";
import { groupHeading, inspectorHeading } from "./layerEntry";
import type { InspectorHeading } from "./layerEntry";

function headingOf(layers: readonly Layer[]): InspectorHeading {
	const [first, peer] = layers;

	return peer === undefined ? inspectorHeading(first ?? null) : groupHeading(layers.length);
}

function InspectorHeader({ heading }: { heading: InspectorHeading }): ReactElement {
	return (
		<header className="inspector-header">
			<span aria-hidden="true" className={`layer-glyph layer-glyph-${heading.glyph}`} />
			<span className="inspector-name">{heading.name}</span>
			<span className="inspector-kind">{heading.kind}</span>
		</header>
	);
}

function PageProperties({ doc }: { doc: DesignDocument }): ReactElement {
	const count = useLayerCount(doc);

	return (
		<div className="property-field">
			<span className="property-label">Layers</span>
			<output className="inspector-value">{count}</output>
		</div>
	);
}

function InspectorBody({
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
		return <PageProperties doc={doc} />;
	}
	return peer === undefined ? (
		<LayerProperties doc={doc} layer={first} user={user} />
	) : (
		<MixedProperties doc={doc} layers={layers} user={user} />
	);
}

export function Inspector({ doc, user }: { doc: DesignDocument; user: UserState }): ReactElement {
	const layers = useLayers(doc, useSlot(user.selection));

	return (
		<aside aria-label="Inspector" id="inspector">
			<InspectorHeader heading={headingOf(layers)} />
			<div className="inspector-body">
				<InspectorBody doc={doc} layers={layers} user={user} />
			</div>
		</aside>
	);
}
