import { describe, expect, it } from "vitest";
import type { KeyStroke } from "./layerCommand";
import { NO_MODIFIERS } from "./modifiers";
import { behaviorFor } from "./toolBehavior";
import { nestedTarget, pointAt, tapAt } from "./toolFixtures";
import { handleStroke } from "./useKeyInput";

const ESCAPE: KeyStroke = {
	key: "Escape",
	shiftKey: false,
	altKey: false,
	ctrlKey: false,
	metaKey: false,
};
const GRAB_THE_CHILD = { x: 450, y: 290 };
const WEST_HANDLE = { x: 440, y: 300 };
const NEAR_THE_LEFT_EDGE = { x: 423, y: 300 };

describe("Escape during a resize drag", () => {
	it("takes the snap line away before the pointer lifts", () => {
		const { target } = nestedTarget(0);
		const behavior = behaviorFor("select");
		const camera = target.user.camera.get();
		tapAt(behavior, target, GRAB_THE_CHILD);
		const press = pointAt(camera, WEST_HANDLE);
		behavior.dragStart?.(target, press, press, NO_MODIFIERS);
		behavior.drag?.(target, pointAt(camera, NEAR_THE_LEFT_EDGE), NO_MODIFIERS);
		expect(target.user.snap.get()).not.toBeNull();

		handleStroke(target.doc, target.user, ESCAPE);

		expect(target.user.snap.get()).toBeNull();
	});
});
