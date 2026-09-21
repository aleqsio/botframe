import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DesignDocument } from "../../document/document";
import type { StagePoint } from "../state/camera";
import { UserState } from "../state/userState";
import { NO_MODIFIERS } from "./modifiers";
import { useToolInput } from "./useToolInput";
import type { StageInputHandlers } from "./useStageInput";

const behavior = vi.hoisted(() => ({
	dragStart: (): boolean => true,
	drag: vi.fn<() => boolean>(),
}));

vi.mock("./toolBehavior", () => ({ behaviorFor: () => behavior }));

const FIRST: StagePoint = { client: { x: 1, y: 1 }, stage: { x: 1, y: 1 }, canvas: { x: 1, y: 1 } };
const SECOND: StagePoint = {
	client: { x: 2, y: 2 },
	stage: { x: 2, y: 2 },
	canvas: { x: 2, y: 2 },
};

function Probe({ report }: { report: (handlers: StageInputHandlers) => void }): null {
	report(useToolInput(DesignDocument.create(), new UserState()));
	return null;
}

interface Tool {
	handlers: StageInputHandlers;
	frames: FrameRequestCallback[];
}

function renderTool(): Tool {
	const frames: FrameRequestCallback[] = [];
	vi.stubGlobal("requestAnimationFrame", (frame: FrameRequestCallback) => frames.push(frame));
	const probe: { handlers: StageInputHandlers | null } = { handlers: null };
	renderToString(
		createElement(Probe, {
			report: (handlers) => {
				probe.handlers = handlers;
			},
		}),
	);
	if (probe.handlers === null) {
		throw new Error("the probe did not render");
	}
	return { handlers: probe.handlers, frames };
}

function mountTool(): Tool {
	const tool = renderTool();
	tool.handlers.onDragStart(FIRST, FIRST, [], NO_MODIFIERS);
	runFrames(tool.frames);
	behavior.drag.mockClear();
	return tool;
}

function runFrames(frames: FrameRequestCallback[]): void {
	for (const frame of frames.splice(0)) {
		frame(0);
	}
}

describe("useToolInput", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		behavior.drag.mockReset();
	});

	it("solves once on the frame after the start, because a start cannot report a reorder", () => {
		const { handlers, frames } = renderTool();
		behavior.drag.mockReturnValue(false);

		handlers.onDragStart(FIRST, FIRST, [], NO_MODIFIERS);
		expect(behavior.drag).not.toHaveBeenCalled();
		runFrames(frames);

		expect(behavior.drag).toHaveBeenCalledExactlyOnceWith(expect.anything(), FIRST, NO_MODIFIERS);
	});

	it("solves once more on the next frame when the drag asks for it, with the latest point", () => {
		const { handlers, frames } = mountTool();
		behavior.drag.mockReturnValueOnce(true).mockReturnValue(false);

		handlers.onDragMove(FIRST, NO_MODIFIERS);
		handlers.onDragMove(SECOND, NO_MODIFIERS);
		expect(behavior.drag).toHaveBeenCalledTimes(2);
		runFrames(frames);

		expect(behavior.drag).toHaveBeenCalledTimes(3);
		expect(behavior.drag).toHaveBeenLastCalledWith(expect.anything(), SECOND, NO_MODIFIERS);
	});

	it("queues one frame for a gesture when the start and a move both ask", () => {
		const { handlers, frames } = renderTool();
		behavior.drag.mockReturnValue(true);

		handlers.onDragStart(FIRST, FIRST, [], NO_MODIFIERS);
		handlers.onDragMove(SECOND, NO_MODIFIERS);

		expect(frames).toHaveLength(1);
		runFrames(frames);
		expect(behavior.drag).toHaveBeenCalledTimes(2);
		expect(frames).toHaveLength(1);
	});

	it("keeps solving while each solve asks for one more frame", () => {
		const { handlers, frames } = mountTool();
		behavior.drag.mockReturnValueOnce(true).mockReturnValueOnce(true).mockReturnValue(false);

		handlers.onDragMove(FIRST, NO_MODIFIERS);
		runFrames(frames);
		runFrames(frames);

		expect(behavior.drag).toHaveBeenCalledTimes(3);
		expect(frames).toHaveLength(0);
	});

	it("does not solve after the gesture ends", () => {
		const { handlers, frames } = mountTool();
		behavior.drag.mockReturnValue(true);

		handlers.onDragMove(FIRST, NO_MODIFIERS);
		handlers.onDragEnd(FIRST, NO_MODIFIERS);
		runFrames(frames);

		expect(behavior.drag).toHaveBeenCalledTimes(1);
	});
});
