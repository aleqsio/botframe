import type { Layer, LayerId } from "./layer";
import { NO_BASIS } from "./length";
import type { Basis, Size } from "./length";

export type ReadLayer = (id: LayerId) => Layer | null;

function sizeOf(layer: Size): Size {
	return { width: layer.width, height: layer.height };
}

function rootSize(read: ReadLayer, container: Layer): Size {
	let held = container;
	while (held.parent !== null) {
		const above = read(held.parent);
		if (above === null) {
			break;
		}
		held = above;
	}
	return sizeOf(held);
}

export function basisOf(read: ReadLayer, parent: LayerId | null): Basis {
	const container = parent === null ? null : read(parent);
	if (container === null) {
		return NO_BASIS;
	}
	return { container: sizeOf(container), root: rootSize(read, container) };
}
