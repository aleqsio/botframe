import type { LayerId } from "../../document/layer";
import type { Point } from "../state/camera";

const LAYER_ID = /^\d+@\d+$/u;
const LAYER_ATTRIBUTE = "data-layer-id";
const ZERO_ALPHA_HEX = /^#(?:[\da-f]{3}0|[\da-f]{6}00)$/u;
const COLOR_FUNCTION = /^rgba?\((?<body>.*)\)$/u;
const ZERO_ALPHA = /^(?:0+(?:\.0*)?|\.0+)%?$/u;

export interface HitElement {
	getAttribute: (name: string) => string | null;
}

function isLayerId(value: string): value is LayerId {
	return LAYER_ID.test(value);
}

export function layerIdsUnder(elements: Iterable<HitElement>): LayerId[] {
	const ids: LayerId[] = [];
	for (const candidate of elements) {
		const value = candidate.getAttribute(LAYER_ATTRIBUTE);
		if (value !== null && isLayerId(value)) {
			ids.push(value);
		}
	}
	return ids;
}

export function layerIdsAt(client: Point): readonly LayerId[] {
	return layerIdsUnder(document.elementsFromPoint(client.x, client.y));
}

function alphaOf(color: string): string | undefined {
	const body = COLOR_FUNCTION.exec(color)?.groups?.["body"];
	if (body === undefined) {
		return undefined;
	}
	const parts = body.includes("/") ? body.split("/") : body.split(",");
	return parts.length === 2 || parts.length === 4 ? parts.at(-1) : undefined;
}

export function isFullyTransparent(color: string): boolean {
	const value = color.trim().toLowerCase();
	if (value === "transparent" || ZERO_ALPHA_HEX.test(value)) {
		return true;
	}
	const alpha = alphaOf(value);
	return alpha !== undefined && ZERO_ALPHA.test(alpha.trim());
}

export function visibleLayerIds(
	ids: readonly LayerId[],
	fillOf: (id: LayerId) => string | null,
): LayerId[] {
	return ids.filter((id) => {
		const fill = fillOf(id);
		return fill !== null && !isFullyTransparent(fill);
	});
}
