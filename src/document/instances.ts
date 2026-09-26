import { LoroMap } from "loro-crdt";
import type { LoroTreeNode } from "loro-crdt";
import { isPlacementKey } from "./copySource";
import { OVERRIDES, SELF, SYNC, isSyncMode } from "./instanceState";
import type { SyncMode } from "./instanceState";
import { changesOf, heldEntries, inPart, isLocal, overlaySource, putFlat } from "./instanceSync";
import type { Changes, SyncPart } from "./instanceSync";
import type { LayerPatch } from "./layer";
import type { Basis } from "./length";
import type { LayerTree, Target } from "./layerTree";
import { isNodeId, segmentsOf } from "./path";
import type { LayerId } from "./path";
import type { FieldSource } from "./read";

export interface Instance {
	node: LoroTreeNode;
	key: string;
}

const SEPARATOR = "~";

export function instanceOf(tree: LayerTree, id: LayerId): Instance | null {
	const [first, ...rest] = segmentsOf(id);
	const node = first === undefined ? null : tree.live(first);
	if (node === null || tree.definitionOf(node) === null) {
		return null;
	}
	return { node, key: rest.length === 0 ? SELF : rest.join(SEPARATOR) };
}

function syncModeOf(instance: Instance): SyncMode {
	const held: unknown = instance.node.data.get(SYNC);
	return isSyncMode(held) ? held : "all";
}

function overridesOf(instance: Instance): LoroMap | null {
	const held: unknown = instance.node.data.get(OVERRIDES);
	return held instanceof LoroMap ? held : null;
}

function overrideOf(instance: Instance): LoroMap | null {
	const held: unknown = overridesOf(instance)?.get(instance.key);
	return held instanceof LoroMap ? held : null;
}

export function viewOf(tree: LayerTree, id: LayerId, node: LoroTreeNode): FieldSource {
	const instance = instanceOf(tree, id);
	return overlaySource(tree.sourceOf(node), instance === null ? null : overrideOf(instance));
}

export function changedKeys(tree: LayerTree, id: LayerId): readonly string[] {
	const instance = instanceOf(tree, id);
	return heldEntries(instance === null ? null : overrideOf(instance))
		.map(([key]) => key)
		.toSorted();
}

function writeOverride(instance: Instance, mode: SyncMode, changes: Changes): void {
	const local = [...changes].filter(([key]) => isLocal(mode, key));
	const held = local.length === 0 ? overrideOf(instance) : overrideOfEnsured(instance);
	for (const [key, value] of changes) {
		if (isLocal(mode, key)) {
			held?.set(key, value);
		} else {
			held?.delete(key);
		}
	}
}

function overrideOfEnsured(instance: Instance): LoroMap {
	return instance.node.data.ensureMergeableMap(OVERRIDES).ensureMergeableMap(instance.key);
}

export interface Routing {
	placement: readonly Target[];
	routed: readonly Target[];
	patch: LayerPatch;
}

export function routingOf(
	instance: Instance,
	targets: readonly Target[],
	patch: LayerPatch,
): Routing {
	const [first, ...rest] = targets;
	if (instance.key !== SELF || first === undefined || first[2] !== instance.node.id) {
		return { placement: [], routed: targets, patch };
	}
	return { placement: [first], routed: rest, patch: rest[0]?.[1] ?? {} };
}

export function routeWrite(
	view: FieldSource,
	instance: Instance,
	patch: LayerPatch,
	basis: Basis,
): SyncMode {
	const mode = syncModeOf(instance);
	if (mode !== "all" || overrideOf(instance) !== null) {
		writeOverride(instance, mode, changesOf(view, patch, basis));
	}
	return mode;
}

function nodeAt(tree: LayerTree, instance: Instance): LoroTreeNode | null {
	if (instance.key === SELF) {
		return instance.node;
	}
	const last = instance.key.split(SEPARATOR).at(-1) ?? "";
	return isNodeId(last) ? tree.live(last) : null;
}

function baseFor(tree: LayerTree, instance: Instance, key: string): LoroMap | null {
	const node = nodeAt(tree, instance);
	if (node === null) {
		return null;
	}
	const definition = tree.definitionOf(node);
	const own = instance.key !== SELF && isPlacementKey(key);
	return definition === null || own ? node.data : definition.data;
}

function applyPath(tree: LayerTree, instance: Instance, part: SyncPart | null): void {
	const held = overrideOf(instance);
	for (const [flat, value] of heldEntries(held)) {
		if (part !== null && !inPart(part, flat)) {
			continue;
		}
		const base = part === null ? null : baseFor(tree, instance, flat);
		if (base !== null) {
			putFlat(base, flat, value);
		}
		held?.delete(flat);
	}
}

export function applyInstance(tree: LayerTree, root: LayerId, part: SyncPart | null): void {
	const top = instanceOf(tree, root);
	if (top === null) {
		return;
	}
	for (const [key] of heldEntries(overridesOf(top))) {
		applyPath(tree, { node: top.node, key }, part);
	}
}

export function setSyncMode(tree: LayerTree, root: LayerId, mode: SyncMode): void {
	const top = instanceOf(tree, root);
	if (top === null) {
		return;
	}
	if (mode === "all") {
		top.node.data.delete(SYNC);
	} else {
		top.node.data.set(SYNC, mode);
	}
}
