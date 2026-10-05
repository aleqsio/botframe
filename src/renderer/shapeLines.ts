import type { Layer, LayerId } from "../document/layer";

export interface ShapeLine {
	id: LayerId;
	mask: boolean;
}

export function ownLineShown(layer: Layer): boolean {
	const { geometry } = layer;
	if (geometry.kind === "rectangle") {
		return !geometry.frame && geometry.cornerRadius > 0;
	}
	return geometry.kind === "path" || geometry.kind === "ellipse";
}

export function shapeLinesOf(
	layer: Layer,
	mask: LayerId | null,
	edited: LayerId | null,
): ShapeLine[] {
	const own = ownLineShown(layer) && layer.id !== edited ? [{ id: layer.id, mask: false }] : [];
	const masked = mask === null || mask === edited ? [] : [{ id: mask, mask: true }];
	return [...own, ...masked];
}
