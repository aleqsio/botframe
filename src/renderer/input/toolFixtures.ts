import { DesignDocument } from "../../document/document";
import { firstId } from "../../document/documentFixtures";
import type { Layer, LayerFields, LayerId } from "../../document/layer";
import { toCanvasPoint } from "../state/camera";
import type { Camera, Point, StagePoint } from "../state/camera";
import { UserState } from "../state/userState";
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
	geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, artboard: false },
};

const COVER: Omit<LayerFields, "x" | "y" | "width" | "height"> = {
	fill: "#ffffff",
	name: "",
	clip: false,
	geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, artboard: false },
};

export const NO_HITS = (): readonly LayerId[] => [];

export function targetOf(withLayer: boolean): PointerTarget {
	const doc = DesignDocument.create();
	return {
		doc,
		user: new UserState(),
		layerIds: withLayer ? [firstId(doc)] : [],
		layerIdsAt: NO_HITS,
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
	return { target: { doc, user, layerIds: [above, below], layerIdsAt: NO_HITS }, above, below };
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
		target: { doc, user: new UserState(), layerIds: [layer], layerIdsAt: () => hits },
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
		geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, artboard: true },
	});
	const child = doc.createLayer(NESTED_CHILD, parent);
	const layerIdsAt = (): readonly LayerId[] => [child, parent];
	return { target: { doc, user: new UserState(), layerIds: [child, parent], layerIdsAt }, child };
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

export function tapAt(behavior: ToolBehavior, target: PointerTarget, stage: Point): void {
	behavior.tap?.(target, pointAt(target.user.camera.get(), stage));
}

export function dragOver(behavior: ToolBehavior, target: PointerTarget, spec: DragSpec): void {
	const camera = target.user.camera.get();
	const modifiers = spec.modifiers ?? NO_MODIFIERS;
	behavior.dragStart?.(target, pointAt(camera, spec.press), pointAt(camera, spec.press), modifiers);
	behavior.drag?.(target, pointAt(camera, spec.release), modifiers);
	behavior.dragEnd?.(target, pointAt(camera, spec.release), modifiers);
}
