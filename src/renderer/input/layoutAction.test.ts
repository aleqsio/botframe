import { describe, expect, it } from "vitest";
import { DesignDocument } from "../../document/document";
import { firstId } from "../../document/documentFixtures";
import type { Layer, LayerFields, LayerId } from "../../document/layer";
import { UserState } from "../state/userState";
import type { EditCommand } from "./command";
import { commandById, commandForStroke, runEditCommand } from "./editCommand";
import type { KeyStroke } from "./layerCommand";
import { LAYOUT_ACTIONS } from "./layoutAction";

const SQUARE: Omit<LayerFields, "x" | "y" | "width" | "height"> = {
	fill: "#d9d9d9",
	name: "",
	clip: false,
	geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, artboard: false },
};

const PLAIN = { shiftKey: false, altKey: false, ctrlKey: false, metaKey: false };

function stroke(key: string, held: Partial<KeyStroke> = {}): KeyStroke {
	return { key, ...PLAIN, ...held };
}

function actionOf(id: string): EditCommand {
	const command = commandById(id);
	if (command === null) {
		throw new Error(`no command with the id ${id}`);
	}
	return command;
}

interface Scene {
	doc: DesignDocument;
	user: UserState;
}

function scene(): Scene {
	const doc = DesignDocument.create();
	doc.deleteLayer(firstId(doc));
	doc.commit("clear");
	return { doc, user: new UserState() };
}

function place(
	{ doc, user }: Scene,
	boxes: readonly { x: number; y: number; width: number; height: number }[],
	parent: LayerId | null = null,
): readonly LayerId[] {
	const ids = boxes.map((box) => doc.createLayer({ ...SQUARE, ...box }, parent));
	doc.commit("place layers");
	user.selection.set(ids);
	return ids;
}

function layerOf(doc: DesignDocument, id: LayerId): Layer {
	const layer = doc.layer(id);
	if (layer === null) {
		throw new Error("the document lost the layer");
	}
	return layer;
}

function boxOf(doc: DesignDocument, id: LayerId): { x: number; y: number } {
	const { x, y } = layerOf(doc, id);
	return { x, y };
}

function only(ids: readonly LayerId[]): LayerId {
	const [id] = ids;
	if (id === undefined) {
		throw new Error("the scene placed no layer");
	}
	return id;
}

function run(held: Scene, id: string): void {
	runEditCommand(actionOf(id), held.doc, held.user);
}

describe("the layout action table", () => {
	it("gives each action a label, an icon and a unique id", () => {
		const ids = LAYOUT_ACTIONS.map((action) => action.id);

		expect(new Set(ids).size).toBe(ids.length);
		for (const action of LAYOUT_ACTIONS) {
			expect(action.label.length).toBeGreaterThan(0);
			expect(action.icon.length).toBeGreaterThan(0);
		}
	});

	it("answers the panel from the layers and the menu from the selection in the same way", () => {
		const held = scene();
		const frame = only(place(held, [{ x: 0, y: 0, width: 200, height: 200 }]));
		const child = only(place(held, [{ x: 50, y: 60, width: 20, height: 20 }], frame));
		const layers = [layerOf(held.doc, child)];

		for (const action of LAYOUT_ACTIONS) {
			expect([action.id, action.ready(held.doc, layers)]).toEqual([
				action.id,
				action.enabled(held.doc, held.user),
			]);
		}
		const ready = LAYOUT_ACTIONS.filter((action) => action.ready(held.doc, layers));
		expect(ready.map((action) => action.id)).toContain("alignLeft");
	});

	it("reads align left from Cmd+Shift+Left and rotate from Cmd+]", () => {
		expect(commandForStroke(stroke("ArrowLeft", { metaKey: true, shiftKey: true }))?.id).toBe(
			"alignLeft",
		);
		expect(commandForStroke(stroke("]", { ctrlKey: true }))?.id).toBe("turnRight");
		expect(commandForStroke(stroke("}", { ctrlKey: true, shiftKey: true }))?.id).toBe("turnLeft");
	});
});

describe("align", () => {
	it("aligns one layer to the box of its parent", () => {
		const held = scene();
		const frame = only(place(held, [{ x: 0, y: 0, width: 200, height: 200 }]));
		const child = only(place(held, [{ x: 50, y: 60, width: 20, height: 20 }], frame));

		run(held, "alignLeft");

		expect(boxOf(held.doc, child)).toEqual({ x: 0, y: 60 });
	});

	it("aligns three layers to the left edge of the selection", () => {
		const held = scene();
		const ids = place(held, [
			{ x: 10, y: 0, width: 20, height: 20 },
			{ x: 100, y: 40, width: 20, height: 20 },
			{ x: 200, y: 80, width: 20, height: 20 },
		]);

		run(held, "alignLeft");

		expect(ids.map((id) => boxOf(held.doc, id).x)).toEqual([10, 10, 10]);
	});

	it("aligns the bottom edges to the selection", () => {
		const held = scene();
		const ids = place(held, [
			{ x: 0, y: 0, width: 20, height: 20 },
			{ x: 50, y: 60, width: 20, height: 40 },
		]);

		run(held, "alignBottom");

		expect(ids.map((id) => boxOf(held.doc, id).y)).toEqual([80, 60]);
	});

	it("is one step in the undo history", () => {
		const held = scene();
		const ids = place(held, [
			{ x: 10, y: 0, width: 20, height: 20 },
			{ x: 100, y: 40, width: 20, height: 20 },
			{ x: 200, y: 80, width: 20, height: 20 },
		]);

		run(held, "alignLeft");
		held.doc.undo();

		expect(ids.map((id) => boxOf(held.doc, id).x)).toEqual([10, 100, 200]);
	});

	it("is off under a parent that lays out its children", () => {
		const held = scene();
		const frame = only(place(held, [{ x: 0, y: 0, width: 200, height: 200 }]));
		place(held, [{ x: 50, y: 60, width: 20, height: 20 }], frame);
		const command = actionOf("alignLeft");

		expect(command.enabled(held.doc, held.user)).toBe(true);

		held.doc.update(frame, { layout: { display: "row" } });
		held.doc.commit("set display");

		expect(command.enabled(held.doc, held.user)).toBe(false);
	});

	it("is off for a layer at the root that has no peer", () => {
		const held = scene();
		place(held, [{ x: 10, y: 10, width: 20, height: 20 }]);

		expect(actionOf("alignLeft").enabled(held.doc, held.user)).toBe(false);
	});
});

describe("center", () => {
	it("puts the layer in the middle of its parent on the two axes", () => {
		const held = scene();
		const frame = only(place(held, [{ x: 0, y: 0, width: 200, height: 100 }]));
		const child = only(place(held, [{ x: 0, y: 0, width: 20, height: 10 }], frame));

		run(held, "centerBoth");

		expect(boxOf(held.doc, child)).toEqual({ x: 90, y: 45 });
	});
});

describe("distribute", () => {
	it("makes the horizontal gaps equal between three layers", () => {
		const held = scene();
		const ids = place(held, [
			{ x: 0, y: 0, width: 10, height: 10 },
			{ x: 20, y: 0, width: 10, height: 10 },
			{ x: 100, y: 0, width: 10, height: 10 },
		]);

		run(held, "spreadX");

		expect(ids.map((id) => boxOf(held.doc, id).x)).toEqual([0, 50, 100]);
	});

	it("keeps the order when the leftmost layer is also the widest", () => {
		const held = scene();
		const ids = place(held, [
			{ x: 0, y: 0, width: 300, height: 10 },
			{ x: 10, y: 0, width: 10, height: 10 },
			{ x: 20, y: 0, width: 10, height: 10 },
		]);

		run(held, "spreadX");

		expect(ids.map((id) => boxOf(held.doc, id).x)).toEqual([0, 290, 290]);
	});

	it("is off with fewer than three layers", () => {
		const held = scene();
		place(held, [
			{ x: 0, y: 0, width: 10, height: 10 },
			{ x: 100, y: 0, width: 10, height: 10 },
		]);

		expect(actionOf("spreadX").enabled(held.doc, held.user)).toBe(false);
	});
});

describe("size to fit", () => {
	it("holds the children of the frame and keeps them where they were", () => {
		const held = scene();
		const frame = only(place(held, [{ x: 0, y: 0, width: 200, height: 200 }]));
		const children = place(
			held,
			[
				{ x: 20, y: 30, width: 40, height: 50 },
				{ x: 100, y: 10, width: 20, height: 20 },
			],
			frame,
		);
		held.user.selection.set([frame]);

		run(held, "sizeToFit");

		expect(layerOf(held.doc, frame)).toMatchObject({
			x: 20,
			y: 10,
			width: 100,
			height: 70,
		});
		expect(children.map((id) => boxOf(held.doc, id))).toEqual([
			{ x: 0, y: 20 },
			{ x: 80, y: 0 },
		]);
	});

	it("is off for a layer that has no child", () => {
		const held = scene();
		place(held, [{ x: 0, y: 0, width: 200, height: 200 }]);

		expect(actionOf("sizeToFit").enabled(held.doc, held.user)).toBe(false);
	});
});

describe("flip", () => {
	it("exchanges the layers across the middle of the selection", () => {
		const held = scene();
		const ids = place(held, [
			{ x: 0, y: 0, width: 20, height: 10 },
			{ x: 80, y: 0, width: 20, height: 10 },
		]);

		run(held, "flipX");

		expect(ids.map((id) => boxOf(held.doc, id).x)).toEqual([80, 0]);
	});

	it("holds one layer in its place and turns its rotation the other way", () => {
		const held = scene();
		const frame = only(place(held, [{ x: 0, y: 0, width: 200, height: 200 }]));
		const child = only(place(held, [{ x: 20, y: 30, width: 40, height: 20 }], frame));

		run(held, "flipX");

		expect(boxOf(held.doc, child)).toEqual({ x: 20, y: 30 });
	});

	it("turns the rotation of the layer the other way", () => {
		const held = scene();
		const frame = only(place(held, [{ x: 0, y: 0, width: 200, height: 200 }]));
		const child = only(place(held, [{ x: 20, y: 20, width: 40, height: 20 }], frame));
		held.doc.update(child, { rotation: 30 });
		held.doc.commit("turn");

		run(held, "flipX");

		expect(layerOf(held.doc, child).rotation).toBe(330);
	});
});

describe("rotate and swap", () => {
	it("turns the layer a quarter turn each way", () => {
		const held = scene();
		const id = only(place(held, [{ x: 0, y: 0, width: 40, height: 20 }]));

		run(held, "turnRight");
		expect(layerOf(held.doc, id).rotation).toBe(90);

		run(held, "turnLeft");
		expect(layerOf(held.doc, id).rotation).toBe(0);

		run(held, "turnLeft");
		expect(layerOf(held.doc, id).rotation).toBe(270);
	});

	it("exchanges the width and the height about the middle of the layer", () => {
		const held = scene();
		const id = only(place(held, [{ x: 0, y: 0, width: 40, height: 20 }]));

		run(held, "swapSize");

		expect(layerOf(held.doc, id)).toMatchObject({ x: 10, y: -10, width: 20, height: 40 });
	});

	it("gives the layer a fixed size, so that the swap shows on the screen", () => {
		const held = scene();
		const id = only(place(held, [{ x: 0, y: 0, width: 40, height: 20 }]));
		held.doc.update(id, { layout: { width: "hug", height: "hug" } });
		held.doc.commit("hug");

		run(held, "swapSize");

		expect(layerOf(held.doc, id).layout).toMatchObject({ width: "fixed", height: "fixed" });
	});

	it("is off with nothing selected", () => {
		const held = scene();

		expect(actionOf("swapSize").enabled(held.doc, held.user)).toBe(false);
	});

	it("refuses an action that the selection disables", () => {
		const held = scene();
		place(held, [{ x: 0, y: 0, width: 200, height: 200 }]);

		expect(runEditCommand(actionOf("sizeToFit"), held.doc, held.user)).toBe(false);
		expect(layerOf(held.doc, only(held.user.selection.get()))).toMatchObject({
			width: 200,
			height: 200,
		});
	});
});
