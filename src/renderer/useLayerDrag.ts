import { useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { DesignDocument, LayerId } from "../document/document";

interface DragState {
	pointerId: number;
	grabX: number;
	grabY: number;
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
			grabX: event.clientX - layer.x,
			grabY: event.clientY - layer.y,
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
		state.x = event.clientX - state.grabX;
		state.y = event.clientY - state.grabY;
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
