import type { LayerId } from "../../document/layer";
import { isRootArtboard } from "../components/layerEntry";
import type { LayerMove } from "../state/userState";
import type { ReadLayer } from "./layerSpace";
import { changesParent } from "./moveDrag";
import type { RowDrag } from "./rowDrop";

function dropTarget(move: LayerMove | null, drag: RowDrag | null): LayerId | null {
	if (move !== null) {
		return changesParent(move) ? move.parent : null;
	}
	return drag?.target?.place === "inside" ? drag.target.id : null;
}

export function droppedInto(
	move: LayerMove | null,
	drag: RowDrag | null,
	read: ReadLayer,
): LayerId | null {
	const id = dropTarget(move, drag);
	return id === null || isRootArtboard(read(id)) ? null : id;
}
