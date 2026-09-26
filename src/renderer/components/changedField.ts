import type { Layer } from "../../document/layer";

const CORNERS: ReadonlySet<string> = new Set(["cornerRadius", "cornerSmoothing"]);

export function isChanged(layer: Layer, key: string): boolean {
	const own = CORNERS.has(key) ? "geometry" : key;
	return layer.changed.some(
		(held) => held === own || held === `${key}Unit` || held === `bindings.${key}`,
	);
}

export function changedMark(changed: boolean): "" | undefined {
	return changed ? "" : undefined;
}
