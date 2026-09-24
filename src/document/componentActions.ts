import type { TreeID } from "loro-crdt";
import type { PackedComponent } from "./componentPack";
import type { DesignDocument } from "./document";
import type { Layer } from "./layer";
import { writePatch } from "./layerData";
import { NO_BASIS } from "./length";
import { nodeOf } from "./path";
import type { LayerId } from "./path";
import type { Cell } from "./scope";
import { nodePatch } from "./subtree";
import type { LayerNode } from "./subtree";
import { DOCUMENT_SCOPE, isReference, newVariableId } from "./variable";
import type { Assignments, Variable, VariableValue } from "./variable";

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

type Remap = (variable: string) => string | null;

function remapValue(value: VariableValue, remap: Remap): VariableValue | null {
	if (!isReference(value)) {
		return value;
	}
	const target = remap(value.var);
	return target === null ? null : { var: target };
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
		const kept =
			held ??
			(typeof literal === "string" || typeof literal === "number" || typeof literal === "boolean"
				? literal
				: null);
		if (kept !== null) {
			next[remap(key) ?? key] = kept;
		}
	}
	return next;
}

function remapNode(node: LayerNode, remap: Remap): LayerNode {
	const bindings = Object.fromEntries(
		Object.entries(node.bindings).flatMap(([key, variable]) => {
			const target = remap(variable);
			return target === null ? [] : [[key, target]];
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

function fillScope(
	doc: DesignDocument,
	component: string,
	packed: Omit<PackedComponent, "name" | "body">,
): void {
	const scope = doc.components.scope(component);
	for (const variable of packed.variables) {
		scope.put(variable);
	}
	for (const [cell, value] of packed.cells) {
		scope.setCell(cell, value);
	}
}

export function adoptComponents(
	doc: DesignDocument,
	packed: Readonly<Record<string, PackedComponent>>,
): void {
	for (const [id, pack] of Object.entries(packed)) {
		if (doc.components.entry(id) !== null) {
			continue;
		}
		if (pack.body.kind === "html") {
			doc.components.adoptHtml(id, pack.name, pack.body.address, pack.body.source);
		} else {
			doc.components.addLayers(id, pack.name, placeDefinition(doc, id, pack.body.root));
		}
		fillScope(doc, id, pack);
	}
}

function remapScope(
	doc: DesignDocument,
	component: string,
): {
	remap: Remap;
	variables: readonly Variable[];
	cells: readonly (readonly [Cell, VariableValue])[];
} {
	const scope = doc.components.scope(component);
	const ids = new Map(scope.variables().map((variable) => [variable.id, newVariableId()]));
	const remap: Remap = (variable) =>
		ids.get(variable) ?? (doc.components.declared(variable)?.owner === component ? null : variable);
	const variables = scope.variables().map((variable): Variable => {
		const { name, type, options, prop } = variable;
		const initial = remapValue(variable.initial, remap) ?? variable.initial;
		return { id: ids.get(variable.id) ?? variable.id, name, type, initial, options, prop };
	});
	const cells = scope.cells().flatMap(([cell, value]) => {
		const choice = remap(cell.choice);
		const target = remap(cell.variable);
		const held = remapValue(value, remap);
		return choice === null || target === null || held === null
			? []
			: [[{ ...cell, choice, variable: target }, held] as const];
	});
	return { remap, variables, cells };
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
	const { remap, variables, cells } = remapScope(doc, entry.id);
	const root = placeDefinition(doc, component, remapNode(definition, remap));
	doc.components.addLayers(component, `${entry.name} copy`, root);
	fillScope(doc, component, { variables, cells });
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
	const children = doc.childIds(id).flatMap((child) => detachedNode(doc, child) ?? []);
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
