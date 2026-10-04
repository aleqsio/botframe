import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Point } from "../state/camera";
import { UserState } from "../state/userState";
import { useStageInput } from "./useStageInput";
import type { StageInputHandlers, StagePointerEvent, StagePointerHandlers } from "./useStageInput";

const POINTER = 1;
const PRIMARY = 0;

interface FakeStage {
	origin: Point;
	handlers: StagePointerHandlers;
	frames: FrameRequestCallback[];
	drag: StageInputHandlers;
}

function pointerEventAt(stage: FakeStage, client: Point): StagePointerEvent {
	return {
		pointerId: POINTER,
		pointerType: "mouse",
		button: PRIMARY,
		clientX: client.x,
		clientY: client.y,
		timeStamp: 0,
		altKey: false,
		shiftKey: false,
		ctrlKey: false,
		metaKey: false,
		currentTarget: {
			getBoundingClientRect: () => ({ left: stage.origin.x, top: stage.origin.y }),
			setPointerCapture: () => {},
		},
	};
}

function Probe({
	report,
	drag,
}: {
	report: (handlers: StagePointerHandlers) => void;
	drag: StageInputHandlers;
}): null {
	report(useStageInput(new UserState(), drag));
	return null;
}

function mountStage(): FakeStage {
	const frames: FrameRequestCallback[] = [];
	vi.stubGlobal("requestAnimationFrame", (frame: FrameRequestCallback) => frames.push(frame));
	vi.stubGlobal("cancelAnimationFrame", () => {});
	vi.stubGlobal("document", { elementsFromPoint: () => [] });
	const drag: StageInputHandlers = {
		onDragStart: vi.fn<() => void>(),
		onDragMove: vi.fn<() => void>(),
		onDragEnd: vi.fn<() => void>(),
		onTap: vi.fn<() => void>(),
		onDoubleTap: vi.fn<() => void>(),
		onHover: vi.fn<() => void>(),
		onLeave: vi.fn<() => void>(),
		onContextMenu: vi.fn<() => void>(),
	};
	const probe: { handlers: StagePointerHandlers | null } = { handlers: null };
	renderToString(
		createElement(Probe, {
			report: (handlers) => {
				probe.handlers = handlers;
			},
			drag,
		}),
	);
	if (probe.handlers === null) {
		throw new Error("the probe did not render");
	}
	return { origin: { x: 0, y: 0 }, handlers: probe.handlers, frames, drag };
}

function runFrame(stage: FakeStage): void {
	const frame = stage.frames.shift();
	if (frame === undefined) {
		throw new Error("no frame is pending");
	}
	frame(0);
}

function tapAt(stage: FakeStage, client: Point): void {
	stage.handlers.onPointerDown(pointerEventAt(stage, client));
	stage.handlers.onPointerUp(pointerEventAt(stage, client));
}

function moveTo(stage: FakeStage, client: Point): void {
	stage.handlers.onPointerMove(pointerEventAt(stage, client));
	runFrame(stage);
}

describe("useStageInput", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("reads the stage origin on each frame, so a stage that moves during a drag keeps the pointer", () => {
		const stage = mountStage();
		stage.handlers.onPointerDown(pointerEventAt(stage, { x: 100, y: 100 }));
		moveTo(stage, { x: 110, y: 100 });
		expect(stage.drag.onDragStart).toHaveBeenCalledOnce();

		stage.origin = { x: 50, y: 20 };
		moveTo(stage, { x: 120, y: 100 });

		expect(stage.drag.onDragMove).toHaveBeenLastCalledWith(
			{ client: { x: 120, y: 100 }, stage: { x: 70, y: 80 }, canvas: { x: 70, y: 80 } },
			{ shift: false, alt: false, control: false },
		);
	});

	it("sends the second of two quick taps as a double tap", () => {
		const stage = mountStage();
		tapAt(stage, { x: 100, y: 100 });
		tapAt(stage, { x: 101, y: 100 });

		expect(stage.drag.onTap).toHaveBeenCalledOnce();
		expect(stage.drag.onDoubleTap).toHaveBeenCalledWith(
			[],
			{ client: { x: 101, y: 100 }, stage: { x: 101, y: 100 }, canvas: { x: 101, y: 100 } },
			{ shift: false, alt: false, control: false },
		);
	});
});
