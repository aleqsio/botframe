import { describe, expect, it } from "vitest";
import { disconnect, makeComponent, makeFrame } from "./componentActions";
import { DesignDocument } from "./document";
import { DRAWN } from "./documentFixtures";
import { applyInstanceChanges, resetInstance, setInstanceSync } from "./instanceActions";
import type { LayerFields, LayerId } from "./layer";
import type { Variable } from "./variable";

const CHILD: LayerFields = {
	x: 4,
	y: 5,
	width: 10,
	height: 10,
	fill: "#111111",
	name: "Dot",
	clip: false,
	geometry: { kind: "ellipse" },
};

interface Scene {
	doc: DesignDocument;
	one: LayerId;
	two: LayerId;
	component: string;
}

function scene(): Scene {
	const doc = DesignDocument.create();
	const one = doc.createLayer(DRAWN, null);
	doc.createLayer(CHILD, one);
	doc.commit("draw");
	const component = makeComponent(doc, one) ?? "";
	doc.commit("make component");
	const two = duplicate(doc, one);
	doc.update(two, { x: 400 });
	doc.commit("duplicate");
	return { doc, one, two, component };
}

function duplicate(doc: DesignDocument, id: LayerId): LayerId {
	const source = doc.readSubtree(id);
	if (source === null) {
		throw new Error("the instance is missing");
	}
	return doc.createSubtree(source, null);
}

function childOf(doc: DesignDocument, instance: LayerId): LayerId {
	const [child] = doc.childIds(instance);
	if (child === undefined) {
		throw new Error("the instance has no child");
	}
	return child;
}

describe("sync modes", () => {
	it("keeps the geometry on the instance and sends the style to each instance", () => {
		const { doc, one, two } = scene();
		setInstanceSync(doc, one, "style");
		doc.update(one, { width: 190, fill: "#ff0000" });
		doc.commit("edit");

		expect(doc.layer(one)).toMatchObject({ width: 190, fill: "#ff0000", changed: ["width"] });
		expect(doc.layer(two)).toMatchObject({ width: DRAWN.width, fill: "#ff0000", changed: [] });
	});

	it("keeps each edit inside the instance when it does not sync", () => {
		const { doc, one, two } = scene();
		setInstanceSync(doc, one, "none");
		doc.update(childOf(doc, one), { fill: "#00ff00", x: 8 });
		doc.commit("edit");

		expect(doc.layer(childOf(doc, one))).toMatchObject({ fill: "#00ff00", x: 8 });
		expect(doc.layer(childOf(doc, one))?.changed).toEqual(["fill", "x"]);
		expect(doc.layer(childOf(doc, two))).toMatchObject({ fill: CHILD.fill, x: CHILD.x });
	});

	it("shows an edit in all instances when a later edit syncs a key that the instance kept", () => {
		const { doc, one, two } = scene();
		setInstanceSync(doc, one, "none");
		doc.update(one, { width: 190 });
		doc.commit("keep");
		setInstanceSync(doc, one, "all");
		doc.update(one, { width: DRAWN.width });
		doc.commit("sync");

		expect(doc.layer(one)).toMatchObject({ width: DRAWN.width, changed: [] });
		expect(doc.layer(two)?.width).toBe(DRAWN.width);
	});

	it("unbinds a field only in the instance that does not sync", () => {
		const { component, doc, one, two } = scene();
		const tone: Variable = {
			id: "tone",
			name: "tone",
			type: "color",
			initial: "#0000ff",
			options: [],
		};
		doc.components.scope(component).put(tone);
		doc.update(childOf(doc, one), { bindings: { fill: { var: "tone" } } });
		doc.commit("bind");
		setInstanceSync(doc, one, "none");
		doc.update(childOf(doc, one), { fill: "#00ff00" });
		doc.commit("edit");

		expect(doc.layer(childOf(doc, one))?.fill).toBe("#00ff00");
		expect(doc.layer(childOf(doc, two))?.fill).toBe("#0000ff");
	});
});

describe("apply and reset", () => {
	it("applies only the geometry of an instance to each instance", () => {
		const { doc, one, two } = scene();
		setInstanceSync(doc, one, "none");
		doc.update(one, { width: 190, skewX: 6, fill: "#ff0000" });
		doc.commit("edit");
		applyInstanceChanges(doc, one, "geometry");

		expect(doc.layer(two)).toMatchObject({ width: 190, skewX: 6, fill: DRAWN.fill });
		expect(doc.layer(one)).toMatchObject({ width: 190, fill: "#ff0000", changed: ["fill"] });
	});

	it("gives the instance the values of the component again on reset", () => {
		const { doc, one } = scene();
		setInstanceSync(doc, one, "none");
		doc.update(childOf(doc, one), { fill: "#00ff00" });
		doc.commit("edit");
		resetInstance(doc, one);

		expect(doc.layer(childOf(doc, one))).toMatchObject({ fill: CHILD.fill, changed: [] });
	});

	it("gives a duplicate the same kept values and sync mode", () => {
		const { doc, one } = scene();
		setInstanceSync(doc, one, "none");
		doc.update(one, { width: 190 });
		doc.update(childOf(doc, one), { fill: "#00ff00" });
		doc.commit("edit");
		const copy = duplicate(doc, one);
		doc.commit("duplicate");

		expect(copy).not.toBe(one);
		expect(doc.layer(copy)?.width).toBe(190);
		expect(doc.layer(childOf(doc, copy))?.fill).toBe("#00ff00");
		expect(doc.layer(copy)?.content).toMatchObject({ instance: { sync: "none" } });
	});
});

describe("disconnect and make frame", () => {
	it("gives a disconnected instance a component with its kept values", () => {
		const { doc, one, two } = scene();
		setInstanceSync(doc, one, "none");
		doc.update(one, { width: 190 });
		doc.update(childOf(doc, one), { fill: "#00ff00" });
		doc.commit("edit");
		disconnect(doc, one);
		doc.commit("disconnect");

		expect(doc.layer(one)).toMatchObject({ width: 190, changed: [] });
		expect(doc.layer(one)?.content).toMatchObject({ instance: { sync: "none", overrides: {} } });
		expect(doc.layer(childOf(doc, one))?.fill).toBe("#00ff00");
		expect(doc.layer(childOf(doc, two))?.fill).toBe(CHILD.fill);
	});

	it("keeps the size and the transform of an instance that becomes a frame", () => {
		const { doc, one } = scene();
		doc.update(one, { width: 190, rotation: 30, skewX: 6 });
		doc.commit("transform");
		makeFrame(doc, one);
		doc.commit("make frame");

		expect(doc.layer(one)).toMatchObject({
			width: 190,
			rotation: 30,
			skewX: 6,
			content: { kind: "none" },
		});
	});
});
