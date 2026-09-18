import type { CSSProperties, ReactElement } from "react";
import type { DesignDocument } from "../document/document";
import type { LayerId } from "../document/layer";
import type { Guide } from "../document/layout";
import { canvasLabelStyle } from "./canvasLabel";
import { isRootArtboard, layerEntry } from "./components/layerEntry";
import { layerStyle } from "./layerStyle";
import type { Slot } from "./state/slot";
import { useSelected } from "./state/useSelected";
import { useChildIds, useLayer } from "./useDocument";

function guideStyle(guide: Guide): CSSProperties {
	return guide.axis === "x" ? { left: `${guide.at}px` } : { top: `${guide.at}px` };
}

export function LayerView({
	doc,
	id,
	selection,
}: {
	doc: DesignDocument;
	id: LayerId;
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
			style={layerStyle(layer)}
		>
			{childIds.map((childId) => (
				<LayerView doc={doc} id={childId} key={childId} selection={selection} />
			))}
			{Array.from(layer.guides.entries(), ([index, guide]) => (
				<span className="guide-line" data-axis={guide.axis} key={index} style={guideStyle(guide)} />
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
