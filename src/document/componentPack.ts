import { bagOf, listOf } from "./bag";
import { componentSourceOf } from "./component";
import type { ComponentSource } from "./component";
import type { ComponentStore } from "./components";
import type { LayerId } from "./path";
import type { LayerNode } from "./subtree";
import { variableOf } from "./variable";
import type { Variable } from "./variable";

type PackedBody =
	| { kind: "html"; address: string; source: ComponentSource }
	| { kind: "layers"; root: LayerNode };

export interface PackedComponent {
	name: string;
	body: PackedBody;
	variables: readonly Variable[];
}

export interface PackReader {
	components: ComponentStore;
	readSubtree: (id: LayerId) => LayerNode | null;
}

function bodyOf(value: unknown, nodeOf: (value: unknown) => LayerNode): PackedBody | null {
	const bag = bagOf(value);
	if (bag["kind"] === "layers") {
		return { kind: "layers", root: nodeOf(bag["root"]) };
	}
	const source = componentSourceOf(bag["source"]);
	const { address } = bag;
	return bag["kind"] === "html" && source !== null && typeof address === "string"
		? { kind: "html", address, source }
		: null;
}

export function packedOf(
	value: unknown,
	nodeOf: (value: unknown) => LayerNode,
): PackedComponent | null {
	const bag = bagOf(value);
	const body = bodyOf(bag["body"], nodeOf);
	const { name } = bag;
	if (typeof name !== "string" || body === null) {
		return null;
	}
	const variables = listOf(bag["variables"]).flatMap((held) => {
		const { id } = bagOf(held);
		const variable = typeof id === "string" ? variableOf(id, held) : null;
		return variable === null ? [] : [variable];
	});
	return { name, body, variables };
}

function packedBody(reader: PackReader, id: string): PackedBody | null {
	const entry = reader.components.entry(id);
	if (entry === null) {
		return null;
	}
	if (entry.body.kind === "layers") {
		const root = reader.readSubtree(entry.body.root);
		return root === null ? null : { kind: "layers", root };
	}
	const source = reader.components.source(entry.body.source);
	if (source === null) {
		return null;
	}
	const { name, html, css, props } = source;
	return { kind: "html", address: entry.body.source, source: { name, html, css, props } };
}

function usedIn(node: LayerNode, found: Set<string>): void {
	if (node.content.kind === "component") {
		found.add(node.content.component);
	}
	for (const child of node.children) {
		usedIn(child, found);
	}
}

export function packComponents(
	reader: PackReader,
	ids: Iterable<string>,
): Readonly<Record<string, PackedComponent>> {
	const packed: Record<string, PackedComponent> = {};
	const pending = [...ids];
	for (let id = pending.pop(); id !== undefined; id = pending.pop()) {
		const body = id in packed ? null : packedBody(reader, id);
		const entry = reader.components.entry(id);
		if (body !== null && entry !== null) {
			const scope = reader.components.scope(id);
			packed[id] = { name: entry.name, body, variables: scope.variables() };
			const nested = new Set<string>();
			if (body.kind === "layers") {
				usedIn(body.root, nested);
			}
			pending.push(...nested);
		}
	}
	return packed;
}
