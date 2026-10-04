import { describe, expect, it } from "vitest";
import type { LayerId } from "../../document/layer";
import { cursorAxisOf, cursorKeyOf, skewCursorKeyOf } from "./cursor";
import type { CursorKey } from "./cursor";
import { HANDLE_AXIS } from "./handles";
import type { Handle } from "./handles";
import { NO_POSE } from "../../document/linear";
import type { PointerTarget } from "./tool";
import { behaviorFor } from "./toolBehavior";
import { anchorOnScreen, firstId, nestedTarget, pointAt } from "./toolFixtures";

const MIRRORED = { ...NO_POSE, rotation: 0, mirrored: true };
const QUARTER_TURN = { ...NO_POSE, rotation: 90, mirrored: false };

describe("cursorAxisOf", () => {
	it("keeps the local axis of a layer with no pose", () => {
		expect(cursorAxisOf("nw", NO_POSE)).toBe("nwse");
		expect(cursorAxisOf("ne", NO_POSE)).toBe("nesw");
		expect(cursorAxisOf("n", NO_POSE)).toBe("ns");
		expect(cursorAxisOf("e", NO_POSE)).toBe("ew");
	});

	it("gives the other diagonal for a corner of a mirrored layer", () => {
		expect(cursorAxisOf("nw", MIRRORED)).toBe("nesw");
		expect(cursorAxisOf("ne", MIRRORED)).toBe("nwse");
	});

	it("gives the other axis for an edge of a layer turned 90 degrees", () => {
		expect(cursorAxisOf("n", QUARTER_TURN)).toBe("ew");
		expect(cursorAxisOf("e", QUARTER_TURN)).toBe("ns");
	});

	it("rounds a turn to the nearest axis", () => {
		expect(cursorAxisOf("e", { ...NO_POSE, rotation: 30, mirrored: false })).toBe("nwse");
		expect(cursorAxisOf("e", { ...NO_POSE, rotation: 20, mirrored: false })).toBe("ew");
		expect(cursorAxisOf("n", { ...NO_POSE, rotation: -30, mirrored: false })).toBe("nwse");
	});
});

describe("cursorKeyOf", () => {
	it("names the screen axis of the whole chain for a resize, and one key for a turn", () => {
		expect(cursorKeyOf({ mode: "resize", handle: "n" }, [MIRRORED, QUARTER_TURN])).toBe(
			"resize-ew",
		);
		expect(cursorKeyOf({ mode: "rotate", handle: "se" }, [QUARTER_TURN])).toBe("rotate");
	});
});

describe("skewCursorKeyOf", () => {
	it("names the screen axis along the edge of the skew bar", () => {
		expect(skewCursorKeyOf({ mode: "skew", handle: "n" }, [])).toBe("resize-ew");
		expect(skewCursorKeyOf({ mode: "skew", handle: "w" }, [])).toBe("resize-ns");
		expect(skewCursorKeyOf({ mode: "skew", handle: "s" }, [QUARTER_TURN])).toBe("resize-ns");
	});
});

function hoverOn(target: PointerTarget, child: LayerId, handle: Handle): CursorKey | null {
	target.user.selection.set([child]);
	const axis = HANDLE_AXIS[handle];
	const canvas = anchorOnScreen(target, child, { x: (axis.x + 1) / 2, y: (axis.y + 1) / 2 });
	return behaviorFor("select").hover?.(target, pointAt(target.user.camera.get(), canvas)) ?? null;
}

describe("the hover of a handle inside a posed frame", () => {
	it("gives the screen axis for a child of a frame turned 90 degrees", () => {
		const { target, child } = nestedTarget(90);

		expect(hoverOn(target, child, "n")).toBe("resize-ew");
		expect(hoverOn(target, child, "nw")).toBe("resize-nesw");
	});

	it("gives the other diagonal for a child of a mirrored frame", () => {
		const { target, child } = nestedTarget(0);
		target.doc.update(firstId(target.doc), { mirrored: true });

		expect(hoverOn(target, child, "nw")).toBe("resize-nesw");
		expect(hoverOn(target, child, "e")).toBe("resize-ew");
	});
});
