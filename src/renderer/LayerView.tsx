import type { ReactElement } from "react";
import type { DesignDocument, LayerId } from "../document/document";
import { useLayer } from "./useDocument";
import { useLayerDrag } from "./useLayerDrag";

export function LayerView({ doc, id }: { doc: DesignDocument; id: LayerId }): ReactElement | null {
	const layer = useLayer(doc, id);
	const handlers = useLayerDrag(doc, id);

	if (layer === null) {
		return null;
	}

	return (
		<div
			className="layer"
			data-layer-id={id}
			style={{
				transform: `translate3d(${layer.x}px, ${layer.y}px, 0)`,
				width: `${layer.width}px`,
				height: `${layer.height}px`,
				background: layer.fill,
			}}
			{...handlers}
		/>
	);
}
