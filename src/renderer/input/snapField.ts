import type { LayerId } from "../../document/layer";
import { snapFieldOf } from "./snap";
import type { SnapField } from "./snap";
import { snapShapeOf } from "./snapShape";
import { drawnReaderOf } from "./targetSpace";
import type { PointerTarget } from "./tool";

export function snapFieldAround(target: PointerTarget, dragged: LayerId): SnapField {
	const read = drawnReaderOf(target);
	const parent = read(dragged)?.parent ?? null;
	const container = parent === null ? null : read(parent);
	const shapes = target.doc.siblingIds(parent).flatMap((id) => {
		const sibling = id === dragged ? null : read(id);
		return sibling === null ? [] : [snapShapeOf(sibling)];
	});
	return snapFieldOf({
		points: shapes.flatMap((shape) => shape.points),
		curves: shapes.flatMap((shape) => shape.curves),
		container:
			container === null
				? null
				: { span: container, inset: target.drawn.inset(container.id), guides: container.guides },
	});
}
