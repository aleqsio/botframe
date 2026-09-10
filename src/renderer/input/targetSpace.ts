import type { LayerId } from "../../document/layer";
import type { Point } from "../state/camera";
import { parentChain, toParentPoint } from "./layerSpace";
import type { PointerTarget } from "./tool";

export function parentPointOf(target: PointerTarget, id: LayerId, canvas: Point): Point {
	return toParentPoint(
		parentChain((layerId) => target.doc.layer(layerId), id),
		canvas,
	);
}
