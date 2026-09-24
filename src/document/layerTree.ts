import { LoroMap } from "loro-crdt";
import type { LoroDoc, LoroEventBatch, LoroTree, LoroTreeNode, TreeID } from "loro-crdt";
import type { ComponentStore } from "./components";
import { copySource, splitPatch } from "./copySource";
import type { LayerPatch } from "./layer";
import { copiesOf, isNodeId, layerPath, nodeOf, segmentsOf } from "./path";
import type { LayerId } from "./path";
import { readString } from "./read";
import type { FieldSource } from "./read";
import { traceVariable } from "./resolve";
import type { Found, ResolveSource } from "./resolve";
import { DOCUMENT_SCOPE, valueOf } from "./variable";
import type { Variable, VariableValue } from "./variable";

const LAYERS = "layers";
const DEFINITION = "definition";
const COMPONENT = "component";
const PROPS = "props";
const NO_IDS: readonly LayerId[] = [];

interface Place {
	index: number | undefined;
	siblings: readonly LayerId[];
}

function fitsIndex(id: LayerId, siblings: readonly LayerId[], index: number): boolean {
	const room = siblings.length - (siblings.includes(id) ? 1 : 0);
	return Number.isInteger(index) && index >= 0 && index <= room;
}

export function touchedNodes(event: LoroEventBatch): readonly TreeID[] {
	return event.events.flatMap((entry) => {
		const [root, node] = entry.path;
		return root === LAYERS &&
			typeof node === "string" &&
			isNodeId(node) &&
			entry.diff.type !== "tree"
			? [node]
			: [];
	});
}

export type Target = readonly [data: LoroMap, patch: LayerPatch, node: TreeID];

export class LayerTree {
	readonly #doc: LoroDoc;
	readonly #components: ComponentStore;

	constructor(doc: LoroDoc, components: ComponentStore) {
		this.#doc = doc;
		this.#components = components;
	}

	tree(): LoroTree {
		return this.#doc.getTree(LAYERS);
	}

	live(id: LayerId): LoroTreeNode | null {
		const held = this.tree().getNodeByID(nodeOf(id));
		return held === undefined || held.isDeleted() ? null : held;
	}

	liveCopies(id: LayerId): boolean {
		return copiesOf(id).every((copy) => this.live(copy) !== null);
	}

	pathIn(parent: LayerId | null, node: TreeID): LayerId {
		return layerPath(this.childPrefix(parent), node);
	}

	touches(id: LayerId, node: TreeID): boolean {
		return segmentsOf(id).includes(node);
	}

	isCopyOf(id: LayerId, component: string): boolean {
		return this.componentOf(nodeOf(id)) === component;
	}

	definitionOwner(node: TreeID): string | null {
		const held = this.live(node);
		return held !== null && this.isDefinition(held) ? this.componentOfDefinition(held) : null;
	}

	variablesOf(component: string): readonly Variable[] {
		return this.#components.scope(component).variables();
	}

	isDefinition(node: LoroTreeNode): boolean {
		return readString(node.data, DEFINITION, "") !== "";
	}

	componentOfDefinition(node: LoroTreeNode): string | null {
		const owner = readString(node.data, DEFINITION, "");
		return owner === "" ? null : owner;
	}

	componentOf(node: TreeID): string | null {
		const held = this.live(node);
		const component = held === null ? "" : readString(held.data, COMPONENT, "");
		return component === "" ? null : component;
	}

	definitionOf(node: LoroTreeNode): LoroTreeNode | null {
		const component = readString(node.data, COMPONENT, "");
		const body = component === "" ? null : this.#components.entry(component)?.body;
		return body?.kind === "layers" ? this.live(body.root) : null;
	}

	canvasRoots(): readonly LayerId[] {
		return this.tree()
			.roots()
			.filter((node) => !this.isDefinition(node))
			.map((node) => node.id);
	}

	canvasNodes(): readonly LayerId[] {
		return this.tree()
			.getNodes()
			.filter((node) => !this.#underDefinition(node))
			.map((node) => node.id);
	}

	childIds(id: LayerId): readonly LayerId[] {
		const node = this.live(id);
		if (node === null) {
			return NO_IDS;
		}
		const definition = this.definitionOf(node);
		const prefix = this.childPrefix(id);
		const children = (definition ?? node).children() ?? [];
		return children.map((child) => layerPath(prefix, child.id));
	}

	childPrefix(parent: LayerId | null): readonly TreeID[] {
		if (parent === null) {
			return [];
		}
		const node = this.live(parent);
		const inside = node !== null && this.definitionOf(node) !== null;
		return inside ? [...copiesOf(parent), nodeOf(parent)] : copiesOf(parent);
	}

	parentOf(id: LayerId): LayerId | null {
		const parent = this.live(id)?.parent();
		if (parent === undefined) {
			return null;
		}
		const copies = copiesOf(id);
		if (!this.isDefinition(parent)) {
			return layerPath(copies, parent.id);
		}
		const copy = copies.at(-1);
		return copy === undefined ? null : layerPath(copies.slice(0, -1), copy);
	}

	containerOf(parent: LayerId | null): TreeID | undefined {
		const node = parent === null ? null : this.live(parent);
		if (node === null) {
			return undefined;
		}
		return (this.definitionOf(node) ?? node).id;
	}

	chainOf(id: LayerId): readonly TreeID[] {
		const copies = copiesOf(id).toReversed();
		const node = nodeOf(id);
		return this.componentOf(node) === null ? copies : [node, ...copies];
	}

	sourceOf(node: LoroTreeNode): FieldSource {
		const definition = this.definitionOf(node);
		return definition === null ? node.data : copySource(node.data, definition.data);
	}

	targets(node: LoroTreeNode, patch: LayerPatch): readonly Target[] {
		const definition = this.definitionOf(node);
		if (definition === null) {
			return [[node.data, patch, node.id]];
		}
		const { placement, shared } = splitPatch(patch);
		const targets: Target[] = [[node.data, placement, node.id]];
		return Object.keys(shared).length === 0
			? targets
			: [...targets, [definition.data, shared, definition.id]];
	}

	canMove(id: LayerId, parent: LayerId | null, place: Place): boolean {
		const node = this.live(id);
		const prefix = this.childPrefix(parent);
		const copies = copiesOf(id);
		if (
			node === null ||
			prefix.length !== copies.length ||
			prefix.some((copy, at) => copy !== copies[at])
		) {
			return false;
		}
		const container = this.containerOf(parent);
		if (parent !== null && (container === undefined || this.#inside(node.id, container))) {
			return false;
		}
		return place.index === undefined || fitsIndex(id, place.siblings, place.index);
	}

	copyCount(component: string): number {
		return this.#copiesOf(component).length;
	}

	markDefinition(node: TreeID, component: string): void {
		this.live(node)?.data.set(DEFINITION, component);
	}

	holder(parent: LayerId | null, components: Iterable<string>): LayerId | null {
		const container = this.containerOf(parent);
		const held = [...components].every((component) => this.canHold(container, component));
		return held ? parent : null;
	}

	canHold(container: TreeID | undefined, component: string): boolean {
		const enclosing = this.#enclosing(container);
		return (
			!enclosing.has(component) &&
			![...this.#uses(component, new Set())].some((used) => enclosing.has(used))
		);
	}

	contextOf(id: LayerId, placement: boolean): readonly TreeID[] {
		const chain = this.chainOf(id);
		return placement && chain[0] === nodeOf(id) ? chain.slice(1) : chain;
	}

	ownersAt(id: LayerId, placement: boolean): readonly string[] {
		const components = this.contextOf(id, placement).flatMap(
			(copy) => this.componentOf(copy) ?? [],
		);
		return [DOCUMENT_SCOPE, ...new Set(components)];
	}

	trace(id: LayerId, variable: string, placement: boolean): Found | null {
		return traceVariable(this.resolver(), variable, this.contextOf(id, placement));
	}

	resolver(): ResolveSource {
		const components = this.#components;
		return {
			declared: (id) => components.declared(id),
			assigned: (copy, id) => (isNodeId(copy) ? this.#assigned(copy, id) : undefined),
			componentOf: (copy) => (isNodeId(copy) ? this.componentOf(copy) : null),
			cell: (owner, choice, option, id) =>
				components.scope(owner).cell({ choice, option, variable: id }),
			drivingChoice: (owner, id) => components.scope(owner).drivingChoice(id),
		};
	}

	#assigned(copy: TreeID, id: string): VariableValue | undefined {
		const props: unknown = this.live(copy)?.data.get(PROPS);
		const held: unknown = props instanceof LoroMap ? props.get(id) : undefined;
		return valueOf(held) ?? undefined;
	}

	#inside(node: TreeID, container: TreeID): boolean {
		for (let held = this.live(container); held !== null; held = held.parent() ?? null) {
			if (held.id === node) {
				return true;
			}
		}
		return false;
	}

	#underDefinition(node: LoroTreeNode): boolean {
		let held: LoroTreeNode | undefined = node;
		while (held !== undefined) {
			if (this.isDefinition(held)) {
				return true;
			}
			held = held.parent();
		}
		return false;
	}

	#enclosing(container: TreeID | undefined): ReadonlySet<string> {
		const found = new Set<string>();
		const pending = container === undefined ? [] : [container];
		for (let node = pending.pop(); node !== undefined; node = pending.pop()) {
			const owner = this.#definitionOwner(node);
			if (owner !== null && !found.has(owner)) {
				found.add(owner);
				pending.push(...this.#copiesOf(owner));
			}
		}
		return found;
	}

	#definitionOwner(node: TreeID): string | null {
		let held = this.live(node);
		while (held !== null) {
			const owner = readString(held.data, DEFINITION, "");
			if (owner !== "") {
				return owner;
			}
			held = held.parent() ?? null;
		}
		return null;
	}

	#copiesOf(component: string): readonly TreeID[] {
		return this.tree()
			.getNodes()
			.filter((node) => readString(node.data, COMPONENT, "") === component)
			.map((node) => node.id);
	}

	#uses(component: string, seen: Set<string>): ReadonlySet<string> {
		const body = this.#components.entry(component)?.body;
		const root = body?.kind === "layers" ? this.live(body.root) : null;
		for (const node of root?.children() ?? []) {
			this.#collectUses(node, seen);
		}
		return seen;
	}

	#collectUses(node: LoroTreeNode, seen: Set<string>): void {
		const component = readString(node.data, COMPONENT, "");
		if (component !== "" && !seen.has(component)) {
			seen.add(component);
			this.#uses(component, seen);
		}
		for (const child of node.children() ?? []) {
			this.#collectUses(child, seen);
		}
	}
}
