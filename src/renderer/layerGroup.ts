import type { DesignDocument } from "../document/document";
import type { Layer, LayerFields, LayerId, LayerPatch } from "../document/layer";
import { isNodeId } from "../document/path";
import { DOM_DRAWN, drawnRead } from "./input/drawn";
import { outOfLayer, parentChain, pivotOf, poseInside, seenLinear } from "./input/layerSpace";
import type { ReadLayer } from "./input/layerSpace";
import { fixedFill, localBoxOf } from "./input/layoutGeometry";
import { selectedLayers } from "./input/layoutWrite";
import { hullOfRects } from "./input/selectionBounds";
import type { UserState } from "./state/userState";

const CLEAR = "#00000000";
const GROUP_MESSAGE = "group layers";
const UNGROUP_MESSAGE = "ungroup layers";

const GROUP_FIELDS: Omit<LayerFields, "x" | "y" | "width" | "height"> = {
	fill: CLEAR,
	name: "Group",
	clip: false,
	geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, frame: true },
};

interface GroupPlan {
	layers: readonly Layer[];
	parent: LayerId | null;
	index: number;
}

function readerOf(doc: DesignDocument): ReadLayer {
	return drawnRead(DOM_DRAWN, (id) => doc.layer(id));
}

function holdsFree(doc: DesignDocument, parent: LayerId | null): boolean {
	return parent === null || doc.layer(parent)?.layout.display === "block";
}

function groupPlan(doc: DesignDocument, user: UserState): GroupPlan | null {
	const layers = selectedLayers(doc, user);
	const parents = new Set(layers.map((layer) => layer.parent));
	const [parent] = parents;
	if (parent === undefined || parents.size > 1 || !holdsFree(doc, parent)) {
		return null;
	}
	if (!layers.every((layer) => isNodeId(layer.id))) {
		return null;
	}
	const siblings = doc.siblingIds(parent);
	const order = (layer: Layer): number => siblings.indexOf(layer.id);
	const sorted = layers.toSorted((left, right) => order(left) - order(right));
	const top = Math.max(...layers.map((layer) => order(layer)));
	return { layers: sorted, parent, index: top + 1 - layers.length };
}

function fixedSize(read: ReadLayer, layer: Layer): LayerPatch {
	return fixedFill(layer, read(layer.id) ?? layer);
}

export function canGroup(doc: DesignDocument, user: UserState): boolean {
	return groupPlan(doc, user) !== null;
}

function wrap(doc: DesignDocument, plan: GroupPlan, read: ReadLayer): LayerId | null {
	const hull = hullOfRects(plan.layers.map((layer) => localBoxOf(read(layer.id) ?? layer)));
	if (hull === null) {
		return null;
	}
	const group = doc.createLayer({ ...GROUP_FIELDS, ...hull }, plan.parent);
	for (const layer of plan.layers) {
		const sized = fixedSize(read, layer);
		if (doc.move(layer.id, group)) {
			doc.update(layer.id, { ...sized, x: layer.x - hull.x, y: layer.y - hull.y });
		}
	}
	doc.move(group, plan.parent, plan.index);
	return group;
}

export function groupSelection(doc: DesignDocument, user: UserState): boolean {
	const plan = groupPlan(doc, user);
	const group = plan === null ? null : wrap(doc, plan, readerOf(doc));
	if (group === null) {
		return false;
	}
	user.selection.set([group]);
	doc.commit(GROUP_MESSAGE);
	return true;
}

function isGroup(doc: DesignDocument, layer: Layer): boolean {
	return (
		isNodeId(layer.id) &&
		layer.fill === CLEAR &&
		layer.media === null &&
		!layer.clip &&
		layer.content.kind === "none" &&
		layer.layout.display === "block" &&
		doc.childIds(layer.id).length > 0 &&
		holdsFree(doc, layer.parent)
	);
}

export function canUngroup(doc: DesignDocument, user: UserState): boolean {
	return selectedLayers(doc, user).some((layer) => isGroup(doc, layer));
}

function liftChild(doc: DesignDocument, group: Layer, child: Layer, index: number): void {
	const read = readerOf(doc);
	const seen = seenLinear([...parentChain(read, group.id), group], child);
	const pivot = pivotOf(child);
	const landed = outOfLayer(group, { x: child.x + pivot.x, y: child.y + pivot.y });
	const sized = fixedSize(read, child);
	if (!doc.move(child.id, group.parent, index)) {
		return;
	}
	const pose = poseInside(parentChain(read, child.id), seen, child);
	doc.update(child.id, { ...sized, ...pose, x: landed.x - pivot.x, y: landed.y - pivot.y });
}

function ungroup(doc: DesignDocument, groupId: LayerId): readonly LayerId[] {
	const group = readerOf(doc)(groupId);
	if (group === null) {
		return [];
	}
	const at = doc.siblingIds(group.parent).indexOf(group.id);
	const children = doc.childIds(group.id).flatMap((id) => doc.layer(id) ?? []);
	for (const [offset, child] of children.entries()) {
		liftChild(doc, group, child, at + offset);
	}
	doc.deleteLayer(group.id);
	return children.map((child) => child.id);
}

export function ungroupSelection(doc: DesignDocument, user: UserState): boolean {
	const layers = selectedLayers(doc, user);
	const groups = new Set(layers.filter((layer) => isGroup(doc, layer)));
	if (groups.size === 0) {
		return false;
	}
	const lifted = layers.flatMap((layer) =>
		groups.has(layer) ? ungroup(doc, layer.id) : [layer.id],
	);
	user.selection.set([...new Set(lifted)]);
	doc.commit(UNGROUP_MESSAGE);
	return true;
}
