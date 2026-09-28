import type { ReactElement } from "react";
import type { DesignDocument } from "../../document/document";
import type { Layer } from "../../document/layer";
import { useSlot } from "../state/useSlot";
import type { UserState } from "../state/userState";
import { useComponentsView, useLayers } from "../useDocument";
import { InspectorBody } from "./InspectorBody";
import { groupHeading, inspectorHeading, isCode } from "./layerEntry";
import type { InspectorHeading } from "./layerEntry";

function headingOf(layers: readonly Layer[], code: boolean): InspectorHeading {
	const [first, peer] = layers;

	return peer === undefined ? inspectorHeading(first ?? null, code) : groupHeading(layers.length);
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

export function Inspector({ doc, user }: { doc: DesignDocument; user: UserState }): ReactElement {
	const layers = useLayers(doc, useSlot(user.selection));
	const code = isCode(layers[0] ?? null, useComponentsView(doc));

	return (
		<aside aria-label="Inspector" id="inspector">
			<InspectorHeader heading={headingOf(layers, code)} />
			<div className="inspector-body">
				<InspectorBody doc={doc} layers={layers} user={user} />
			</div>
		</aside>
	);
}
