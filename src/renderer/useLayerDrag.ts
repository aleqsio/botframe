import { useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { DesignDocument } from "../document/document";
import type { LayerId } from "../document/layer";

interface DragState {
	pointerId: number;
	originX: number;
	originY: number;
	pointerX: number;
	pointerY: number;
	x: number;
	y: number;
	frame: number;
}

export interface DragHandlers {
	onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => void;
	onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
	onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
	onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
}

export function useLayerDrag(doc: DesignDocument, id: LayerId): DragHandlers {
	const drag = useRef<DragState | null>(null);

	function begin(event: ReactPointerEvent<HTMLDivElement>): void {
		const layer = doc.layer(id);
		if (layer === null) {
			return;
		}
		event.currentTarget.setPointerCapture(event.pointerId);
		drag.current = {
			pointerId: event.pointerId,
			originX: layer.x,
			originY: layer.y,
			pointerX: event.clientX,
			pointerY: event.clientY,
			x: layer.x,
			y: layer.y,
			frame: 0,
		};
	}

	function move(event: ReactPointerEvent<HTMLDivElement>): void {
		const state = drag.current;
		if (state === null || state.pointerId !== event.pointerId) {
			return;
		}
		state.x = state.originX + (event.clientX - state.pointerX);
		state.y = state.originY + (event.clientY - state.pointerY);
		if (state.frame !== 0) {
			return;
		}
		state.frame = requestAnimationFrame(() => {
			state.frame = 0;
			doc.move(id, state.x, state.y);
		});
	}

	function end(event: ReactPointerEvent<HTMLDivElement>): void {
		const state = drag.current;
		if (state === null || state.pointerId !== event.pointerId) {
			return;
		}
		if (state.frame !== 0) {
			cancelAnimationFrame(state.frame);
		}
		drag.current = null;
		doc.move(id, state.x, state.y);
		doc.commit("move layer");
	}

	return { onPointerCancel: end, onPointerDown: begin, onPointerMove: move, onPointerUp: end };
}
