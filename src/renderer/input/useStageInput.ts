import { useRef } from "react";
import type { MouseEvent as ReactMouseEvent, WheelEvent as ReactWheelEvent } from "react";
import type { LayerId } from "../../document/layer";
import { applyViewportDelta, toCanvasPoint } from "../state/camera";
import type { Camera, Point, StagePoint, ViewportDelta } from "../state/camera";
import type { UserState } from "../state/userState";
import { GestureRecognizer, sampleOf } from "./gesture";
import type { Gesture, PointerInput, PointerSample } from "./gesture";
import { layerIdsAt } from "./hitTest";
import { NO_MODIFIERS, modifiersOf } from "./modifiers";
import type { Modifiers } from "./modifiers";
import { wheelDelta } from "./wheel";

interface StageElement {
	getBoundingClientRect: () => Pick<DOMRect, "left" | "top">;
	setPointerCapture: (pointerId: number) => void;
}

export interface StagePointerEvent extends PointerInput {
	button: number;
	altKey: boolean;
	shiftKey: boolean;
	ctrlKey: boolean;
	metaKey: boolean;
	currentTarget: StageElement;
}

type StageMouseEvent = ReactMouseEvent<HTMLElement>;
type StageWheelEvent = ReactWheelEvent<HTMLElement>;

const PRIMARY_BUTTON = 0;

export interface StageInputHandlers {
	onDragStart: (
		origin: StagePoint,
		point: StagePoint,
		layerIds: readonly LayerId[],
		modifiers: Modifiers,
	) => void;
	onDragMove: (point: StagePoint, modifiers: Modifiers) => void;
	onDragEnd: (point: StagePoint, modifiers: Modifiers) => void;
	onTap: (layerIds: readonly LayerId[], point: StagePoint, modifiers: Modifiers) => void;
	onDoubleTap: (layerIds: readonly LayerId[], point: StagePoint, modifiers: Modifiers) => void;
	onHover: (point: StagePoint) => void;
	onLeave: () => void;
	onContextMenu: (client: Point, layerIds: readonly LayerId[]) => void;
}

export interface StagePointerHandlers {
	onContextMenu: (event: StageMouseEvent) => void;
	onPointerCancel: (event: StagePointerEvent) => void;
	onPointerLeave: (event: StagePointerEvent) => void;
	onPointerDown: (event: StagePointerEvent) => void;
	onPointerMove: (event: StagePointerEvent) => void;
	onPointerUp: (event: StagePointerEvent) => void;
	onWheel: (event: StageWheelEvent) => void;
}

interface PendingWheel {
	at: Point;
	pan: Point;
	scale: number;
}

interface StageInput {
	recognizer: GestureRecognizer;
	stage: StageElement | null;
	stageOrigin: Point;
	layerIds: readonly LayerId[];
	moves: Map<number, PointerSample>;
	hover: Point | null;
	modifiers: Modifiers;
	press: Modifiers;
	wheel: PendingWheel | null;
	frame: number;
}

interface StageSession {
	input: StageInput;
	handlers: StageInputHandlers;
	user: UserState;
}

function createStageInput(): StageInput {
	return {
		recognizer: new GestureRecognizer(),
		stage: null,
		stageOrigin: { x: 0, y: 0 },
		layerIds: [],
		moves: new Map(),
		hover: null,
		modifiers: NO_MODIFIERS,
		press: NO_MODIFIERS,
		wheel: null,
		frame: 0,
	};
}

function isPrimaryButton(event: StagePointerEvent): boolean {
	return event.button === PRIMARY_BUTTON;
}

function clientPointOf(event: Pick<StagePointerEvent, "clientX" | "clientY">): Point {
	return { x: event.clientX, y: event.clientY };
}

function stageOf(input: StageInput, client: Point): Point {
	return { x: client.x - input.stageOrigin.x, y: client.y - input.stageOrigin.y };
}

function stagePointOf(input: StageInput, camera: Camera, client: Point): StagePoint {
	const stage = stageOf(input, client);
	return { client, stage, canvas: toCanvasPoint(camera, stage) };
}

function moveViewport(session: StageSession, at: Point, delta: ViewportDelta): void {
	const camera = session.user.camera;
	camera.set(applyViewportDelta(camera.get(), stageOf(session.input, at), delta));
}

function emit(session: StageSession, gesture: Gesture | null): void {
	const { input, handlers } = session;
	const camera = session.user.camera.get();
	switch (gesture?.kind) {
		case "dragStart": {
			handlers.onDragStart(
				stagePointOf(input, camera, gesture.origin),
				stagePointOf(input, camera, gesture.point),
				input.layerIds,
				input.modifiers,
			);
			break;
		}
		case "dragMove": {
			handlers.onDragMove(stagePointOf(input, camera, gesture.point), input.modifiers);
			break;
		}
		case "dragEnd": {
			handlers.onDragEnd(stagePointOf(input, camera, gesture.point), input.modifiers);
			break;
		}
		case "tap": {
			handlers.onTap(input.layerIds, stagePointOf(input, camera, gesture.point), input.press);
			break;
		}
		case "doubleTap": {
			handlers.onDoubleTap(input.layerIds, stagePointOf(input, camera, gesture.point), input.press);
			break;
		}
		case "pinch": {
			moveViewport(session, gesture.center, gesture);
			break;
		}
		case undefined: {
			break;
		}
	}
}

function readStageOrigin(input: StageInput): void {
	if (input.stage === null) {
		return;
	}
	const box = input.stage.getBoundingClientRect();
	input.stageOrigin = { x: box.left, y: box.top };
}

function step(session: StageSession): void {
	const { input } = session;
	readStageOrigin(input);
	const wheel = input.wheel;
	const hover = input.hover;
	const moves = [...input.moves.values()];
	input.wheel = null;
	input.hover = null;
	input.moves.clear();
	if (wheel !== null) {
		moveViewport(session, wheel.at, wheel);
	}
	for (const sample of moves) {
		emit(session, input.recognizer.move(sample));
	}
	if (hover !== null) {
		session.handlers.onHover(stagePointOf(input, session.user.camera.get(), hover));
	}
}

function schedule(session: StageSession): void {
	const { input } = session;
	if (input.frame !== 0) {
		return;
	}
	input.frame = requestAnimationFrame(() => {
		input.frame = 0;
		step(session);
	});
}

function flush(session: StageSession): void {
	const { input } = session;
	if (input.frame !== 0) {
		cancelAnimationFrame(input.frame);
	}
	input.frame = 0;
	step(session);
}

function accumulate(previous: PendingWheel | null, at: Point, delta: ViewportDelta): PendingWheel {
	if (previous === null) {
		return { at, pan: delta.pan, scale: delta.scale };
	}
	return {
		at,
		pan: { x: previous.pan.x + delta.pan.x, y: previous.pan.y + delta.pan.y },
		scale: previous.scale * delta.scale,
	};
}

function beginGesture(session: StageSession, event: StagePointerEvent): void {
	if (!isPrimaryButton(event)) {
		return;
	}
	const { input } = session;
	flush(session);
	input.modifiers = modifiersOf(event);
	input.press = input.modifiers;
	const down = input.recognizer.down(sampleOf(event));
	if (!down.taken) {
		return;
	}
	emit(session, down.ended);
	input.layerIds = layerIdsAt({ x: event.clientX, y: event.clientY });
	event.currentTarget.setPointerCapture(event.pointerId);
}

function trackHover(session: StageSession, event: StagePointerEvent): void {
	const { input } = session;
	if (input.recognizer.active()) {
		return;
	}
	input.hover = clientPointOf(event);
	schedule(session);
}

function trackMove(session: StageSession, event: StagePointerEvent): void {
	const { input } = session;
	input.modifiers = modifiersOf(event);
	if (!input.recognizer.tracks(event.pointerId)) {
		trackHover(session, event);
		return;
	}
	input.moves.set(event.pointerId, sampleOf(event));
	schedule(session);
}

function trackWheel(session: StageSession, event: StageWheelEvent): void {
	const { input } = session;
	const at = { x: event.clientX, y: event.clientY };
	input.wheel = accumulate(input.wheel, at, wheelDelta(event, session.user.tool.get()));
	schedule(session);
}

function finish(session: StageSession, event: StagePointerEvent, cancelled: boolean): void {
	const { recognizer } = session.input;
	if (!recognizer.tracks(event.pointerId)) {
		return;
	}
	session.input.modifiers = modifiersOf(event);
	flush(session);
	const sample = sampleOf(event);
	emit(session, cancelled ? recognizer.cancel(sample) : recognizer.up(sample));
}

function leaveStage(session: StageSession): void {
	session.input.hover = null;
	session.handlers.onLeave();
}

function openMenu(session: StageSession, event: StageMouseEvent): void {
	event.preventDefault();
	if (session.input.recognizer.active()) {
		return;
	}
	const client = clientPointOf(event);
	session.handlers.onContextMenu(client, layerIdsAt(client));
}

export function useStageInput(user: UserState, handlers: StageInputHandlers): StagePointerHandlers {
	const input = useRef<StageInput | null>(null);

	function session(stage: StageElement): StageSession {
		const held = (input.current ??= createStageInput());
		held.stage = stage;
		return { input: held, handlers, user };
	}

	return {
		onContextMenu: (event) => {
			openMenu(session(event.currentTarget), event);
		},
		onPointerCancel: (event) => {
			finish(session(event.currentTarget), event, true);
		},
		onPointerLeave: (event) => {
			leaveStage(session(event.currentTarget));
		},
		onPointerDown: (event) => {
			beginGesture(session(event.currentTarget), event);
		},
		onPointerMove: (event) => {
			trackMove(session(event.currentTarget), event);
		},
		onPointerUp: (event) => {
			if (isPrimaryButton(event)) {
				finish(session(event.currentTarget), event, false);
			}
		},
		onWheel: (event) => {
			trackWheel(session(event.currentTarget), event);
		},
	};
}
