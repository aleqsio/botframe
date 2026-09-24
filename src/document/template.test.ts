import { describe, expect, it } from "vitest";
import { fillTemplate, parseTemplate } from "./template";
import type { Template } from "./template";

function parsed(text: string): Template {
	const template = parseTemplate(text);
	if (template === null) {
		throw new Error("the template does not parse");
	}
	return template;
}

describe("parseTemplate", () => {
	it("gives null for a section that is not closed, closed twice, or closed with a different name", () => {
		expect(parseTemplate("{{#open}}text")).toBeNull();
		expect(parseTemplate("text{{/open}}")).toBeNull();
		expect(parseTemplate("{{#one}}{{/two}}")).toBeNull();
	});

	it("keeps braces that do not make a tag as text", () => {
		expect(fillTemplate(parsed("a {{ 1bad }} b {single}"), {})).toBe("a {{ 1bad }} b {single}");
	});
});

describe("fillTemplate", () => {
	it("escapes a text value in a text node and in an attribute", () => {
		const template = parsed('<span title="{{label}}">{{label}}</span>');

		expect(fillTemplate(template, { label: `"<b>'&` })).toBe(
			'<span title="&quot;&lt;b&gt;&#39;&amp;">&quot;&lt;b&gt;&#39;&amp;</span>',
		);
	});

	it("shows a section for true and for text that is not empty, and an inverted section for the rest", () => {
		const template = parsed("<input {{#checked}}checked{{/checked}}>{{^checked}}off{{/checked}}");

		expect(fillTemplate(template, { checked: true })).toBe("<input checked>");
		expect(fillTemplate(template, { checked: false })).toBe("<input >off");
		expect(fillTemplate(template, { checked: "" })).toBe("<input >off");
		expect(fillTemplate(template, {})).toBe("<input >off");
	});

	it("writes nothing for a value that is not text", () => {
		expect(fillTemplate(parsed("[{{flag}}]"), { flag: true })).toBe("[]");
	});

	it("fills a section inside a section", () => {
		const template = parsed("{{#a}}A{{#b}}B{{label}}{{/b}}{{/a}}");

		expect(fillTemplate(template, { a: true, b: true, label: "!" })).toBe("AB!");
		expect(fillTemplate(template, { a: true, b: false, label: "!" })).toBe("A");
	});
});
