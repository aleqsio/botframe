import { useState } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import type { DesignDocument } from "../../../document/document";
import type { Layer } from "../../../document/layer";
import type { MediaStack } from "../../../document/media";
import { usePointerDrag } from "../../input/usePointerDrag";
import { MEDIA_MESSAGE } from "../mediaFile";

export type FillRow = "media" | "paint";

type RowPointer = (event: ReactPointerEvent<HTMLElement>) => void;

export interface RowDrag {
	"data-row": FillRow;
	"data-dragged": "" | undefined;
}

interface SectionDrag {
	onPointerDown: RowPointer;
	onPointerMove: RowPointer;
	onPointerUp: RowPointer;
	onPointerCancel: RowPointer;
}

export interface FillOrder {
	rows: readonly FillRow[];
	dragOf: (row: FillRow) => RowDrag;
	section: SectionDrag;
	dropped: () => boolean;
}

function rowUnder(target: EventTarget): FillRow | null {
	if (!(target instanceof HTMLElement) || target instanceof HTMLInputElement) {
		return null;
	}
	const row = target.closest<HTMLElement>("[data-row]")?.dataset["row"];
	return row === "media" || row === "paint" ? row : null;
}

const OTHER: Readonly<Record<FillRow, FillRow>> = { media: "paint", paint: "media" };

export function stackAt(row: FillRow, above: boolean): MediaStack {
	return (row === "media") === above ? "over" : "under";
}

function isAbove(section: HTMLElement | null, row: FillRow, y: number): boolean | null {
	const other = section?.querySelector(`[data-row="${OTHER[row]}"]`);
	if (other === null || other === undefined) {
		return null;
	}
	const box = other.getBoundingClientRect();
	return y < box.top + box.height / 2;
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
			const above = isAbove(section.current, row, pointer.y);
			setPreview(above === null ? null : stackAt(row, above));
			return true;
		},
		drop: (row, pointer) => {
			const above = isAbove(section.current, row, pointer.y);
			const next = above === null ? null : stackAt(row, above);
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
				if (row !== null) {
					drag.onPointerDown(event, row);
				}
			},
			onPointerMove: drag.onPointerMove,
			onPointerUp: drag.onPointerUp,
			onPointerCancel: drag.onPointerCancel,
		},
		dropped: drag.dropped,
	};
}
