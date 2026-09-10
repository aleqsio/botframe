import type { CSSProperties, ReactNode } from "react";
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

function ParentSpace({
	doc,
	id,
	children,
}: {
	doc: DesignDocument;
	id: LayerId | null;
	children: ReactNode;
}): ReactNode {
	const layer = useLayer(doc, id);

	if (layer === null) {
		return children;
	}

	return (
		<ParentSpace doc={doc} id={layer.parent}>
			<div className="layer-space" style={{ transform: layerTransform(layer) }}>
				{children}
			</div>
		</ParentSpace>
	);
}

function SelectionFrame({ doc, id }: { doc: DesignDocument; id: LayerId }): ReactNode {
	const layer = useLayer(doc, id);

	if (layer === null) {
		return null;
	}

	return (
		<ParentSpace doc={doc} id={layer.parent}>
			<div className="selection" style={frameStyle(layer)}>
				{CORNERS.map((corner) => (
					<span className="selection-handle" data-corner={corner} key={corner} />
				))}
			</div>
		</ParentSpace>
	);
}

export function SelectionOverlay({
	doc,
	selection,
}: {
	doc: DesignDocument;
	selection: Slot<readonly LayerId[]>;
}): ReactNode {
	const [id] = useSlot(selection);

	return id === undefined ? null : <SelectionFrame doc={doc} id={id} />;
}
