import { describe, expect, it } from "vitest";
import type { ComponentSource } from "./component";
import { DesignDocument } from "./document";
import { DRAWN } from "./documentFixtures";
import type { LayerId } from "./layer";

const CHECKBOX: ComponentSource = {
	name: "Checkbox",
	html: "<label>{{#checked}}x{{/checked}}{{label}}</label>",
	css: "label { gap: 4px; }",
	props: [
		{ name: "label", kind: "text", initial: "Accept" },
		{ name: "checked", kind: "boolean", initial: false },
	],
};

const NEWER: ComponentSource = { ...CHECKBOX, css: "label { gap: 8px; }" };

function withInstance(): { doc: DesignDocument; id: LayerId } {
	const doc = DesignDocument.create();
	doc.components.add({ v1: CHECKBOX });
	const id = doc.createLayer(DRAWN, null);
	doc.update(id, { content: { kind: "component", component: "v1", props: {} } });
	doc.commit("place component");
	return { doc, id };
}

describe("ComponentLibrary", () => {
	it("lists the newest version of each name, and keeps the old version for its instances", () => {
		const { doc, id } = withInstance();
		doc.components.add({ v2: NEWER });

		expect(doc.components.catalog()).toEqual([{ name: "Checkbox", id: "v2" }]);
		expect(doc.components.component("v1")?.css).toBe(CHECKBOX.css);
		expect(doc.layer(id)?.content).toEqual({ kind: "component", component: "v1", props: {} });
	});

	it("adopts a pasted version without taking the name from the version the document holds", () => {
		const { doc } = withInstance();
		doc.components.adopt({ v2: NEWER });

		expect(doc.components.catalog()).toEqual([{ name: "Checkbox", id: "v1" }]);
		expect(doc.components.component("v2")?.css).toBe(NEWER.css);
	});

	it("tells a subscriber after an import, and keeps the sources when undo takes back a placement", () => {
		const { doc, id } = withInstance();
		let calls = 0;
		doc.components.subscribe(() => {
			calls += 1;
		});
		doc.components.add({ v2: NEWER });

		expect(calls).toBeGreaterThan(0);
		expect(doc.undo()).toBe(true);
		expect(doc.layer(id)).toBeNull();
		expect(doc.undo()).toBe(false);
		expect(doc.components.catalog()).toEqual([{ name: "Checkbox", id: "v2" }]);
		expect(doc.components.component("v1")?.css).toBe(CHECKBOX.css);
	});

	it("commits an edit that is still open before it keeps the sources, so undo still takes the edit back", () => {
		const { doc, id } = withInstance();
		doc.update(id, { x: 500 });
		doc.components.add({ v2: NEWER });

		expect(doc.canUndo()).toBe(true);
		expect(doc.undo()).toBe(true);
		expect(doc.layer(id)?.x).toBe(DRAWN.x);
		expect(doc.components.catalog()).toEqual([{ name: "Checkbox", id: "v2" }]);
	});

	it("gives the sources of the components that a copy uses, and skips an id it does not hold", () => {
		const { doc } = withInstance();

		expect(doc.components.sourcesOf(["v1", "gone"])).toEqual({ v1: CHECKBOX });
	});
});

describe("component instances", () => {
	it("keeps the components and the props of an instance in a snapshot", () => {
		const { doc, id } = withInstance();
		doc.update(id, { props: { checked: true } });
		doc.commit("set prop");

		const opened = DesignDocument.open(doc.snapshot());
		expect(opened.layer(id)?.content).toEqual({
			kind: "component",
			component: "v1",
			props: { checked: true },
		});
		expect(opened.components.catalog()).toEqual([{ name: "Checkbox", id: "v1" }]);
	});

	it("merges two peers that set different props of one instance", () => {
		const { doc, id } = withInstance();
		const peer = DesignDocument.open(doc.snapshot());
		doc.update(id, { props: { checked: true } });
		doc.commit("set prop");
		peer.update(id, { props: { label: "Agree" } });
		peer.commit("set prop");

		doc.merge(peer.snapshot());

		expect(doc.layer(id)?.content).toEqual({
			kind: "component",
			component: "v1",
			props: { checked: true, label: "Agree" },
		});
	});

	it("replaces the props when the content changes, and merges them for a props patch", () => {
		const { doc, id } = withInstance();
		doc.update(id, { props: { label: "Agree", checked: true } });
		doc.update(id, { props: { label: "Deny" } });

		expect(doc.layer(id)?.content).toEqual({
			kind: "component",
			component: "v1",
			props: { label: "Deny", checked: true },
		});
		doc.update(id, { content: { kind: "component", component: "v2", props: { label: "New" } } });
		expect(doc.layer(id)?.content).toEqual({
			kind: "component",
			component: "v2",
			props: { label: "New" },
		});
	});

	it("carries the component and its props into a duplicate", () => {
		const { doc, id } = withInstance();
		doc.update(id, { props: { label: "Agree" } });
		const node = doc.readSubtree(id);
		const copy = node === null ? null : doc.createSubtree(node, null);

		expect(copy === null ? null : doc.layer(copy)?.content).toEqual({
			kind: "component",
			component: "v1",
			props: { label: "Agree" },
		});
	});
});
