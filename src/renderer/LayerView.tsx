import type { ReactElement } from "react";
import type { DesignDocument } from "../document/document";
import type { LayerId } from "../document/layer";
import { layerStyle } from "./layerStyle";
import type { Slot } from "./state/slot";
import { useSelected } from "./state/useSelected";
import { useLayer } from "./useDocument";

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
		/>
	);
}
