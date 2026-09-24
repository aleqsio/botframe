import type { DesignDocument } from "../../document/document";
import type { GuideAxis } from "../../document/guides";
import type { Layer, Rect } from "../../document/layer";
import { swappedBox } from "../components/layerFields";
import type { Point } from "../state/camera";
import type { UserState } from "../state/userState";
import { DOM_DRAWN, drawnRead } from "./drawn";
import {
	anchoredPlace,
	normalizeDegrees,
	outOfLayer,
	parentChain,
	placedAround,
	toParentPoint,
	turnedOnScreen,
	visualCenterOf,
} from "./layerSpace";
import type { ReadLayer } from "./layerSpace";
import {
	SMALLEST_SPREAD,
	alignOffset,
	localBoxOf,
	mirroredStart,
	shiftAlong,
	spreadOffsets,
} from "./layoutGeometry";
import { boundsOf, canvasContentHullOf, canvasHullOf, hullOfRects } from "./selectionBounds";
import { freeAxesOf, placedOn } from "./snapAxes";

const BOX_ORIGIN: Point = { x: 0, y: 0 };

type AimScope = "selection" | "parent" | "bounds";

export interface AimSpec {
	axes: readonly GuideAxis[];
	at: number;
	scope: AimScope;
	message: string;
}

export interface AxisSpec {
	axis: GuideAxis;
	message: string;
}

interface Aim {
	layer: Layer;
	box: Rect;
	reference: Rect;
}

function readerOf(doc: DesignDocument): ReadLayer {
	return drawnRead(DOM_DRAWN, (id) => doc.layer(id));
}

function shownOf(read: ReadLayer, layer: Layer): Layer {
	return read(layer.id) ?? layer;
}

export function selectedLayers(doc: DesignDocument, user: UserState): readonly Layer[] {
	return user.selection.get().flatMap((id) => doc.layer(id) ?? []);
}

function freeAxesFor(read: ReadLayer, layer: Layer): readonly GuideAxis[] {
	const parent = layer.parent === null ? null : read(layer.parent);
	return freeAxesOf(parent?.layout.display ?? null, layer.layout.position);
}

function parentHullOf(read: ReadLayer, layer: Layer): Rect | null {
	const parent = layer.parent === null ? null : read(layer.parent);
	return parent === null ? null : canvasContentHullOf(read, parent, DOM_DRAWN.inset(parent.id));
}

function sharedBoxOf(read: ReadLayer, layers: readonly Layer[], scope: AimScope): Rect | null {
	if (scope === "parent" || (scope === "selection" && layers.length < 2)) {
		return null;
	}
	return boundsOf(
		read,
		layers.map((layer) => layer.id),
	);
}

function aimsOf(doc: DesignDocument, user: UserState, scope: AimScope): readonly Aim[] {
	const read = readerOf(doc);
	const layers = selectedLayers(doc, user);
	const shared = sharedBoxOf(read, layers, scope);
	return layers.flatMap((layer) => {
		const reference = shared ?? parentHullOf(read, layer);
		return reference === null
			? []
			: [{ layer, box: canvasHullOf(read, shownOf(read, layer)), reference }];
	});
}

function shiftLayer(doc: DesignDocument, read: ReadLayer, layer: Layer, shift: Point): void {
	const axes = freeAxesFor(read, layer);
	if (axes.length === 0) {
		return;
	}
	const held = doc.layer(layer.id);
	if (held === null) {
		return;
	}
	const chain = parentChain(read, layer.id);
	const zero = toParentPoint(chain, BOX_ORIGIN);
	const moved = toParentPoint(chain, shift);
	doc.update(
		layer.id,
		placedOn(axes, { x: held.x + moved.x - zero.x, y: held.y + moved.y - zero.y }),
	);
}

export function alignSelection(doc: DesignDocument, user: UserState, spec: AimSpec): boolean {
	const read = readerOf(doc);
	for (const aim of aimsOf(doc, user, spec.scope)) {
		const shift = shiftAlong(spec.axes, (axis) =>
			alignOffset(aim.box, aim.reference, axis, spec.at),
		);
		shiftLayer(doc, read, aim.layer, shift);
	}
	doc.commit(spec.message);
	return true;
}

export function flipSelection(doc: DesignDocument, user: UserState, spec: AimSpec): boolean {
	const read = readerOf(doc);
	for (const aim of aimsOf(doc, user, spec.scope)) {
		doc.update(aim.layer.id, { rotation: normalizeDegrees(-aim.layer.rotation) });
		const turned = read(aim.layer.id);
		if (turned !== null) {
			const box = canvasHullOf(read, turned);
			const shift = shiftAlong(
				spec.axes,
				(axis) => mirroredStart(aim.box, aim.reference, axis) - box[axis],
			);
			shiftLayer(doc, read, turned, shift);
		}
	}
	doc.commit(spec.message);
	return true;
}

export function spreadSelection(doc: DesignDocument, user: UserState, spec: AxisSpec): boolean {
	const read = readerOf(doc);
	const layers = selectedLayers(doc, user);
	const offsets = spreadOffsets(
		layers.map((layer) => canvasHullOf(read, shownOf(read, layer))),
		spec.axis,
	);
	for (const [index, layer] of layers.entries()) {
		shiftLayer(
			doc,
			read,
			layer,
			shiftAlong([spec.axis], () => offsets[index] ?? 0),
		);
	}
	doc.commit(spec.message);
	return true;
}

function childrenOf(doc: DesignDocument, parent: Layer): readonly Layer[] {
	return doc.childIds(parent.id).flatMap((id) => doc.layer(id) ?? []);
}

export function fitToChildren(doc: DesignDocument, user: UserState, message: string): boolean {
	const [parent] = selectedLayers(doc, user);
	if (parent === undefined) {
		return false;
	}
	const read = readerOf(doc);
	const children = childrenOf(doc, parent);
	const hull = hullOfRects(children.map((child) => localBoxOf(shownOf(read, child))));
	if (hull === null) {
		return false;
	}
	const size = { width: hull.width, height: hull.height };
	const place = anchoredPlace({ ...parent, ...size }, BOX_ORIGIN, outOfLayer(parent, hull));
	doc.update(parent.id, {
		...size,
		...placedOn(freeAxesFor(read, parent), place),
		layout: { width: "fixed", height: "fixed" },
	});
	for (const child of children) {
		doc.update(child.id, { x: child.x - hull.x, y: child.y - hull.y });
	}
	doc.commit(message);
	return true;
}

export interface TurnSpec {
	degrees: number;
	message: string;
}

export function turnSelection(doc: DesignDocument, user: UserState, spec: TurnSpec): boolean {
	for (const layer of selectedLayers(doc, user)) {
		const parents = parentChain((id) => doc.layer(id), layer.id);
		doc.update(layer.id, { rotation: turnedOnScreen(parents, layer.rotation, spec.degrees) });
	}
	doc.commit(spec.message);
	return true;
}

export function swapSelection(doc: DesignDocument, user: UserState, message: string): boolean {
	const read = readerOf(doc);
	for (const layer of selectedLayers(doc, user)) {
		const size = swappedBox(shownOf(read, layer));
		doc.update(layer.id, {
			...size,
			...placedOn(
				freeAxesFor(read, layer),
				placedAround({ ...layer, ...size }, visualCenterOf(layer)),
			),
			layout: { width: "fixed", height: "fixed" },
		});
	}
	doc.commit(message);
	return true;
}

export function canAim(doc: DesignDocument, layers: readonly Layer[], spec: AimSpec): boolean {
	const read = readerOf(doc);
	const shared = sharedBoxOf(read, layers, spec.scope) !== null;
	return layers.some(
		(layer) =>
			(shared || parentHullOf(read, layer) !== null) &&
			freeAxesFor(read, layer).some((axis) => spec.axes.includes(axis)),
	);
}

export function canSpread(doc: DesignDocument, layers: readonly Layer[], spec: AxisSpec): boolean {
	const read = readerOf(doc);
	return (
		layers.length >= SMALLEST_SPREAD &&
		layers.some((layer) => freeAxesFor(read, layer).includes(spec.axis))
	);
}

export function canFit(doc: DesignDocument, layers: readonly Layer[]): boolean {
	const [parent, peer] = layers;
	return (
		parent !== undefined &&
		peer === undefined &&
		parent.layout.display === "block" &&
		childrenOf(doc, parent).length > 0
	);
}

export function hasSelection(_doc: DesignDocument, layers: readonly Layer[]): boolean {
	return layers.length > 0;
}
