import type { Point } from "../state/camera";
import { isLayerId } from "./hitTest";
import { rowPlaceOf } from "./rowDrop";
import type { RowTarget } from "./rowDrop";

const ROW_ATTRIBUTE = "data-row-id";

export function rowTargetAt(client: Point): RowTarget | null {
	const row = document.elementFromPoint(client.x, client.y)?.closest(`[${ROW_ATTRIBUTE}]`) ?? null;
	if (row === null) {
		return null;
	}
	const id = row.getAttribute(ROW_ATTRIBUTE) ?? "";
	if (!isLayerId(id)) {
		return null;
	}
	const box = row.getBoundingClientRect();
	return { id, place: rowPlaceOf(client.y - box.top, box.height) };
}
