import type { BindingKey } from "./bindings";
import { geometryValue } from "./boundTraits";
import type { TreeID } from "loro-crdt";
import type { SyncMode } from "./instanceState";
import { changedKeys, instanceOf, routeWrite, routingOf, viewOf } from "./instances";
import { sharedPatch } from "./instanceSync";
import { GEOMETRY_BINDINGS } from "./layer";
import type { Layer, LayerPatch, LayerTraits } from "./layer";
import { readLayerData, writePatch } from "./layerData";
import type { LayerTree, Target } from "./layerTree";
import type { Basis } from "./length";
import type { LayerId } from "./path";
import { resolveTraits } from "./resolveLayer";

export function readLayer(tree: LayerTree, id: LayerId, basis: Basis): LayerTraits | null {
	const node = tree.live(id);
	if (node === null || !tree.liveCopies(id)) {
		return null;
	}
	const traits = readLayerData(viewOf(tree, id, node), basis);
	const chain = tree.chainOf(id);
	const context = {
		source: tree.resolver(),
		chain,
		copy: chain[0] === node.id,
		variablesOf: (component: string) => tree.variablesOf(component),
	};
	return { ...resolveTraits(traits, context), changed: changedKeys(tree, id) };
}

function writeTargets(targets: readonly Target[], basis: Basis, mode: SyncMode): void {
	for (const [data, part] of targets) {
		const shared = sharedPatch(mode, part);
		if (mode === "all" || Object.keys(shared).length > 0) {
			writePatch(data, shared, basis);
		}
	}
}

export function writeLayer(
	tree: LayerTree,
	id: LayerId,
	patch: LayerPatch,
	basis: Basis,
): readonly TreeID[] {
	const node = tree.live(id);
	if (node === null) {
		return [];
	}
	const targets = tree.targets(node, patch);
	const ids = targets.map(([, , target]) => target);
	const instance = instanceOf(tree, id);
	if (instance === null) {
		writeTargets(targets, basis, "all");
		return ids;
	}
	const routing = routingOf(instance, targets, patch);
	const mode = routeWrite(viewOf(tree, id, node), instance, routing.patch, basis);
	writeTargets(routing.placement, basis, "all");
	writeTargets(routing.routed, basis, mode);
	return [...ids, instance.node.id];
}

function changedBindings(layer: Layer, patch: LayerPatch): readonly BindingKey[] {
	const { geometry } = patch;
	if (geometry === undefined || geometry.kind !== layer.geometry.kind) {
		return [];
	}
	return GEOMETRY_BINDINGS.filter(
		(key) =>
			layer.bindings[key] !== undefined &&
			patch.bindings?.[key] === undefined &&
			geometryValue(geometry, key) !== geometryValue(layer.geometry, key),
	);
}

export function unbindGeometry(layer: Layer | null, patch: LayerPatch): LayerPatch {
	const changed = layer === null ? [] : changedBindings(layer, patch);
	return changed.length === 0
		? patch
		: {
				...patch,
				bindings: { ...Object.fromEntries(changed.map((key) => [key, null])), ...patch.bindings },
			};
}
