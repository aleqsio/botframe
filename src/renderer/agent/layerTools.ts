import { disconnect, makeComponent } from "../../document/componentActions";
import type { DesignDocument } from "../../document/document";
import { holdsChildren } from "../../document/layer";
import type { Layer, LayerId } from "../../document/layer";
import type { LayerNode } from "../../document/subtree";
import { layerNodeFrom, layerPatchFrom } from "../../document/layerChange";
import { layerInput } from "./layerInput";
import { argsOf, indexArg, layerArg, listArg, parentArg } from "./args";
import type { Args } from "./args";

export type Handler = (doc: DesignDocument, args: Args) => unknown;

interface OutlineNode {
	id: LayerId;
	name: string;
	kind: string;
	component?: string;
	children: readonly OutlineNode[];
}

function kindOf(layer: Layer): string {
	const { geometry } = layer;
	return geometry.kind === "rectangle" && geometry.frame ? "frame" : geometry.kind;
}

function outlineOf(doc: DesignDocument, id: LayerId): readonly OutlineNode[] {
	const layer = doc.layer(id);
	if (layer === null) {
		return [];
	}
	const { content } = layer;
	return [
		{
			id,
			name: layer.name,
			kind: kindOf(layer),
			...(content.kind === "component" ? { component: content.component } : {}),
			children: doc.childIds(id).flatMap((child) => outlineOf(doc, child)),
		},
	];
}

const HOLDERS = "Only a frame or a group can hold layers, as in the editor.";

export function containerArg(doc: DesignDocument, args: Args): LayerId | null {
	const parent = parentArg(doc, args);
	const layer = parent === null ? null : doc.layer(parent);
	if (layer !== null && !holdsChildren(layer.geometry)) {
		throw new TypeError(`${HOLDERS} ${parent ?? ""} is a ${kindOf(layer)}.`);
	}
	return parent;
}

function checkNodes(nodes: readonly LayerNode[]): void {
	for (const node of nodes) {
		if (node.children.length > 0 && !holdsChildren(node.fields.geometry)) {
			throw new TypeError(
				`${HOLDERS} Give "${node.fields.name}" geometry {kind: rectangle, frame: true} or {kind: group}.`,
			);
		}
		checkNodes(node.children);
	}
}

function createLayers(doc: DesignDocument, args: Args): unknown {
	const parent = containerArg(doc, args);
	const index = indexArg(args);
	const nodes = listArg(args, "layers").map((layer) => layerNodeFrom(layerInput(doc, layer, null)));
	checkNodes(nodes);
	const ids = nodes.map((node) => doc.createSubtree(node, parent));
	const placed =
		index === undefined || ids.every((id, offset) => doc.move(id, parent, index + offset));
	if (!placed) {
		throw new Error(`botframe made the layers ${ids.join(", ")} but refused the index.`);
	}
	return { ids };
}

function updateLayer(doc: DesignDocument, args: Args): unknown {
	const id = layerArg(doc, args["id"]);
	const current = doc.readSubtree(id);
	if (current === null) {
		throw new TypeError(`No layer has the id ${id}.`);
	}
	const held = current.content.kind === "component" ? current.content.component : null;
	const patch = layerPatchFrom(current, layerInput(doc, argsOf(args["change"]), held));
	if (
		patch.geometry !== undefined &&
		!holdsChildren(patch.geometry) &&
		doc.childIds(id).length > 0
	) {
		throw new TypeError(`${HOLDERS} ${id} has children, so it must stay a frame or a group.`);
	}
	doc.update(id, patch);
	return { applied: Object.keys(patch), layer: doc.layer(id) };
}

function moveLayer(doc: DesignDocument, args: Args): unknown {
	const id = layerArg(doc, args["id"]);
	if (!doc.move(id, containerArg(doc, args), indexArg(args))) {
		throw new Error("botframe refused the move.");
	}
	return { id };
}

function madeComponent(doc: DesignDocument, args: Args): unknown {
	const component = makeComponent(doc, layerArg(doc, args["id"]));
	if (component === null) {
		throw new Error("Only a frame with no component can become a component.");
	}
	return { component };
}

function detached(doc: DesignDocument, args: Args): unknown {
	const id = disconnect(doc, layerArg(doc, args["id"]));
	if (id === null) {
		throw new Error("The layer is not a copy of a layer component.");
	}
	return { id };
}

export const LAYER_TOOLS: Readonly<Record<string, Handler>> = {
	get_outline: (doc) => doc.rootIds().flatMap((id) => outlineOf(doc, id)),
	get_layer: (doc, args) => doc.layer(layerArg(doc, args["id"])),
	create_layers: createLayers,
	update_layer: updateLayer,
	delete_layers: (doc, args) => {
		const ids = listArg(args, "ids").map((id) => layerArg(doc, id));
		for (const id of ids) {
			doc.deleteLayer(id);
		}
		return { deleted: ids };
	},
	move_layer: moveLayer,
	make_component: madeComponent,
	detach_component: detached,
	undo: (doc) => ({ done: doc.undo() }),
	redo: (doc) => ({ done: doc.redo() }),
};
