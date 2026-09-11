import type { Layer, LayerId } from "../../document/layer";
import type { Point } from "../state/camera";
import { parentChain, toParentPoint } from "./layerSpace";
import type { PointerTarget } from "./tool";

export function parentChainOf(target: PointerTarget, id: LayerId): Layer[] {
	return parentChain((layerId) => target.doc.layer(layerId), id);
}

export function parentPointOf(target: PointerTarget, id: LayerId, canvas: Point): Point {
	return toParentPoint(parentChainOf(target, id), canvas);
}

export function selectedLayer(target: PointerTarget): Layer | null {
	const [id] = target.user.selection.get();
	return id === undefined ? null : target.doc.layer(id);
}
