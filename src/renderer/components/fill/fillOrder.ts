import { useState } from "react";
import type {
	MouseEvent as ReactMouseEvent,
	PointerEvent as ReactPointerEvent,
	RefObject,
} from "react";
import type { DesignDocument } from "../../../document/document";
import type { Layer } from "../../../document/layer";
import type { MediaStack } from "../../../document/media";
import { usePointerDrag } from "../../input/usePointerDrag";
import type { PointerHandlers } from "../../input/usePointerDrag";
import type { Point } from "../../state/camera";
import { MEDIA_MESSAGE } from "../mediaFile";

export type FillRow = "media" | "paint";

export interface RowDrag {
	"data-row": FillRow;
	"data-dragged": "" | undefined;
}

interface SectionDrag extends PointerHandlers {
	onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
	onClickCapture: (event: ReactMouseEvent<HTMLElement>) => void;
}

export interface FillOrder {
	rows: readonly FillRow[];
	dragOf: (row: FillRow) => RowDrag;
	section: SectionDrag;
}

function rowUnder(target: EventTarget): FillRow | null {
	if (!(target instanceof HTMLElement) || target instanceof HTMLInputElement) {
		return null;
	}
	const button = target.closest("button");
	if (button !== null && !Object.hasOwn(button.dataset, "opens")) {
		return null;
	}
	const row = target.closest<HTMLElement>("[data-row]")?.dataset["row"];
	return row === "media" || row === "paint" ? row : null;
}

export function stackAt(row: FillRow, above: boolean): MediaStack {
	return (row === "media") === above ? "over" : "under";
}

function stackUnder(section: HTMLElement | null, row: FillRow, pointer: Point): MediaStack | null {
	const other = section?.querySelector(`[data-row]:not([data-row="${row}"])`);
	if (other === null || other === undefined) {
		return null;
	}
	const box = other.getBoundingClientRect();
	return stackAt(row, pointer.y < box.top + box.height / 2);
}

export function useFillOrder(
	doc: DesignDocument,
	layer: Layer,
	section: RefObject<HTMLElement | null>,
): FillOrder {
	const [dragged, setDragged] = useState<FillRow | null>(null);
	const [preview, setPreview] = useState<MediaStack | null>(null);
	const { media } = layer;
	const drag = usePointerDrag<FillRow>({
		begin: setDragged,
		step: (row, pointer) => {
			setPreview(stackUnder(section.current, row, pointer));
			return true;
		},
		drop: (row, pointer) => {
			const next = stackUnder(section.current, row, pointer);
			if (media !== null && next !== null && next !== media.stack) {
				doc.update(layer.id, { media: { ...media, stack: next } });
				doc.commit(MEDIA_MESSAGE);
			}
		},
		stop: () => {
			setDragged(null);
			setPreview(null);
		},
	});
	const stack = preview ?? media?.stack ?? "over";
	return {
		rows: stack === "over" ? ["media", "paint"] : ["paint", "media"],
		dragOf: (row) => ({ "data-row": row, "data-dragged": dragged === row ? "" : undefined }),
		section: {
			onPointerDown: (event) => {
				const row = rowUnder(event.target);
				if (row === null) {
					drag.dropped();
				} else {
					drag.onPointerDown(event, row);
				}
			},
			onPointerMove: drag.onPointerMove,
			onPointerUp: drag.onPointerUp,
			onPointerCancel: drag.onPointerCancel,
			onClickCapture: (event) => {
				if (drag.dropped()) {
					event.preventDefault();
					event.stopPropagation();
				}
			},
		},
	};
}
