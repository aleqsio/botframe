import { bagOf, isList, listOf } from "./bag";
import type { Bag } from "./bag";
import { fillTemplate, parseTemplate } from "./template";
import type { Template } from "./template";

export type PropValue = string | boolean;

export type PropValues = Readonly<Record<string, PropValue>>;

export type PropSpec =
	| { name: string; kind: "text"; initial: string }
	| { name: string; kind: "boolean"; initial: boolean }
	| { name: string; kind: "choice"; initial: string; options: readonly string[] };

export interface ComponentSource {
	name: string;
	html: string;
	css: string;
	props: readonly PropSpec[];
}

export interface Component extends ComponentSource {
	id: string;
	template: Template;
}

const PROP_NAME = /^[A-Za-z_][\w-]*$/u;
const STYLE_END = /<\/style/giu;
const HOST_RESET = ":host { all: initial; cursor: inherit; }";

function isText(value: unknown): value is string {
	return typeof value === "string";
}

function choiceOf(name: string, options: readonly unknown[], initial: unknown): PropSpec | null {
	const texts = options.filter((option) => isText(option));
	const [first] = texts;
	if (
		first === undefined ||
		texts.length !== options.length ||
		new Set(texts).size < texts.length
	) {
		return null;
	}
	return {
		name,
		kind: "choice",
		initial: isText(initial) && texts.includes(initial) ? initial : first,
		options: texts,
	};
}

export function propSpecOf(name: string, initial: unknown): PropSpec | null {
	if (!PROP_NAME.test(name)) {
		return null;
	}
	if (isText(initial)) {
		return { name, kind: "text", initial };
	}
	if (typeof initial === "boolean") {
		return { name, kind: "boolean", initial };
	}
	return isList(initial) ? choiceOf(name, initial, initial[0]) : null;
}

function storedSpecOf(value: unknown): PropSpec | null {
	const bag = bagOf(value);
	const name = bag["name"];
	if (!isText(name)) {
		return null;
	}
	if (bag["kind"] === "choice") {
		return PROP_NAME.test(name) ? choiceOf(name, listOf(bag["options"]), bag["initial"]) : null;
	}
	const spec = propSpecOf(name, bag["initial"]);
	return spec?.kind === bag["kind"] ? spec : null;
}

function textOf(bag: Bag, key: string): string | null {
	const value = bag[key];
	return isText(value) ? value : null;
}

function readSource(value: unknown): { source: ComponentSource; template: Template } | null {
	const bag = bagOf(value);
	const name = textOf(bag, "name");
	const html = textOf(bag, "html");
	const css = textOf(bag, "css");
	const template = html === null ? null : parseTemplate(html);
	if (name === null || html === null || css === null || template === null) {
		return null;
	}
	const props = listOf(bag["props"]).flatMap((spec) => storedSpecOf(spec) ?? []);
	return { source: { name, html, css, props }, template };
}

export function componentSourceOf(value: unknown): ComponentSource | null {
	return readSource(value)?.source ?? null;
}

export function componentOf(id: string, value: unknown): Component | null {
	const read = readSource(value);
	return read === null ? null : { ...read.source, id, template: read.template };
}

export function isPropValue(value: unknown): value is PropValue {
	return isText(value) || typeof value === "boolean";
}

function heldValue(spec: PropSpec, held: unknown): PropValue {
	if (spec.kind === "choice") {
		return isText(held) && spec.options.includes(held) ? held : spec.initial;
	}
	if (spec.kind === "boolean") {
		return typeof held === "boolean" ? held : spec.initial;
	}
	return isText(held) ? held : spec.initial;
}

export function propValuesOf(component: ComponentSource, held: PropValues): PropValues {
	return Object.fromEntries(
		component.props.map((spec) => [spec.name, heldValue(spec, held[spec.name])]),
	);
}

export function componentMarkup(component: Component, held: PropValues): string {
	const css = component.css.replace(STYLE_END, "<\\/style");
	const html = fillTemplate(component.template, propValuesOf(component, held));
	return `<style>${HOST_RESET}\n${css}</style>${html}<slot></slot>`;
}
