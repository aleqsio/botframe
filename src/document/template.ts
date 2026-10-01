export type TemplateValue = string | boolean;

type TemplatePart =
	| { kind: "text"; text: string }
	| { kind: "value"; name: string }
	| { kind: "section"; name: string; inverted: boolean; parts: Template };

export type Template = readonly TemplatePart[];

interface Open {
	name: string;
	inverted: boolean;
	parts: TemplatePart[];
}

const TAG = /\{\{\s*([#^/]?)\s*([A-Za-z_][\w-]*)\s*\}\}/gu;
const ESCAPES: Readonly<Record<string, string>> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#39;",
};
const UNSAFE = /[&<>"']/gu;

function escapeHtml(text: string): string {
	return text.replace(UNSAFE, (character) => ESCAPES[character] ?? character);
}

function pushText(parts: TemplatePart[], text: string): void {
	if (text !== "") {
		parts.push({ kind: "text", text });
	}
}

function closeSection(stack: Open[], name: string): boolean {
	const open = stack.pop();
	const parent = stack.at(-1);
	if (open === undefined || parent === undefined || open.name !== name) {
		return false;
	}
	parent.parts.push({
		kind: "section",
		name,
		inverted: open.inverted,
		parts: open.parts,
	});
	return true;
}

function addTag(stack: Open[], sigil: string, name: string): boolean {
	const top = stack.at(-1);
	if (top === undefined) {
		return false;
	}
	if (sigil === "/") {
		return closeSection(stack, name);
	}
	if (sigil === "") {
		top.parts.push({ kind: "value", name });
		return true;
	}
	stack.push({ name, inverted: sigil === "^", parts: [] });
	return true;
}

export function parseTemplate(text: string): Template | null {
	const root: Open = { name: "", inverted: false, parts: [] };
	const stack: Open[] = [root];
	let from = 0;
	for (const match of text.matchAll(TAG)) {
		pushText(stack.at(-1)?.parts ?? root.parts, text.slice(from, match.index));
		if (!addTag(stack, match[1] ?? "", match[2] ?? "")) {
			return null;
		}
		from = match.index + match[0].length;
	}
	pushText(root.parts, text.slice(from));
	return stack.length === 1 ? root.parts : null;
}

function isSet(value: TemplateValue | undefined): boolean {
	return value === true || (typeof value === "string" && value !== "");
}

function fillPart(part: TemplatePart, values: Readonly<Record<string, TemplateValue>>): string {
	if (part.kind === "text") {
		return part.text;
	}
	if (part.kind === "section") {
		return isSet(values[part.name]) === part.inverted ? "" : fillTemplate(part.parts, values);
	}
	const value = values[part.name];
	return typeof value === "string" ? escapeHtml(value) : "";
}

export function fillTemplate(
	template: Template,
	values: Readonly<Record<string, TemplateValue>>,
): string {
	return template.map((part) => fillPart(part, values)).join("");
}
