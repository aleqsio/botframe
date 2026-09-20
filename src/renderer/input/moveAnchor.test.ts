import { describe, expect, it } from "vitest";
import { DesignDocument } from "../../document/document";
import type { LayerFields, LayerId } from "../../document/layer";
import type { Point } from "../state/camera";
import { UserState } from "../state/userState";
import type { Modifiers } from "./modifiers";
import type { PointerTarget } from "./tool";
import { behaviorFor } from "./toolBehavior";
import { NO_DRAWN } from "./drawn";
import { anchorOnScreen, pointAt, turnOnScreen } from "./toolFixtures";

const ARTBOARD: LayerFields = {
	x: 0,
	y: 0,
	width: 400,
	height: 300,
	fill: "#ffffff",
	name: "",
	clip: false,
	geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, artboard: true },
};

const SHAPE: LayerFields = {
	...ARTBOARD,
	width: 60,
	height: 40,
	fill: "#d9d9d9",
	geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, artboard: false },
};

const NO_SNAP: Modifiers = { shift: false, alt: false, control: true };
const RUNS = 40;
const STEPS = 4;
const FULL_TURN = 360;
const SEED = 0x9e37_79b9;
const WRITTEN_DIGITS = 1;

function randomOf(seed: number): () => number {
	let state = seed;
	return () => {
		state = (state + 0x6d2b_79f5) >>> 0;
		let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
		mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
		return ((mixed ^ (mixed >>> 14)) >>> 0) / 0x1_0000_0000;
	};
}

function between(random: () => number, low: number, high: number): number {
	return low + (high - low) * random();
}

interface Scene {
	target: PointerTarget;
	shape: LayerId;
	boards: readonly LayerId[];
	random: () => number;
}

function turnedBoard(doc: DesignDocument, random: () => number, at: Point): LayerId {
	const board = doc.createLayer({ ...ARTBOARD, ...at });
	doc.update(board, {
		rotation: between(random, 0, FULL_TURN),
		origin: { x: between(random, -0.5, 1.5), y: between(random, -0.5, 1.5) },
	});
	return board;
}

function sceneOf(random: () => number): Scene {
	const doc = DesignDocument.create();
	const boards = [
		turnedBoard(doc, random, { x: 100, y: 100 }),
		turnedBoard(doc, random, { x: 900, y: 500 }),
	];
	const shape = doc.createLayer({ ...SHAPE, x: 80, y: 60 }, boards[0] ?? null);
	doc.update(shape, {
		rotation: between(random, 0, FULL_TURN),
		origin: { x: between(random, 0, 1), y: between(random, 0, 1) },
	});
	doc.commit("scene");
	const user = new UserState();
	user.camera.set({
		x: between(random, -300, 300),
		y: between(random, -300, 300),
		zoom: between(random, 0.25, 4),
	});
	const target = { doc, user, layerIds: [shape], layerIdsAt: () => [shape], drawn: NO_DRAWN };
	return { target, shape, boards, random };
}

function stagePointOf(scene: Scene, canvas: Point): Point {
	const camera = scene.target.user.camera.get();
	return { x: canvas.x * camera.zoom + camera.x, y: canvas.y * camera.zoom + camera.y };
}

function expectClose(actual: Point, wanted: Point): void {
	expect(actual.x).toBeCloseTo(wanted.x, WRITTEN_DIGITS);
	expect(actual.y).toBeCloseTo(wanted.y, WRITTEN_DIGITS);
}

interface Held {
	anchor: Point;
	at: Point;
}

function dragThrough(scene: Scene, hits: readonly (readonly LayerId[])[]): Held {
	const { target, random } = scene;
	const behavior = behaviorFor("select");
	const camera = target.user.camera.get();
	const anchor = { x: random(), y: random() };
	const grab = anchorOnScreen(scene.target, scene.shape, anchor);
	const turn = turnOnScreen(scene.target, scene.shape);
	const press = pointAt(camera, stagePointOf(scene, grab));
	let scene2 = { ...target, layerIdsAt: (): readonly LayerId[] => hits[0] ?? [] };
	behavior.dragStart?.(scene2, press, press, NO_SNAP);
	let at = grab;
	for (const [index, under] of hits.entries()) {
		at = { x: at.x + between(random, -400, 400), y: at.y + between(random, -400, 400) };
		scene2 = { ...target, layerIdsAt: () => under };
		behavior.drag?.(scene2, pointAt(camera, stagePointOf(scene, at)), NO_SNAP);
		expectClose(anchorOnScreen(scene.target, scene.shape, anchor), at);
		expect(turnOnScreen(scene.target, scene.shape)).toBeCloseTo(turn, WRITTEN_DIGITS);
		if (index === hits.length - 1) {
			behavior.dragEnd?.(scene2, pointAt(camera, stagePointOf(scene, at)), NO_SNAP);
		}
	}
	return { anchor, at };
}

describe("the grabbed point of a layer stays under the pointer", () => {
	it("through any camera, any turned parent, and any origin, without a change of parent", () => {
		const random = randomOf(SEED);
		for (let run = 0; run < RUNS; run += 1) {
			const scene = sceneOf(random);
			const inside = [scene.shape, ...scene.boards.slice(0, 1)];
			const held = dragThrough(
				scene,
				Array.from({ length: STEPS }, () => inside),
			);
			expect(anchorOnScreen(scene.target, scene.shape, held.anchor).x).toBeCloseTo(
				held.at.x,
				WRITTEN_DIGITS,
			);
			expect(anchorOnScreen(scene.target, scene.shape, held.anchor).y).toBeCloseTo(
				held.at.y,
				WRITTEN_DIGITS,
			);
		}
	});

	it("when the layer leaves its parent, lands in a turned artboard, and comes back", () => {
		const random = randomOf(SEED + 1);
		for (let run = 0; run < RUNS; run += 1) {
			const scene = sceneOf(random);
			const [first = [], second = []] = scene.boards.map((board) => [scene.shape, board]);
			const held = dragThrough(scene, [first, [], second, [], first]);
			expect(scene.target.doc.layer(scene.shape)?.parent).toBe(scene.boards[0]);
			expect(anchorOnScreen(scene.target, scene.shape, held.anchor).x).toBeCloseTo(
				held.at.x,
				WRITTEN_DIGITS,
			);
			expect(anchorOnScreen(scene.target, scene.shape, held.anchor).y).toBeCloseTo(
				held.at.y,
				WRITTEN_DIGITS,
			);
		}
	});
});
