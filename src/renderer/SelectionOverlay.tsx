import type { CSSProperties, ReactElement } from "react";
import type { DesignDocument } from "../document/document";
import type { Layer, LayerId } from "../document/layer";
import { CORNERS, HANDLE_SIZE } from "./input/handles";
import { layerTransform } from "./layerStyle";
import type { Slot } from "./state/slot";
import { useSlot } from "./state/useSlot";
import { useLayer } from "./useDocument";

declare module "react" {
	interface CSSProperties {
		"--handle-size"?: string | undefined;
	}
}

function frameStyle(layer: Layer): CSSProperties {
	return {
		transform: layerTransform(layer),
		width: `${layer.width}px`,
		height: `${layer.height}px`,
		"--handle-size": `${HANDLE_SIZE}px`,
	};
}

function SelectionFrame({ doc, id }: { doc: DesignDocument; id: LayerId }): ReactElement | null {
	const layer = useLayer(doc, id);

	if (layer === null) {
		return null;
	}

	return (
		<div className="selection" style={frameStyle(layer)}>
			{CORNERS.map((corner) => (
				<span className="selection-handle" data-corner={corner} key={corner} />
			))}
		</div>
	);
}

export function SelectionOverlay({
	doc,
	selection,
}: {
	doc: DesignDocument;
	selection: Slot<readonly LayerId[]>;
}): ReactElement | null {
	const [id] = useSlot(selection);

	return id === undefined ? null : <SelectionFrame doc={doc} id={id} />;
}
