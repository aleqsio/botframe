import { adoptComponents } from "../document/componentActions";
import type { PackedComponent } from "../document/componentPack";
import { packComponents } from "../document/componentPack";
import type { DesignDocument } from "../document/document";
import { htmlMarkupOf } from "../document/htmlMarkup";
import type { LayerId } from "../document/layer";
import { componentIdsOf, readTree } from "../document/subtree";
import type { LayerNode } from "../document/subtree";
import type { LayerEnvelope } from "../document/envelope";
import { verifiedPacks } from "./componentImport";
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

export function adoptedParent(
	doc: DesignDocument,
	envelope: LayerEnvelope,
	wanted: LayerId | null,
): LayerId | null {
	adoptComponents(doc, envelope.components);
	return doc.tree.holder(wanted, componentIdsOf(envelope.layers));
}

export async function verifiedEnvelope(envelope: LayerEnvelope): Promise<LayerEnvelope> {
	return { ...envelope, components: await verifiedPacks(envelope.components) };
}
