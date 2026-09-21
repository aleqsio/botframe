import type { ReactElement } from "react";
import type { DesignDocument } from "../../document/document";
import type { Layer, LayerId } from "../../document/layer";
import { useSlot } from "../state/useSlot";
import type { UserState } from "../state/userState";
import { useLayer, useLayerCount } from "../useDocument";
import { LayerProperties } from "./LayerProperties";
import { inspectorHeading, selectionHeading } from "./layerEntry";
import { TargetsContext } from "./targets";

function InspectorHeader({ count, layer }: { count: number; layer: Layer | null }): ReactElement {
	const heading = count > 1 ? selectionHeading(count) : inspectorHeading(layer);

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
	const ids: readonly LayerId[] = useSlot(user.selection);
	const layer = useLayer(doc, ids[0] ?? null);

	return (
		<aside aria-label="Inspector" id="inspector">
			<InspectorHeader count={ids.length} layer={layer} />
			<div className="inspector-body">
				<TargetsContext value={ids}>
					{layer === null ? (
						<PageProperties doc={doc} />
					) : (
						<LayerProperties doc={doc} layer={layer} />
					)}
				</TargetsContext>
			</div>
		</aside>
	);
}
