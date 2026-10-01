import { describe, expect, it } from "vitest";
import { componentMarkup, componentOf, componentSourceOf, propSpecOf } from "./component";
import type { Component, ComponentSource } from "./component";

const CHECKBOX: ComponentSource = {
	name: "Checkbox",
	html: '<label class="box {{size}}"><input type="checkbox" {{#checked}}checked{{/checked}}>{{label}}</label>',
	css: ".box { gap: 4px; }",
	props: [
		{ name: "label", kind: "text", initial: "Accept" },
		{ name: "checked", kind: "boolean", initial: false },
		{ name: "size", kind: "choice", initial: "md", options: ["md", "sm", "lg"] },
	],
};

function checkbox(): Component {
	const component = componentOf("abc", CHECKBOX);
	if (component === null) {
		throw new Error("the component does not parse");
	}
	return component;
}

describe("propSpecOf", () => {
	it("gives the kind of a prop from the type of its first value", () => {
		expect(propSpecOf("label", "Accept")).toEqual({
			name: "label",
			kind: "text",
			initial: "Accept",
		});
		expect(propSpecOf("on", true)).toEqual({ name: "on", kind: "boolean", initial: true });
		expect(propSpecOf("size", ["md", "lg"])).toEqual({
			name: "size",
			kind: "choice",
			initial: "md",
			options: ["md", "lg"],
		});
	});

	it("gives null for a number, an empty list, a list with duplicates, and a name that a template cannot use", () => {
		expect(propSpecOf("count", 3)).toBeNull();
		expect(propSpecOf("size", [])).toBeNull();
		expect(propSpecOf("size", ["md", "md"])).toBeNull();
		expect(propSpecOf("1st", "a")).toBeNull();
	});
});

describe("componentSourceOf", () => {
	it("reads a source that it wrote, and drops a prop that is broken", () => {
		const broken = {
			...CHECKBOX,
			props: [...CHECKBOX.props, { name: "size", kind: "choice", options: [] }],
		};

		expect(componentSourceOf(JSON.parse(JSON.stringify(broken)))).toEqual(CHECKBOX);
	});

	it("gives null for a source with a template that does not parse or a field that is missing", () => {
		expect(componentSourceOf({ ...CHECKBOX, html: "{{#open}}" })).toBeNull();
		expect(componentSourceOf({ name: "Checkbox", html: "" })).toBeNull();
	});
});

describe("componentMarkup", () => {
	it("writes a reset of the inherited styles, the style, the filled template, and a slot for layers inside", () => {
		expect(componentMarkup(checkbox(), { label: "Accept", checked: true, size: "lg" })).toBe(
			'<style>:host { all: initial; cursor: inherit; }\n.box { gap: 4px; }</style><label class="box lg"><input type="checkbox" checked>Accept</label><slot></slot>',
		);
	});

	it("does not let the stylesheet close its style element", () => {
		const component = componentOf("abc", { ...CHECKBOX, css: "a{}</STYLE><img>" });

		expect(component === null ? "" : componentMarkup(component, {})).toContain(
			"a{}<\\/style><img>",
		);
	});
});
