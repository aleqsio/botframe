import { DesignDocument } from "../../document/document";
import { firstId } from "../../document/documentFixtures";
import type { Layer, LayerFields, LayerId, Rect } from "../../document/layer";
import { toCanvasPoint } from "../state/camera";
import type { Camera, Point, StagePoint } from "../state/camera";
import { UserState } from "../state/userState";
import { NO_DRAWN } from "./drawn";
import type { DrawnReader } from "./drawn";
import { centerOf, chainTurn, fromParentPoint, layerChain, normalizeDegrees } from "./layerSpace";
import { drawnReaderOf, parentChainOf } from "./targetSpace";
import { NO_MODIFIERS } from "./modifiers";
import type { Modifiers } from "./modifiers";
import type { PointerTarget, ToolBehavior } from "./tool";

export { firstId };

export interface DragSpec {
	press: Point;
	release: Point;
	modifiers?: Modifiers;
}

const NESTED_CHILD: LayerFields = {
	x: 20,
	y: 20,
	width: 60,
	height: 40,
	fill: "#d9d9d9",
	name: "",
	clip: false,
	geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, frame: false },
};

const COVER: Omit<LayerFields, "x" | "y" | "width" | "height"> = {
	fill: "#ffffff",
	name: "",
	clip: false,
	geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, frame: false },
};

export const NO_HITS = (): readonly LayerId[] => [];

export function targetOf(withLayer: boolean): PointerTarget {
	const doc = DesignDocument.create();
	return {
		doc,
		user: new UserState(),
		layerIds: withLayer ? [firstId(doc)] : [],
		layerIdsAt: NO_HITS,
		drawn: NO_DRAWN,
	};
}

export interface CoveredScene {
	target: PointerTarget;
	above: LayerId;
	below: LayerId;
}

export function coveredTarget(): CoveredScene {
	const doc = DesignDocument.create();
	const below = firstId(doc);
	const box = doc.layer(below);
	if (box === null) {
		throw new Error("the document has no layer");
	}
	const above = doc.createLayer({
		...COVER,
		x: box.x,
		y: box.y,
		width: box.width,
		height: box.height,
	});
	const user = new UserState();
	user.selection.set([below]);
	return {
		target: { doc, user, layerIds: [above, below], layerIdsAt: NO_HITS, drawn: NO_DRAWN },
		above,
		below,
	};
}

export interface DropScene {
	target: PointerTarget;
	layer: LayerId;
	into: LayerId;
	setHits: (ids: readonly LayerId[]) => void;
}

export function dropScene(fields: LayerFields): DropScene {
	const doc = DesignDocument.create();
	const layer = firstId(doc);
	let hits: readonly LayerId[] = [];
	return {
		target: {
			doc,
			user: new UserState(),
			layerIds: [layer],
			layerIdsAt: () => hits,
			drawn: NO_DRAWN,
		},
		layer,
		into: doc.createLayer(fields),
		setHits: (ids) => {
			hits = ids;
		},
	};
}

export function nestedTarget(rotation: number): { target: PointerTarget; child: LayerId } {
	const doc = DesignDocument.create();
	const parent = firstId(doc);
	doc.update(parent, {
		rotation,
		geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, frame: true },
	});
	const child = doc.createLayer(NESTED_CHILD, parent);
	const layerIdsAt = (): readonly LayerId[] => [child, parent];
	const target = {
		doc,
		user: new UserState(),
		layerIds: [child, parent],
		layerIdsAt,
		drawn: NO_DRAWN,
	};
	return { target, child };
}

export interface Slot extends Rect {
	parent: LayerId | null;
}

export function drawnOf(slots: ReadonlyMap<LayerId, Slot>): DrawnReader {
	return {
		...NO_DRAWN,
		box: (layer) => {
			const slot = slots.get(layer.id);
			return slot === undefined ? null : { ...slot, placed: slot.parent === layer.parent };
		},
	};
}

export function drawnCenterOf(target: PointerTarget, id: LayerId): Point {
	const drawn = drawnReaderOf(target)(id);
	if (drawn === null) {
		throw new Error("the document lost the layer");
	}
	return fromParentPoint(parentChainOf(target, id), centerOf(drawn));
}

export function anchorOnScreen(target: PointerTarget, id: LayerId, anchor: Point): Point {
	const chain = layerChain(drawnReaderOf(target), id);
	const layer = chain.at(-1);
	if (layer === undefined) {
		throw new Error("the document lost the layer");
	}
	return fromParentPoint(chain, { x: anchor.x * layer.width, y: anchor.y * layer.height });
}

export function turnOnScreen(target: PointerTarget, id: LayerId): number {
	return normalizeDegrees(chainTurn(layerChain(drawnReaderOf(target), id)));
}

export function lastDrawn(target: PointerTarget): Layer {
	const [id] = target.user.selection.get();
	const layer = id === undefined ? null : target.doc.layer(id);
	if (layer === null) {
		throw new Error("no layer is selected");
	}
	return layer;
}

export function pointAt(camera: Camera, stage: Point): StagePoint {
	return { client: stage, stage, canvas: toCanvasPoint(camera, stage) };
}

export function tapAt(
	behavior: ToolBehavior,
	target: PointerTarget,
	stage: Point,
	modifiers: Modifiers = NO_MODIFIERS,
): void {
	behavior.tap?.(target, pointAt(target.user.camera.get(), stage), modifiers);
}

export function dragOver(behavior: ToolBehavior, target: PointerTarget, spec: DragSpec): void {
	const camera = target.user.camera.get();
	const modifiers = spec.modifiers ?? NO_MODIFIERS;
	behavior.dragStart?.(target, pointAt(camera, spec.press), pointAt(camera, spec.press), modifiers);
	behavior.drag?.(target, pointAt(camera, spec.release), modifiers);
	behavior.dragEnd?.(target, pointAt(camera, spec.release), modifiers);
}

export const ROW_CHILD: LayerFields = {
	x: 10,
	y: 20,
	width: 60,
	height: 40,
	fill: "#d9d9d9",
	name: "",
	clip: false,
	geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, frame: false },
};

const SLOT_WIDTH = 60;

export interface RowOfThree {
	target: PointerTarget;
	ids: readonly LayerId[];
}

export function rowScene(): { target: PointerTarget; child: LayerId } {
	const scene = nestedTarget(0);
	scene.target.doc.update(firstId(scene.target.doc), { layout: { display: "row" } });
	scene.target.doc.commit("set display");
	return scene;
}

export function idAt(ids: readonly LayerId[], index: number): LayerId {
	const id = ids[index];
	if (id === undefined) {
		throw new Error(`the scene has no layer ${index}`);
	}
	return id;
}

export function rowOfThree(): RowOfThree {
	const { target } = rowScene();
	const doc = target.doc;
	const parent = firstId(doc);
	for (const id of doc.childIds(parent)) {
		doc.deleteLayer(id);
	}
	const ids = [10, 90, 170].map((at) => doc.createLayer({ ...ROW_CHILD, x: at }, parent));
	doc.commit("fill the row");
	const hits = [idAt(ids, 0), parent];
	return { target: { ...target, layerIds: hits, layerIdsAt: () => hits }, ids };
}

export function rowSlots(parent: LayerId, ids: readonly LayerId[]): ReadonlyMap<LayerId, Slot> {
	return new Map(
		ids.map((id, index) => [
			id,
			{ parent, x: index * SLOT_WIDTH, y: 0, width: SLOT_WIDTH, height: 40 },
		]),
	);
}

export function laidOutRow(): RowOfThree {
	const { target, ids } = rowOfThree();
	return { target: { ...target, drawn: drawnOf(rowSlots(firstId(target.doc), ids)) }, ids };
}
