import { describe, expect, it } from "vitest";
import type { LayerId } from "../../document/layer";
import { IDENTITY_CAMERA } from "../state/camera";
import { composeBehaviors } from "./composeBehaviors";
import { NO_MODIFIERS } from "./modifiers";
import type { PointerTarget, ToolBehavior } from "./tool";
import { pointAt, targetOf } from "./toolFixtures";

const PRESS = { x: 10, y: 20 };
const RELEASE = { x: 30, y: 40 };
const SE_ZONE = { mode: "resize", handle: "se" };
const LAYER = "7@7" as LayerId;

function recorder(name: string, claims: boolean, log: string[]): ToolBehavior {
	return {
		hover() {
			log.push(`${name}.hover`);
			return claims ? { mode: "resize", handle: "se" } : null;
		},
		highlight() {
			log.push(`${name}.highlight`);
			return claims ? LAYER : null;
		},
		tap() {
			log.push(`${name}.tap`);
			return claims;
		},
		dragStart() {
			log.push(`${name}.dragStart`);
			return claims;
		},
		drag() {
			log.push(`${name}.drag`);
			return false;
		},
		dragEnd() {
			log.push(`${name}.dragEnd`);
		},
		context() {
			log.push(`${name}.context`);
			return claims;
		},
	};
}

function dragThrough(behavior: ToolBehavior, target: PointerTarget): boolean {
	const press = pointAt(IDENTITY_CAMERA, PRESS);
	const release = pointAt(IDENTITY_CAMERA, RELEASE);
	const claimed = behavior.dragStart?.(target, press, press, NO_MODIFIERS) ?? false;
	behavior.drag?.(target, release, NO_MODIFIERS);
	behavior.dragEnd?.(target, release, NO_MODIFIERS);
	return claimed;
}

describe("composeBehaviors", () => {
	it("gives the gesture to the first behavior that claims the press", () => {
		const log: string[] = [];
		const behavior = composeBehaviors([
			recorder("first", true, log),
			recorder("second", true, log),
		]);

		expect(dragThrough(behavior, targetOf(false))).toBe(true);
		expect(log).toEqual(["first.dragStart", "first.drag", "first.dragEnd"]);
	});

	it("walks past a behavior that declines the press", () => {
		const log: string[] = [];
		const behavior = composeBehaviors([
			recorder("first", false, log),
			recorder("second", true, log),
		]);

		expect(dragThrough(behavior, targetOf(false))).toBe(true);
		expect(log).toEqual(["first.dragStart", "second.dragStart", "second.drag", "second.dragEnd"]);
	});

	it("claims nothing when every behavior declines the press", () => {
		const log: string[] = [];
		const behavior = composeBehaviors([
			recorder("first", false, log),
			recorder("second", false, log),
		]);

		expect(dragThrough(behavior, targetOf(false))).toBe(false);
		expect(log).toEqual(["first.dragStart", "second.dragStart"]);
	});

	it("forgets the claim at the end of the gesture", () => {
		const log: string[] = [];
		const target = targetOf(false);
		const behavior = composeBehaviors([recorder("first", true, log)]);
		dragThrough(behavior, target);
		log.length = 0;

		behavior.drag?.(target, pointAt(IDENTITY_CAMERA, RELEASE), NO_MODIFIERS);
		behavior.dragEnd?.(target, pointAt(IDENTITY_CAMERA, RELEASE), NO_MODIFIERS);

		expect(log).toEqual([]);
	});

	it("answers the hover with the first zone and stops there", () => {
		const log: string[] = [];
		const behavior = composeBehaviors([
			recorder("first", false, log),
			recorder("second", true, log),
			recorder("third", true, log),
		]);

		expect(behavior.hover?.(targetOf(false), pointAt(IDENTITY_CAMERA, PRESS))).toEqual(SE_ZONE);
		expect(log).toEqual(["first.hover", "second.hover"]);
	});

	it("gives the hover no zone when no behavior answers", () => {
		const log: string[] = [];
		const behavior = composeBehaviors([recorder("first", false, log)]);

		expect(behavior.hover?.(targetOf(false), pointAt(IDENTITY_CAMERA, PRESS))).toBeNull();
	});

	it("answers the highlight with the first layer and stops there", () => {
		const log: string[] = [];
		const behavior = composeBehaviors([
			recorder("first", false, log),
			recorder("second", true, log),
			recorder("third", true, log),
		]);

		expect(behavior.highlight?.(targetOf(false), pointAt(IDENTITY_CAMERA, PRESS))).toBe(LAYER);
		expect(log).toEqual(["first.highlight", "second.highlight"]);
	});

	it("gives the hover no layer when no behavior answers", () => {
		const log: string[] = [];
		const behavior = composeBehaviors([recorder("first", false, log)]);

		expect(behavior.highlight?.(targetOf(false), pointAt(IDENTITY_CAMERA, PRESS))).toBeNull();
	});

	it("stops the tap and the secondary press at the first claim", () => {
		const log: string[] = [];
		const behavior = composeBehaviors([
			recorder("first", false, log),
			recorder("second", true, log),
			recorder("third", true, log),
		]);

		expect(behavior.tap?.(targetOf(false), pointAt(IDENTITY_CAMERA, PRESS), NO_MODIFIERS)).toBe(
			true,
		);
		expect(behavior.context?.(targetOf(false), PRESS)).toBe(true);
		expect(log).toEqual(["first.tap", "second.tap", "first.context", "second.context"]);
	});

	it("claims no tap and no secondary press when every behavior declines", () => {
		const log: string[] = [];
		const behavior = composeBehaviors([recorder("first", false, log)]);

		expect(behavior.tap?.(targetOf(false), pointAt(IDENTITY_CAMERA, PRESS), NO_MODIFIERS)).toBe(
			false,
		);
		expect(behavior.context?.(targetOf(false), PRESS)).toBe(false);
	});
});
