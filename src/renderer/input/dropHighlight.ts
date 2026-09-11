import type { LayerId } from "../../document/layer";
import type { LayerMove } from "../state/userState";
import type { RowDrag } from "./rowDrop";

export function droppedInto(move: LayerMove | null, drag: RowDrag | null): LayerId | null {
	if (move !== null) {
		return move.parent;
	}
	return drag?.target?.place === "inside" ? drag.target.id : null;
}
