import { describe, expect, it } from "vitest";
import { DesignDocument } from "../../document/document";
import type { LayerFields, LayerId } from "../../document/layer";
import { UserState } from "../state/userState";
import { NO_DRAWN } from "./drawn";
import { NO_MODIFIERS } from "./modifiers";
import { cancelMove } from "./moveDrag";
import type { PointerTarget } from "./tool";
import { behaviorFor } from "./toolBehavior";
import { SQUARE, dragOver, firstId, idAt, pointAt, rowOfThree } from "./toolFixtures";
import type { DragSpec } from "./toolFixtures";

const FRAME: LayerFields = {
	...SQUARE,
	clip: true,
	geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, frame: true },
	x: 300,
	y: 300,
	width: 300,
	height: 200,
};

interface PairScene {
	target: PointerTarget;
	one: LayerId;
	other: LayerId;
	frame: LayerId;
	setHits: (ids: readonly LayerId[]) => void;
}

function pairScene(inFrame: boolean): PairScene {
	const doc = DesignDocument.create();
	doc.deleteLayer(firstId(doc));
	const frame = doc.createLayer(FRAME);
	const parent = inFrame ? frame : null;
	const one = doc.createLayer({ ...SQUARE, x: 20, y: 20, width: 40, height: 40 }, parent);
	const other = doc.createLayer({ ...SQUARE, x: 150, y: 90, width: 40, height: 40 }, parent);
	doc.commit("scene");
	const user = new UserState();
	user.selection.set([one, other]);
	let hits: readonly LayerId[] = [];
	const target = { doc, user, layerIds: [one], layerIdsAt: () => hits, drawn: NO_DRAWN };
	return {
		target,
		one,
		other,
		frame,
		setHits: (ids) => {
			hits = ids;
		},
	};
}

function startDrag(scene: PairScene, spec: DragSpec, hits: readonly LayerId[]): void {
	const behavior = behaviorFor("select");
	const camera = scene.target.user.camera.get();
	const press = pointAt(camera, spec.press);
	behavior.dragStart?.(scene.target, press, press, NO_MODIFIERS);
	scene.setHits(hits);
	behavior.drag?.(scene.target, pointAt(camera, spec.release), NO_MODIFIERS);
}

function finishDrag(scene: PairScene, release: DragSpec["release"]): void {
	const point = pointAt(scene.target.user.camera.get(), release);
	behaviorFor("select").dragEnd?.(scene.target, point, NO_MODIFIERS);
}

describe("a move drag of more than one selected layer", () => {
	it("takes each layer out of the frame to the canvas and holds it on the screen", () => {
		const scene = pairScene(true);
		const spec = { press: { x: 330, y: 330 }, release: { x: 731, y: 633 } };

		startDrag(scene, spec, []);
		finishDrag(scene, spec.release);

		expect(scene.target.doc.layer(scene.one)).toMatchObject({ parent: null, x: 721, y: 623 });
		expect(scene.target.doc.layer(scene.other)).toMatchObject({ parent: null, x: 851, y: 693 });
	});

	it("puts each layer into the frame under the pointer", () => {
		const scene = pairScene(false);
		const spec = { press: { x: 30, y: 30 }, release: { x: 371, y: 433 } };

		startDrag(scene, spec, [scene.frame]);
		finishDrag(scene, spec.release);

		expect(scene.target.doc.layer(scene.one)).toMatchObject({ parent: scene.frame, x: 61, y: 123 });
		expect(scene.target.doc.layer(scene.other)).toMatchObject({
			parent: scene.frame,
			x: 191,
			y: 193,
		});
		expect(scene.target.doc.childIds(scene.frame)).toEqual([scene.one, scene.other]);
	});

	it("puts each layer back in its first parent and place on Escape", () => {
		const scene = pairScene(false);

		startDrag(scene, { press: { x: 30, y: 30 }, release: { x: 371, y: 383 } }, [scene.frame]);
		cancelMove(scene.target.doc, scene.target.user);

		expect(scene.target.doc.layer(scene.one)).toMatchObject({ parent: null, x: 20, y: 20 });
		expect(scene.target.doc.layer(scene.other)).toMatchObject({ parent: null, x: 150, y: 90 });
		expect(scene.target.doc.rootIds()).toEqual([scene.frame, scene.one, scene.other]);
		expect(scene.target.user.move.get()).toBeNull();
	});

	it("writes one undo step for the whole drag", () => {
		const scene = pairScene(true);

		dragOver(behaviorFor("select"), scene.target, {
			press: { x: 330, y: 330 },
			release: { x: 731, y: 633 },
		});
		scene.target.doc.undo();

		expect(scene.target.doc.layer(scene.one)).toMatchObject({ parent: scene.frame, x: 20, y: 20 });
		expect(scene.target.doc.layer(scene.other)).toMatchObject({
			parent: scene.frame,
			x: 150,
			y: 90,
		});
	});

	it("keeps the selection through the drag", () => {
		const scene = pairScene(false);

		dragOver(behaviorFor("select"), scene.target, {
			press: { x: 30, y: 30 },
			release: { x: 61, y: 47 },
		});

		expect(scene.target.user.selection.get()).toEqual([scene.one, scene.other]);
		expect(scene.target.doc.layer(scene.other)).toMatchObject({ x: 181, y: 107 });
	});

	it("leaves a selected child of a row in its slot while the pressed layer moves on the canvas", () => {
		const { target, ids } = rowOfThree();
		const loose = target.doc.createLayer({ ...SQUARE, x: 20, y: 20, width: 40, height: 40 });
		target.doc.commit("add a loose layer");
		target.user.selection.set([loose, idAt(ids, 1)]);

		dragOver(
			behaviorFor("select"),
			{ ...target, layerIds: [loose], layerIdsAt: () => [] },
			{
				press: { x: 30, y: 30 },
				release: { x: 71, y: 53 },
			},
		);

		expect(target.doc.layer(loose)).toMatchObject({ parent: null, x: 61, y: 43 });
		expect(target.doc.layer(idAt(ids, 1))).toMatchObject({ parent: firstId(target.doc), x: 90 });
	});

	it("moves the selected children of a row as one block to the order under the pointer", () => {
		const { target, ids } = rowOfThree();
		target.user.selection.set([idAt(ids, 0), idAt(ids, 1)]);

		dragOver(behaviorFor("select"), target, {
			press: { x: 450, y: 290 },
			release: { x: 625, y: 290 },
		});

		expect(target.doc.childIds(firstId(target.doc))).toEqual([ids[2], ids[0], ids[1]]);
	});
});
