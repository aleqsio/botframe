import type { PackedComponent } from "../document/componentPack";
import { packComponents } from "../document/componentPack";
import type { DesignDocument } from "../document/document";
import { htmlMarkupOf } from "../document/htmlMarkup";
import type { LayerId } from "../document/layer";
import { componentIdsOf, readTree } from "../document/subtree";
import type { LayerNode } from "../document/subtree";
import { layerMarkup } from "./layerMarkup";

export function markupOf(doc: DesignDocument, ids: readonly LayerId[]): string {
	return ids
		.flatMap((id) => readTree(doc, id) ?? [])
		.map((node) => layerMarkup(node, (content) => htmlMarkupOf(doc.components, content)))
		.join("");
}

export function packedFor(
	doc: DesignDocument,
	nodes: readonly LayerNode[],
): Readonly<Record<string, PackedComponent>> {
	return packComponents(
		{ components: doc.components, readSubtree: (id) => doc.readSubtree(id) },
		componentIdsOf(nodes),
	);
}
