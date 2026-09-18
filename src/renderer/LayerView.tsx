import type { ReactElement } from "react";
import type { DesignDocument } from "../document/document";
import type { LayerId } from "../document/layer";
import type { DisplayMode } from "../document/layout";
import { canvasLabelStyle } from "./canvasLabel";
import { isRootArtboard, layerEntry } from "./components/layerEntry";
import { layerStyle } from "./layerStyle";
import type { Slot } from "./state/slot";
import { useSelected } from "./state/useSelected";
import { useChildIds, useLayer } from "./useDocument";

export function LayerView({
	doc,
	id,
	parentDisplay,
	selection,
}: {
	doc: DesignDocument;
	id: LayerId;
	parentDisplay: DisplayMode | null;
	selection: Slot<readonly LayerId[]>;
}): ReactElement | null {
	const layer = useLayer(doc, id);
	const childIds = useChildIds(doc, id);
	const selected = useSelected(selection, id);

	if (layer === null) {
		return null;
	}

	return (
		<div
			className="layer"
			data-layer-id={id}
			data-selected={selected ? "" : undefined}
			style={layerStyle(layer, parentDisplay)}
		>
			{childIds.map((childId) => (
				<LayerView
					doc={doc}
					id={childId}
					key={childId}
					parentDisplay={layer.layout.display}
					selection={selection}
				/>
			))}
		</div>
	);
}

export function ArtboardLabel({
	doc,
	id,
	selection,
}: {
	doc: DesignDocument;
	id: LayerId;
	selection: Slot<readonly LayerId[]>;
}): ReactElement | null {
	const layer = useLayer(doc, id);
	const selected = useSelected(selection, id);

	if (layer === null || !isRootArtboard(layer)) {
		return null;
	}

	return (
		<div
			className="artboard-label"
			data-layer-id={id}
			data-selected={selected ? "" : undefined}
			style={canvasLabelStyle(layer)}
		>
			{layerEntry(layer).label}
		</div>
	);
}
