import type { DesignDocument } from "../../../document/document";
import type { Layer } from "../../../document/layer";
import { isFullyTransparent } from "../../input/hitTest";
import { useLayerTarget } from "../variables/layerTarget";
import type { EditTarget } from "../variables/target";

const FILL_MESSAGE = "set fill";

export interface PaintEdit {
	value: string;
	change: (text: string) => void;
	commit: () => void;
}

export interface FillProps {
	doc: DesignDocument;
	layer: Layer;
	edit: PaintEdit;
	target: EditTarget;
}

function layerPaintEdit(doc: DesignDocument, layer: Layer): PaintEdit {
	const unbind = layer.bindings.fill === undefined ? {} : { bindings: { fill: null } };
	return {
		value: layer.fill,
		change: (text) => {
			doc.update(layer.id, { fill: text, ...unbind });
		},
		commit: () => {
			doc.commit(FILL_MESSAGE);
		},
	};
}

export function setPaint(edit: PaintEdit, text: string): void {
	edit.change(text);
	edit.commit();
}

export function hasPaint(layer: Layer): boolean {
	return layer.bindings.fill !== undefined || !isFullyTransparent(layer.fill);
}

export function useFillProps(doc: DesignDocument, layer: Layer): FillProps {
	const target = useLayerTarget(doc, layer, {
		key: "fill",
		label: "Fill",
		plain: (value) => (typeof value === "string" ? { fill: value } : null),
	});
	return { doc, layer, edit: layerPaintEdit(doc, layer), target };
}
