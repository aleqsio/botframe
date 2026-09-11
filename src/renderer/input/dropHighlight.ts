import type { LayerId } from "../../document/layer";
import type { LayerMove } from "../state/userState";
import { changesParent } from "./moveDrag";
import type { RowDrag } from "./rowDrop";

export function droppedInto(move: LayerMove | null, drag: RowDrag | null): LayerId | null {
	if (move !== null) {
		return changesParent(move) ? move.parent : null;
	}
	return drag?.target?.place === "inside" ? drag.target.id : null;
}
