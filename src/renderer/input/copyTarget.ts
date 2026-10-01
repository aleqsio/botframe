import type { LayerId } from "../../document/layer";
import { layerPath, segmentsOf } from "../../document/path";

function within(selected: LayerId, path: LayerId): boolean {
	return selected === path || selected.startsWith(`${path}~`);
}

function copyTarget(id: LayerId, selection: readonly LayerId[]): LayerId {
	const segments = segmentsOf(id);
	for (let depth = 1; depth < segments.length; depth += 1) {
		const [node, ...copies] = segments.slice(0, depth).toReversed();
		const path = node === undefined ? id : layerPath(copies.toReversed(), node);
		if (!selection.some((selected) => within(selected, path))) {
			return path;
		}
	}
	return id;
}

export function copyTargets(ids: readonly LayerId[], selection: readonly LayerId[]): LayerId[] {
	return [...new Set(ids.map((id) => copyTarget(id, selection)))];
}
