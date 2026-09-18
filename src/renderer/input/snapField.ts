import type { LayerId } from "../../document/layer";
import { snapFieldOf } from "./snap";
import type { SnapField } from "./snap";
import { snapShapeOf } from "./snapShape";
import type { PointerTarget } from "./tool";

export function snapFieldAround(target: PointerTarget, dragged: LayerId): SnapField {
	const layer = target.doc.layer(dragged);
	const parent = layer?.parent ?? null;
	const container = parent === null ? null : target.doc.layer(parent);
	const shapes = target.doc.siblingIds(parent).flatMap((id) => {
		const sibling = id === dragged ? null : target.doc.layer(id);
		return sibling === null ? [] : [snapShapeOf(sibling)];
	});
	return snapFieldOf({
		points: shapes.flatMap((shape) => shape.points),
		curves: shapes.flatMap((shape) => shape.curves),
		container: container === null ? null : { span: container, guides: container.guides },
	});
}
