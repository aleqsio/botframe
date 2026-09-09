import type { ReactElement } from "react";
import type { DesignDocument } from "../document/document";
import type { LayerId } from "../document/layer";
import { layerStyle } from "./layerStyle";
import { useLayer } from "./useDocument";
import { useLayerDrag } from "./useLayerDrag";

export function LayerView({ doc, id }: { doc: DesignDocument; id: LayerId }): ReactElement | null {
	const layer = useLayer(doc, id);
	const handlers = useLayerDrag(doc, id);

	if (layer === null) {
		return null;
	}

	return <div className="layer" data-layer-id={id} style={layerStyle(layer)} {...handlers} />;
}
