/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import style from "./style.css?raw";

const SURFACE_SHADOWS = ["--panel-shadow", "--bar-shadow"];
const RING = /(?:^|,)\s*(?:inset )?0 0 0 1px /u;
const BORDER = /\bborder(?:-(?:block|inline|top|right|bottom|left|width|style|color))?\s*:/u;

interface Rule {
	selectors: string[];
	body: string;
}

function rules(): Rule[] {
	return style
		.split("}")
		.filter((block) => block.includes("{"))
		.map((block) => {
			const [head = "", body = ""] = block.split("{");
			return { selectors: head.split(",").map((name) => name.trim()), body };
		});
}

function valueOf(token: string): string {
	const match = new RegExp(`\\t${token}:([^;]*);`, "u").exec(style);
	const value = match?.[1];
	if (value === undefined) {
		throw new Error(`${token} has no value`);
	}
	return value.replaceAll(/\s+/gu, " ").trim();
}

function surfaceSelectors(): string[] {
	const used = SURFACE_SHADOWS.map((token) => `box-shadow: var(${token})`);
	return rules()
		.filter((rule) => used.some((declaration) => rule.body.includes(declaration)))
		.flatMap((rule) => rule.selectors);
}

describe("raised surfaces", () => {
	it.each(SURFACE_SHADOWS)("gives %s a hairline ring", (token) => {
		expect(valueOf(token)).toMatch(RING);
	});

	it("gives a surface shadow to each raised surface", () => {
		expect(surfaceSelectors()).toEqual(
			expect.arrayContaining([".floating-bar", ".color-popup", "#inspector"]),
		);
	});

	it("draws no border on a surface that takes a surface shadow", () => {
		const surfaces = new Set(surfaceSelectors());
		const drawn = rules()
			.filter((rule) => rule.selectors.some((name) => surfaces.has(name)))
			.filter((rule) => BORDER.test(rule.body));
		expect(drawn.flatMap((rule) => rule.selectors)).toEqual([]);
	});
});
