import type { Layer, LayerId } from "../../document/layer";
import { snapFieldOf } from "./snap";
import type { SnapField } from "./snap";
import { snapPointsOf } from "./snapPoints";
import type { PointerTarget } from "./tool";

function containerOf(container: Layer | null): { span: Layer; guides: Layer["guides"] } | null {
	return container === null ? null : { span: container, guides: container.guides };
}

export function snapFieldAround(target: PointerTarget, dragged: LayerId): SnapField {
	const layer = target.doc.layer(dragged);
	const parent = layer?.parent ?? null;
	const container = parent === null ? null : target.doc.layer(parent);
	const points = target.doc.siblingIds(parent).flatMap((id) => {
		const sibling = id === dragged ? null : target.doc.layer(id);
		return sibling === null ? [] : snapPointsOf(sibling);
	});
	return snapFieldOf({ points, container: containerOf(container) });
}
