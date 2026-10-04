import { describe, expect, it } from "vitest";
import { DesignDocument } from "./document";
import { firstId } from "./documentFixtures";

const SOURCE = { name: "Chip", html: "<b>{{label}}</b>", css: "b { color: red; }", props: [] };

describe("checked data writes", () => {
	it("refuses a source that is plain HTML", () => {
		const doc = DesignDocument.create();
		expect(() => {
			doc.writeData(["sources", "a1"], "<b>hi</b>");
		}).toThrow("botframe cannot read sources/a1: the source (an object {name, html, css, props}).");
	});

	it("names each bad field of a source", () => {
		const doc = DesignDocument.create();
		expect(() => {
			doc.writeData(["sources", "a1"], { ...SOURCE, css: 1, props: [{ name: "x", kind: "nope" }] });
		}).toThrow("botframe cannot read sources/a1: css (text), props.0.");
		expect(() => {
			doc.writeData(["sources", "a1"], { ...SOURCE, html: "{{#open}}" });
		}).toThrow(/html \(a section is not closed\)/u);
	});

	it("accepts a valid source, and refuses a change that breaks it", () => {
		const doc = DesignDocument.create();
		doc.writeData(["sources", "a1"], SOURCE);
		expect(() => {
			doc.deleteData(["sources", "a1", "html"]);
		}).toThrow(/html \(text\)/u);
		expect(doc.readData(["sources", "a1", "name"])).toBe("Chip");
	});

	it("checks a component entry, also in a merge into the root", () => {
		const doc = DesignDocument.create();
		expect(() => {
			doc.writeData(["components"], { $map: { c1: { $map: { name: "X", kind: "web" } } } });
		}).toThrow("botframe cannot read components/c1: kind (html or layers).");
		doc.writeData(["components", "c1"], { $map: { name: "X", kind: "html", source: "a1" } });
		expect(doc.readData(["components", "c1", "kind"])).toBe("html");
	});

	it("checks the layer fields that a write changes", () => {
		const doc = DesignDocument.create();
		const id = firstId(doc);
		expect(() => {
			doc.writeData(["layers", id, "fill"], 12);
		}).toThrow(`botframe cannot read layers/${id}: fill.`);
		expect(() => {
			doc.writeData(["layers", id], { $map: { colour: "red" } });
		}).toThrow(/colour \(botframe does not read this layer field\)/u);
		expect(() => {
			doc.writeData(["layers", id, "media"], { asset: "nope" });
		}).toThrow(/media/u);
		doc.writeData(["layers", id, "layout"], { display: "row" });
		expect(doc.readData(["layers", id, "layout"])).toEqual({ display: "row" });
	});
});
