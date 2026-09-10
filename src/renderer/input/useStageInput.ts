import { useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { LayerId } from "../../document/layer";
import { toCanvasPoint } from "../state/camera";
import type { Camera, Point } from "../state/camera";
import type { Slot } from "../state/slot";
import { GestureRecognizer } from "./gesture";
import type { Gesture, PointerSample } from "./gesture";

type StagePointerEvent = ReactPointerEvent<HTMLElement>;

const PRIMARY_BUTTON = 0;

export interface StageInputHandlers {
	onDragStart: (origin: Point, point: Point, layerId: LayerId | null) => void;
	onDragMove: (point: Point) => void;
	onDragEnd: (point: Point) => void;
	onTap: (layerId: LayerId | null) => void;
}

interface StagePointerHandlers {
	onPointerCancel: (event: StagePointerEvent) => void;
	onPointerDown: (event: StagePointerEvent) => void;
	onPointerMove: (event: StagePointerEvent) => void;
	onPointerUp: (event: StagePointerEvent) => void;
}

interface StageInput {
	recognizer: GestureRecognizer;
	stageOrigin: Point;
	layerId: LayerId | null;
	pending: PointerSample | null;
	frame: number;
}

function createStageInput(): StageInput {
	return {
		recognizer: new GestureRecognizer(),
		stageOrigin: { x: 0, y: 0 },
		layerId: null,
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

function isLayerId(value: string): value is LayerId {
	return /^\d+@\d+$/u.test(value);
}

function layerIdAt(target: EventTarget): LayerId | null {
	const element = target instanceof Element ? target.closest("[data-layer-id]") : null;
	const value = element instanceof HTMLElement ? element.dataset["layerId"] : undefined;
	return value !== undefined && isLayerId(value) ? value : null;
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
				input.layerId,
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
			handlers.onTap(input.layerId);
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
	input.layerId = layerIdAt(event.target);
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
