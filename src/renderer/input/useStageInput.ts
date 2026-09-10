import { useRef } from "react";
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
import type { LayerId } from "../../document/layer";
import { toCanvasPoint } from "../state/camera";
import type { Camera, Point } from "../state/camera";
import type { Slot } from "../state/slot";
import { GestureRecognizer } from "./gesture";
import type { Gesture, PointerSample } from "./gesture";
import { layerIdsUnder } from "./hitTest";

type StagePointerEvent = ReactPointerEvent<HTMLElement>;
type StageMouseEvent = ReactMouseEvent<HTMLElement>;

const PRIMARY_BUTTON = 0;

export interface StageInputHandlers {
	onDragStart: (origin: Point, point: Point, layerIds: readonly LayerId[]) => void;
	onDragMove: (point: Point) => void;
	onDragEnd: (point: Point) => void;
	onTap: (layerIds: readonly LayerId[]) => void;
	onContextMenu: (client: Point, layerIds: readonly LayerId[]) => void;
}

interface StagePointerHandlers {
	onContextMenu: (event: StageMouseEvent) => void;
	onPointerCancel: (event: StagePointerEvent) => void;
	onPointerDown: (event: StagePointerEvent) => void;
	onPointerMove: (event: StagePointerEvent) => void;
	onPointerUp: (event: StagePointerEvent) => void;
}

interface StageInput {
	recognizer: GestureRecognizer;
	stageOrigin: Point;
	layerIds: readonly LayerId[];
	pending: PointerSample | null;
	frame: number;
}

function createStageInput(): StageInput {
	return {
		recognizer: new GestureRecognizer(),
		stageOrigin: { x: 0, y: 0 },
		layerIds: [],
		pending: null,
		frame: 0,
	};
}

function isPrimaryButton(event: StagePointerEvent): boolean {
	return event.button === PRIMARY_BUTTON;
}

function sampleOf(event: StagePointerEvent): PointerSample {
	return { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
}

function clientPointOf(event: StageMouseEvent): Point {
	return { x: event.clientX, y: event.clientY };
}

function layerIdsAt(client: Point): readonly LayerId[] {
	return layerIdsUnder(document.elementsFromPoint(client.x, client.y));
}

function canvasPoint(input: StageInput, camera: Camera, client: Point): Point {
	return toCanvasPoint(camera, {
		x: client.x - input.stageOrigin.x,
		y: client.y - input.stageOrigin.y,
	});
}

function emit(
	gesture: Gesture | null,
	input: StageInput,
	handlers: StageInputHandlers,
	camera: Camera,
): void {
	switch (gesture?.kind) {
		case "dragStart": {
			handlers.onDragStart(
				canvasPoint(input, camera, gesture.origin),
				canvasPoint(input, camera, gesture.point),
				input.layerIds,
			);
			break;
		}
		case "dragMove": {
			handlers.onDragMove(canvasPoint(input, camera, gesture.point));
			break;
		}
		case "dragEnd": {
			handlers.onDragEnd(canvasPoint(input, camera, gesture.point));
			break;
		}
		case "tap": {
			handlers.onTap(input.layerIds);
			break;
		}
		case undefined: {
			break;
		}
	}
}

function step(input: StageInput, handlers: StageInputHandlers, camera: Camera): void {
	const pending = input.pending;
	input.pending = null;
	if (pending === null) {
		return;
	}
	emit(input.recognizer.move(pending), input, handlers, camera);
}

function flush(input: StageInput, handlers: StageInputHandlers, camera: Camera): void {
	if (input.frame !== 0) {
		cancelAnimationFrame(input.frame);
	}
	input.frame = 0;
	step(input, handlers, camera);
}

function beginGesture(input: StageInput, event: StagePointerEvent): void {
	if (!isPrimaryButton(event) || !input.recognizer.down(sampleOf(event))) {
		return;
	}
	const box = event.currentTarget.getBoundingClientRect();
	input.stageOrigin = { x: box.left, y: box.top };
	input.layerIds = layerIdsAt(clientPointOf(event));
	event.currentTarget.setPointerCapture(event.pointerId);
}

export function useStageInput(
	camera: Slot<Camera>,
	handlers: StageInputHandlers,
): StagePointerHandlers {
	const state = useRef<StageInput | null>(null);

	function finish(event: StagePointerEvent, cancelled: boolean): void {
		const input = state.current;
		if (input === null || !input.recognizer.tracks(event.pointerId)) {
			return;
		}
		const view = camera.get();
		flush(input, handlers, view);
		const sample = sampleOf(event);
		const gesture = cancelled ? input.recognizer.cancel(sample) : input.recognizer.up(sample);
		emit(gesture, input, handlers, view);
	}

	function onPointerDown(event: StagePointerEvent): void {
		beginGesture((state.current ??= createStageInput()), event);
	}

	function onContextMenu(event: StageMouseEvent): void {
		event.preventDefault();
		if (state.current?.recognizer.active() === true) {
			return;
		}
		const client = clientPointOf(event);
		handlers.onContextMenu(client, layerIdsAt(client));
	}

	function onPointerMove(event: StagePointerEvent): void {
		const input = state.current;
		if (input === null || !input.recognizer.tracks(event.pointerId)) {
			return;
		}
		input.pending = sampleOf(event);
		if (input.frame !== 0) {
			return;
		}
		input.frame = requestAnimationFrame(() => {
			input.frame = 0;
			step(input, handlers, camera.get());
		});
	}

	return {
		onContextMenu,
		onPointerCancel: (event) => {
			finish(event, true);
		},
		onPointerDown,
		onPointerMove,
		onPointerUp: (event) => {
			if (isPrimaryButton(event)) {
				finish(event, false);
			}
		},
	};
}
