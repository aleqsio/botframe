import { isGroup } from "./layer";
import type { Layer, LayerId, LayerPatch, Rect } from "./layer";
import { anchoredPlace, cornersOf, hullOf, outOfLayer } from "./space";

const NEAR = 0.01;
const TOP_LEFT = { x: 0, y: 0 };

export type WriteLayer = (id: LayerId, patch: LayerPatch) => void;

export interface GroupSource {
	layer: (id: LayerId) => Layer | null;
	childIds: (id: LayerId) => readonly LayerId[];
	update: WriteLayer;
	deleteLayer: (id: LayerId) => void;
	tree: { allNodes: () => readonly LayerId[] };
}

function childrenOf(source: GroupSource, id: LayerId): readonly Layer[] {
	return source.childIds(id).flatMap((child) => source.layer(child) ?? []);
}

function hullOfChildren(children: readonly Layer[]): Rect | null {
	const [first, ...rest] = children.flatMap((child) =>
		cornersOf(child).map((corner) => outOfLayer(child, corner)),
	);
	return first === undefined ? null : hullOf([first, ...rest]);
}

function fits(group: Layer, hull: Rect): boolean {
	return (
		Math.abs(hull.x) < NEAR &&
		Math.abs(hull.y) < NEAR &&
		Math.abs(hull.width - group.width) < NEAR &&
		Math.abs(hull.height - group.height) < NEAR
	);
}

function depthOf(source: GroupSource, id: LayerId): number {
	let depth = 0;
	for (let held = source.layer(id)?.parent ?? null; held !== null; depth += 1) {
		held = source.layer(held)?.parent ?? null;
	}
	return depth;
}

function fitGroup(source: GroupSource, write: WriteLayer, group: Layer): void {
	const children = childrenOf(source, group.id);
	const hull = hullOfChildren(children);
	if (hull === null) {
		source.deleteLayer(group.id);
		return;
	}
	if (fits(group, hull)) {
		return;
	}
	const size = { width: hull.width, height: hull.height };
	const place = anchoredPlace({ ...group, ...size }, TOP_LEFT, outOfLayer(group, hull));
	write(group.id, { ...place, ...size, layout: { width: "fixed", height: "fixed" } });
	for (const child of children) {
		write(child.id, { x: child.x - hull.x, y: child.y - hull.y });
	}
}

export function fitGroups(source: GroupSource, write: WriteLayer): void {
	const groups = source.tree.allNodes().filter((id) => isGroup(source.layer(id)));
	const depths = new Map(groups.map((id) => [id, depthOf(source, id)]));
	const deepest = groups.toSorted(
		(left, right) => (depths.get(right) ?? 0) - (depths.get(left) ?? 0),
	);
	for (const id of deepest) {
		const group = source.layer(id);
		if (group !== null) {
			fitGroup(source, write, group);
		}
	}
}
