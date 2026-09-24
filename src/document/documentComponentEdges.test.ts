import { describe, expect, it } from "vitest";
import type { ComponentSource } from "./component";
import { adoptComponents, makeComponent, makeFrame } from "./componentActions";
import { packComponents } from "./componentPack";
import { DesignDocument } from "./document";
import { DRAWN } from "./documentFixtures";
import type { LayerFields, LayerId } from "./layer";
import { DOCUMENT_SCOPE } from "./variable";
import type { Variable } from "./variable";

const DOT: LayerFields = {
	x: 4,
	y: 5,
	width: 10,
	height: 10,
	fill: "#111111",
	name: "Dot",
	clip: false,
	geometry: { kind: "rectangle", cornerRadius: 2, cornerSmoothing: 0, frame: false },
};

const BADGE: ComponentSource = {
	name: "Badge",
	html: "<b>{{label}}</b>",
	css: "",
	props: [{ name: "label", kind: "text", initial: "New" }],
};

function only<T>(items: readonly T[]): T {
	const [item] = items;
	if (item === undefined || items.length !== 1) {
		throw new Error(`expected one item, found ${items.length}`);
	}
	return item;
}

function present<T>(held: T | null): T {
	if (held === null) {
		throw new Error("the value is missing");
	}
	return held;
}

function variable(held: Omit<Variable, "options" | "prop"> & Partial<Variable>): Variable {
	return { options: [], prop: true, ...held };
}

function componentFrom(doc: DesignDocument): { frame: LayerId; component: string } {
	const frame = doc.createLayer(DRAWN, null);
	doc.createLayer(DOT, frame);
	const component = present(makeComponent(doc, frame));
	doc.commit("make component");
	return { frame, component };
}

function copyOf(doc: DesignDocument, id: LayerId, parent: LayerId | null): LayerId {
	const copy = doc.createSubtree(present(doc.readSubtree(id)), parent);
	doc.commit("copy");
	return copy;
}

function htmlCopy(doc: DesignDocument): LayerId {
	doc.components.importHtml([["badge-address", BADGE]]);
	const { id } = only(doc.components.entries());
	const copy = doc.createLayer(DRAWN, null);
	doc.update(copy, { content: { kind: "component", component: id, props: {} } });
	doc.commit("place");
	return copy;
}

describe("nested copies", () => {
	it("keeps the definition of a nested component when an outer copy becomes a frame", () => {
		const doc = DesignDocument.create();
		const inner = componentFrom(doc);
		const outer = doc.createLayer({ ...DRAWN, x: 600 }, null);
		copyOf(doc, inner.frame, outer);
		makeComponent(doc, outer);
		const other = copyOf(doc, outer, null);

		expect(makeFrame(doc, other)).toBe(true);
		doc.commit("make frame");

		expect(doc.childIds(inner.frame)).toHaveLength(1);
		const nested = only(doc.childIds(other));
		expect(doc.childIds(nested)).toHaveLength(1);
	});

	it("puts a component at the root when the chosen parent is inside that component", () => {
		const doc = DesignDocument.create();
		const { component, frame } = componentFrom(doc);
		const inside = only(doc.childIds(frame));
		const loose = doc.createLayer(DRAWN, null);

		expect(doc.tree.holder(inside, [component])).toBeNull();
		expect(doc.tree.holder(frame, [component])).toBeNull();
		expect(doc.tree.holder(loose, [component])).toBe(loose);
	});
});

describe("bindings and values", () => {
	it("removes a corner binding only when the corner value changes", () => {
		const doc = DesignDocument.create();
		doc.components
			.scope(DOCUMENT_SCOPE)
			.put(variable({ id: "r", name: "r", type: "length", initial: 8 }));
		const dot = doc.createLayer(DOT, null);
		doc.update(dot, { bindings: { cornerRadius: "r" } });
		const geometry = { kind: "rectangle", cornerRadius: 8, cornerSmoothing: 0 } as const;

		doc.update(dot, { geometry: { ...geometry, frame: true } });
		expect(doc.layer(dot)?.bindings).toEqual({ cornerRadius: "r" });
		doc.update(dot, { geometry: { ...geometry, cornerRadius: 12, frame: true } });
		expect(doc.layer(dot)?.bindings).toEqual({});
		expect(doc.layer(dot)?.geometry).toMatchObject({ cornerRadius: 12 });
	});

	it("gives the first value of a prop when a copy holds a value of the wrong type", () => {
		const doc = DesignDocument.create();
		const { component, frame } = componentFrom(doc);
		doc.components
			.scope(component)
			.put(variable({ id: "n", name: "n", type: "number", initial: 3 }));
		doc.update(frame, { props: { n: "three" } });

		expect(doc.layer(frame)?.content).toMatchObject({ values: { n: 3 } });
	});

	it("takes a variable out of each option of a table, and drops the cells of a removed option", () => {
		const doc = DesignDocument.create();
		const scope = doc.components.scope(DOCUMENT_SCOPE);
		scope.put(variable({ id: "c", name: "c", type: "choice", initial: "a", options: ["a", "b"] }));
		scope.put(variable({ id: "v", name: "v", type: "number", initial: 0 }));
		scope.setCell({ choice: "c", option: "a", variable: "v" }, 1);
		scope.setCell({ choice: "c", option: "b", variable: "v" }, 2);

		scope.dropOptions("c", ["a"]);
		expect(scope.cells().map(([cell]) => cell.option)).toEqual(["a"]);
		scope.takeOut("c", "v");
		expect(scope.drivingChoice("v")).toBeNull();
	});
});

describe("HTML copies", () => {
	it("copies the real children of an HTML copy", () => {
		const doc = DesignDocument.create();
		const copy = htmlCopy(doc);
		doc.createLayer(DOT, copy);

		expect(doc.readSubtree(copy)?.children).toHaveLength(1);
	});

	it("keeps the props of an adopted HTML component after an undo of the paste", () => {
		const source = DesignDocument.create();
		const copy = htmlCopy(source);
		const { id } = only(source.components.entries());
		const packed = packComponents(
			{ components: source.components, readSubtree: (held) => source.readSubtree(held) },
			[id],
		);
		const target = DesignDocument.create();

		adoptComponents(target, packed);
		target.createSubtree(present(source.readSubtree(copy)), null);
		target.commit("paste");
		target.undo();

		expect(
			target.components
				.scope(id)
				.variables()
				.map((held) => held.name),
		).toEqual(["label"]);
	});
});
