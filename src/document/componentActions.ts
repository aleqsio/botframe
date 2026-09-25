import type { TreeID } from "loro-crdt";
import type { PackedComponent } from "./componentPack";
import type { DesignDocument } from "./document";
import type { Layer } from "./layer";
import { writePatch } from "./layerData";
import { NO_BASIS } from "./length";
import { nodeOf } from "./path";
import type { LayerId } from "./path";
import type { Scope } from "./scope";
import { nodePatch, ownChildIds } from "./subtree";
import type { LayerNode } from "./subtree";
import { isLiteral, remapValue } from "./value";
import type { Remap, VariableValue } from "./value";
import { DOCUMENT_SCOPE, newVariableId } from "./variable";
import type { Assignments, Variable } from "./variable";

const DEFAULT_NAME = "Component";

function isPlainFrame(layer: Layer | null): layer is Layer {
	return (
		layer !== null &&
		layer.content.kind === "none" &&
		layer.geometry.kind === "rectangle" &&
		layer.geometry.frame
	);
}

export function makeComponent(doc: DesignDocument, id: LayerId): string | null {
	const layer = doc.layer(id);
	const node = doc.tree.live(nodeOf(id));
	const shape = doc.readSubtree(id);
	if (!isPlainFrame(layer) || node === null || shape === null) {
		return null;
	}
	const component = newVariableId();
	const root = doc.tree.tree().createNode();
	writePatch(root.data, nodePatch({ ...shape, children: [] }), NO_BASIS);
	doc.tree.markDefinition(root.id, component);
	for (const child of node.children() ?? []) {
		doc.tree.tree().move(child.id, root.id);
	}
	doc.components.addLayers(component, layer.name === "" ? DEFAULT_NAME : layer.name, root.id);
	doc.update(id, { content: { kind: "component", component, props: {} } });
	return component;
}

function remapAssignments(
	props: Assignments,
	remap: Remap,
	values: Readonly<Record<string, unknown>>,
): Assignments {
	const next: Record<string, VariableValue> = {};
	for (const [key, value] of Object.entries(props)) {
		const held = remapValue(value, remap);
		const literal = values[key];
		const kept = held ?? (isLiteral(literal) ? literal : null);
		if (kept !== null) {
			next[remap(key) ?? key] = kept;
		}
	}
	return next;
}

function remapNode(node: LayerNode, remap: Remap): LayerNode {
	const bindings = Object.fromEntries(
		Object.entries(node.bindings).flatMap(([key, bound]) => {
			const held = remapValue(bound, remap);
			return held === null || isLiteral(held) ? [] : [[key, held]];
		}),
	);
	const content =
		node.content.kind === "none"
			? node.content
			: { ...node.content, props: remapAssignments(node.content.props, remap, {}) };
	return {
		...node,
		bindings,
		content,
		children: node.children.map((child) => remapNode(child, remap)),
	};
}

function placeDefinition(doc: DesignDocument, component: string, root: LayerNode): TreeID {
	const rootId = nodeOf(doc.createSubtree(root, null));
	doc.tree.markDefinition(rootId, component);
	return rootId;
}

function fillScope(scope: Scope, packed: Omit<PackedComponent, "name" | "body">): void {
	for (const variable of packed.variables) {
		scope.put(variable);
	}
}

export function adoptComponents(
	doc: DesignDocument,
	packed: Readonly<Record<string, PackedComponent>>,
): void {
	const fresh = Object.entries(packed).filter(([id]) => doc.components.entry(id) === null);
	for (const [id, pack] of fresh) {
		const { body } = pack;
		if (body.kind === "html") {
			doc.components.adoptHtml(id, [body.address, body.source], (scope) => {
				fillScope(scope, pack);
			});
		}
	}
	for (const [id, pack] of fresh) {
		if (pack.body.kind === "layers") {
			doc.components.addLayers(id, pack.name, placeDefinition(doc, id, pack.body.root));
			fillScope(doc.components.scope(id), pack);
		}
	}
}

function remapScope(
	doc: DesignDocument,
	component: string,
): { remap: Remap; variables: readonly Variable[] } {
	const scope = doc.components.scope(component);
	const ids = new Map(scope.variables().map((variable) => [variable.id, newVariableId()]));
	const remap: Remap = (variable) =>
		ids.get(variable) ?? (doc.components.declared(variable)?.owner === component ? null : variable);
	const variables = scope.variables().map((variable): Variable => {
		const { name, type, options } = variable;
		const initial = remapValue(variable.initial, remap) ?? variable.initial;
		return { id: ids.get(variable.id) ?? variable.id, name, type, initial, options };
	});
	return { remap, variables };
}

export function disconnect(doc: DesignDocument, id: LayerId): string | null {
	const layer = doc.layer(id);
	const content = layer?.content;
	const entry = content?.kind === "component" ? doc.components.entry(content.component) : null;
	const definition = entry?.body.kind === "layers" ? doc.readSubtree(entry.body.root) : null;
	if (content?.kind !== "component" || entry === null || definition === null) {
		return null;
	}
	const component = newVariableId();
	const { remap, variables } = remapScope(doc, entry.id);
	const root = placeDefinition(doc, component, remapNode(definition, remap));
	doc.components.addLayers(component, `${entry.name} copy`, root);
	fillScope(doc.components.scope(component), { variables });
	const props = remapAssignments(content.props, remap, {});
	doc.update(id, { content: { kind: "component", component, props } });
	return component;
}

function isDocumentVariable(doc: DesignDocument, variable: string): boolean {
	return doc.components.declared(variable)?.owner === DOCUMENT_SCOPE;
}

function detachedNode(doc: DesignDocument, id: LayerId): LayerNode | null {
	const node = doc.readSubtree(id);
	const layer = doc.layer(id);
	if (node === null || layer === null) {
		return null;
	}
	const keep: Remap = (variable) => (isDocumentVariable(doc, variable) ? variable : null);
	const values = layer.content.kind === "component" ? layer.content.values : {};
	const content =
		node.content.kind === "none"
			? node.content
			: { ...node.content, props: remapAssignments(node.content.props, keep, values) };
	const children = ownChildIds(doc, id).flatMap((child) => detachedNode(doc, child) ?? []);
	return { ...remapNode({ ...node, content, children: [] }, keep), children };
}

export function makeFrame(doc: DesignDocument, id: LayerId): boolean {
	const layer = doc.layer(id);
	if (
		layer?.content.kind !== "component" ||
		doc.components.entry(layer.content.component)?.body.kind !== "layers"
	) {
		return false;
	}
	const children = doc.childIds(id).flatMap((child) => detachedNode(doc, child) ?? []);
	const { fill, clip, geometry, layout, guides, media } = layer;
	doc.update(id, { content: null });
	doc.update(id, {
		fill,
		clip,
		layout,
		guides,
		media,
		...(geometry.kind === "unsupported" ? {} : { geometry }),
	});
	for (const child of children) {
		doc.createSubtree(child, id);
	}
	return true;
}
