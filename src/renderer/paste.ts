import type { LayerId } from "../document/layer";
import type { LayerNode } from "../document/subtree";
import { isArtboard } from "./components/layerEntry";
import type { ReadLayer } from "./input/layerSpace";

export const PASTE_OFFSET = 20;

export function pasteParent(
	read: ReadLayer,
	under: readonly LayerId[],
	selection: readonly LayerId[],
): LayerId | null {
	const artboard = under.find((id) => isArtboard(read(id)));
	if (artboard !== undefined) {
		return artboard;
	}
	const [selected] = selection;
	return selected === undefined ? null : (read(selected)?.parent ?? null);
}

export function shiftNode(node: LayerNode, by: number): LayerNode {
	return { ...node, fields: { ...node.fields, x: node.fields.x + by, y: node.fields.y + by } };
}
