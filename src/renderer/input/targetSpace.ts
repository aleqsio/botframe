import type { Layer, LayerId } from "../../document/layer";
import type { Point } from "../state/camera";
import { drawnRead } from "./drawn";
import { parentChain, toParentPoint } from "./layerSpace";
import type { ReadLayer } from "./layerSpace";
import type { PointerTarget } from "./tool";

export function readerOf(target: PointerTarget): ReadLayer {
	return (id) => target.doc.layer(id);
}

export function drawnReaderOf(target: PointerTarget): ReadLayer {
	return drawnRead(target.drawn, readerOf(target));
}

export function parentChainOf(target: PointerTarget, id: LayerId): Layer[] {
	return parentChain(drawnReaderOf(target), id);
}

export function parentPointOf(target: PointerTarget, id: LayerId, canvas: Point): Point {
	return toParentPoint(parentChainOf(target, id), canvas);
}

export function selectedLayer(target: PointerTarget): Layer | null {
	const [id] = target.user.selection.get();
	return id === undefined ? null : drawnReaderOf(target)(id);
}
