import { describe, expect, it } from "vitest";
import { adoptComponents, disconnect, makeComponent, makeFrame } from "./componentActions";
import { packComponents } from "./componentPack";
import { DesignDocument } from "./document";
import { DRAWN } from "./documentFixtures";
import type { LayerFields, LayerId } from "./layer";
import { nodeOf } from "./path";
import { DOCUMENT_SCOPE } from "./variable";
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
	frame: LayerId;
	component: string;
}

function scene(): Scene {
	const doc = DesignDocument.create();
	const frame = doc.createLayer(DRAWN, null);
	doc.createLayer(CHILD, frame);
	doc.commit("draw");
	const component = makeComponent(doc, frame) ?? "";
	doc.commit("make component");
	return { doc, frame, component };
}

function childOf(doc: DesignDocument, copy: LayerId): LayerId {
	const [child] = doc.childIds(copy);
	if (child === undefined) {
		throw new Error("the copy has no child");
	}
	return child;
}

function present<T>(held: T | null): T {
	if (held === null) {
		throw new Error("the value is missing");
	}
	return held;
}

function secondCopy({ doc, frame }: Scene): LayerId {
	const copy = doc.createSubtree(present(doc.readSubtree(frame)), null);
	doc.update(copy, { x: 400 });
	doc.commit("duplicate");
	return copy;
}

function variable(held: Omit<Variable, "options" | "prop"> & Partial<Variable>): Variable {
	return { options: [], prop: true, ...held };
}

describe("make component", () => {
	it("turns a frame into the first copy and hides its definition from the canvas", () => {
		const { doc, frame } = scene();

		expect(doc.layer(frame)?.content).toMatchObject({ kind: "component" });
		expect(doc.rootIds()).toEqual([doc.rootIds()[0], frame]);
		expect(childOf(doc, frame)).toMatch(new RegExp(`^${frame}~`, "u"));
		expect(doc.layer(childOf(doc, frame))).toMatchObject({ name: "Dot", parent: frame });
	});

	it("gives the frame its children back on undo", () => {
		const { doc, frame } = scene();

		expect(doc.undo()).toBe(true);
		expect(doc.layer(frame)?.content.kind).toBe("none");
		expect(doc.layer(childOf(doc, frame))).toMatchObject({ name: "Dot", parent: frame });
	});
});

describe("synced copies", () => {
	it("shows an edit inside one copy in each copy, and keeps the place of each copy", () => {
		const held = scene();
		const { doc, frame } = held;
		const other = secondCopy(held);
		doc.update(childOf(doc, frame), { fill: "#ff0000" });
		doc.update(frame, { fill: "#00ff00" });
		doc.commit("edit");

		expect(doc.layer(childOf(doc, other))?.fill).toBe("#ff0000");
		expect(doc.layer(other)?.fill).toBe("#00ff00");
		expect(doc.layer(other)?.x).toBe(400);
		expect(doc.layer(frame)?.x).toBe(DRAWN.x);
		expect(doc.tree.copyCount(held.component)).toBe(2);
	});

	it("refuses to move a layer into or out of a copy, and moves it inside a copy with the same id", () => {
		const held = scene();
		const { doc, frame } = held;
		const loose = doc.createLayer(CHILD, null);
		const inner = childOf(doc, frame);

		expect(doc.move(loose, frame)).toBe(false);
		expect(doc.move(inner, null)).toBe(false);
		expect(doc.move(inner, frame, 0)).toBe(true);
		expect(doc.layer(inner)?.parent).toBe(frame);
	});

	it("refuses a copy of a component inside the definition of that component", () => {
		const held = scene();
		const { component, doc, frame } = held;
		const inner = childOf(doc, frame);
		doc.update(inner, { content: { kind: "component", component, props: {} } });

		expect(doc.layer(inner)?.content.kind).toBe("none");
	});

	it("merges a peer that sets a prop with a peer that edits inside the component", () => {
		const held = scene();
		const { component, doc, frame } = held;
		doc.components
			.scope(component)
			.put(variable({ id: "size", name: "size", type: "number", initial: 1 }));
		doc.commit("add variable");
		const peer = DesignDocument.open(doc.snapshot());
		doc.update(frame, { props: { size: 7 } });
		doc.commit("set prop");
		peer.update(childOf(peer, frame), { fill: "#0000ff" });
		peer.commit("edit");

		doc.merge(peer.snapshot());

		expect(doc.layer(frame)?.content).toMatchObject({ props: { size: 7 }, values: { size: 7 } });
		expect(doc.layer(childOf(doc, frame))?.fill).toBe("#0000ff");
	});
});

describe("variables in copies", () => {
	it("resolves a bound field from the prop of each copy and from the table of a choice", () => {
		const held = scene();
		const { component, doc, frame } = held;
		const other = secondCopy(held);
		const scope = doc.components.scope(component);
		scope.put(
			variable({
				id: "tone",
				name: "tone",
				type: "choice",
				initial: "calm",
				options: ["calm", "alarm"],
			}),
		);
		scope.put(variable({ id: "bg", name: "bg", type: "color", initial: "#dddddd", prop: false }));
		scope.setCell({ choice: "tone", option: "alarm", variable: "bg" }, "#ff0000");
		doc.update(childOf(doc, frame), { bindings: { fill: "bg" } });
		doc.update(other, { props: { tone: "alarm" } });
		doc.commit("bind");

		expect(doc.layer(childOf(doc, frame))?.fill).toBe("#dddddd");
		expect(doc.layer(childOf(doc, other))?.fill).toBe("#ff0000");
	});

	it("switches a document mode inside a copy that assigns it", () => {
		const held = scene();
		const { doc, frame } = held;
		const other = secondCopy(held);
		const scope = doc.components.scope(DOCUMENT_SCOPE);
		scope.put(
			variable({
				id: "mode",
				name: "mode",
				type: "choice",
				initial: "light",
				options: ["light", "dark"],
				prop: false,
			}),
		);
		scope.put(
			variable({ id: "surface", name: "surface", type: "color", initial: "#ffffff", prop: false }),
		);
		scope.setCell({ choice: "mode", option: "dark", variable: "surface" }, "#000000");
		doc.update(childOf(doc, frame), { bindings: { fill: "surface" } });
		doc.update(other, { props: { mode: "dark" } });
		doc.commit("theme");

		expect(doc.layer(childOf(doc, frame))?.fill).toBe("#ffffff");
		expect(doc.layer(childOf(doc, other))?.fill).toBe("#000000");
		expect(doc.tree.trace(childOf(doc, other), "surface", false)?.origin).toMatchObject({
			kind: "table",
		});
	});

	it("removes a binding when a literal is written to the field", () => {
		const { doc, frame } = scene();
		doc.components
			.scope(DOCUMENT_SCOPE)
			.put(variable({ id: "c", name: "c", type: "color", initial: "#abcdef" }));
		doc.update(frame, { bindings: { fill: "c" } });

		expect(doc.layer(frame)?.fill).toBe("#abcdef");
		doc.update(frame, { fill: "#123456" });
		expect(doc.layer(frame)?.fill).toBe("#123456");
		expect(doc.layer(frame)?.bindings).toEqual({});
	});
});

describe("disconnect and make frame", () => {
	it("gives a copy its own component, so later edits stay apart", () => {
		const held = scene();
		const { component, doc, frame } = held;
		const other = secondCopy(held);
		const next = disconnect(doc, other);
		doc.commit("disconnect");
		doc.update(childOf(doc, other), { fill: "#ff00ff" });
		doc.commit("edit");

		expect(next).not.toBe(component);
		expect(doc.layer(childOf(doc, frame))?.fill).toBe(CHILD.fill);
		expect(doc.tree.copyCount(component)).toBe(1);
	});

	it("turns one copy back into a frame with real children and keeps the other copies", () => {
		const held = scene();
		const { component, doc, frame } = held;
		const other = secondCopy(held);

		expect(makeFrame(doc, other)).toBe(true);
		doc.commit("make frame");

		expect(doc.layer(other)?.content.kind).toBe("none");
		expect(childOf(doc, other)).not.toContain("~");
		expect(doc.tree.copyCount(component)).toBe(1);
		expect(doc.layer(childOf(doc, frame))?.name).toBe("Dot");
	});
});

describe("paste into a different document", () => {
	it("brings the definition and the scope of each component that the copy uses", () => {
		const { component, doc, frame } = scene();
		doc.components
			.scope(component)
			.put(variable({ id: "n", name: "n", type: "number", initial: 3 }));
		doc.commit("add variable");
		const packed = packComponents(
			{ components: doc.components, readSubtree: (id) => doc.readSubtree(id) },
			[component],
		);
		const node = doc.readSubtree(frame);
		const target = DesignDocument.create();

		adoptComponents(target, packed);
		const copy = target.createSubtree(present(node), null);
		target.commit("paste");

		expect(target.layer(childOf(target, copy))?.name).toBe("Dot");
		expect(target.components.scope(component).variable("n")?.initial).toBe(3);
		expect(target.rootIds().map((id) => nodeOf(id))).toHaveLength(2);
	});
});
