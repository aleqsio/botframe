import type { ReactElement } from "react";
import type { DesignDocument } from "../../document/document";
import type { Layer, LayerId } from "../../document/layer";
import { usePicked } from "../state/useSlot";
import type { UserState } from "../state/userState";
import { useLayer, useLayerCount } from "../useDocument";
import { LayerProperties } from "./LayerProperties";
import { inspectorHeading } from "./layerEntry";

function firstSelected(ids: readonly LayerId[]): LayerId | null {
	return ids[0] ?? null;
}

function InspectorHeader({ layer }: { layer: Layer | null }): ReactElement {
	const heading = inspectorHeading(layer);

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

export function Inspector({ doc, user }: { doc: DesignDocument; user: UserState }): ReactElement {
	const layer = useLayer(doc, usePicked(user.selection, firstSelected));

	return (
		<aside aria-label="Inspector" id="inspector">
			<InspectorHeader layer={layer} />
			<div className="inspector-body">
				{layer === null ? (
					<PageProperties doc={doc} />
				) : (
					<LayerProperties doc={doc} layer={layer} />
				)}
			</div>
		</aside>
	);
}
