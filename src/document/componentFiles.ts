import { propSpecOf } from "./component";
import type { ComponentSource, PropSpec } from "./component";
import { parseTemplate } from "./template";

export interface FileText {
	path: string;
	text: string;
}

interface Skipped {
	name: string;
	reason: string;
}

export interface FolderRead {
	sources: readonly ComponentSource[];
	skipped: readonly Skipped[];
}

type Part = "html" | "css" | "json";

type Parts = Partial<Record<Part, string>>;

const FILE_PART = /^(.*?)([^/]+)\.(html|css|json)$/u;
const IGNORED_FOLDER = /(?:^|\/)(?:node_modules|\.[^/]*)\//u;

export const REASONS = {
	noTemplate: "Its folder has no HTML file with this name.",
	openSection: "Its HTML file has a section that is not closed.",
	twoFolders: "Two folders have a component with this name.",
	badJson: "Its JSON file is not a JSON object.",
	badProp: (name: string) =>
		`The prop "${name}" is not text, true or false, or a list of text with no duplicates.`,
} as const;

export function isComponentFile(path: string): boolean {
	return FILE_PART.test(path) && !IGNORED_FOLDER.test(path);
}

function isPart(text: string): text is Part {
	return text === "html" || text === "css" || text === "json";
}

interface Group {
	name: string;
	parts: Parts;
}

function groupParts(files: readonly FileText[]): Map<string, Group> {
	const groups = new Map<string, Group>();
	for (const file of files.filter((held) => isComponentFile(held.path))) {
		const [, folder = "", name, part] = FILE_PART.exec(file.path) ?? [];
		if (name !== undefined && part !== undefined && isPart(part)) {
			const key = `${folder}${name}`;
			const parts = { ...groups.get(key)?.parts, [part]: file.text };
			groups.set(key, { name, parts });
		}
	}
	return groups;
}

function jsonObjectOf(text: string): Readonly<Record<string, unknown>> | null {
	try {
		const value: unknown = JSON.parse(text);
		return typeof value === "object" && value !== null && !Array.isArray(value)
			? Object.fromEntries(Object.entries(value))
			: null;
	} catch {
		return null;
	}
}

function propsOf(json: string | undefined): readonly PropSpec[] | string {
	if (json === undefined) {
		return [];
	}
	const bag = jsonObjectOf(json);
	if (bag === null) {
		return REASONS.badJson;
	}
	const specs: PropSpec[] = [];
	for (const [name, initial] of Object.entries(bag)) {
		const spec = propSpecOf(name, initial);
		if (spec === null) {
			return REASONS.badProp(name);
		}
		specs.push(spec);
	}
	return specs;
}

function sourceOf(name: string, parts: Parts): ComponentSource | string {
	if (parts.html === undefined) {
		return REASONS.noTemplate;
	}
	if (parseTemplate(parts.html) === null) {
		return REASONS.openSection;
	}
	const props = propsOf(parts.json);
	return typeof props === "string"
		? props
		: { name, html: parts.html, css: parts.css ?? "", props };
}

function namesInTwoFolders(groups: Iterable<Group>): ReadonlySet<string> {
	const seen = new Set<string>();
	const twice = new Set<string>();
	for (const { name, parts } of groups) {
		if (parts.html !== undefined) {
			(seen.has(name) ? twice : seen).add(name);
		}
	}
	return twice;
}

export function readComponentFolder(files: readonly FileText[]): FolderRead {
	const groups = [...groupParts(files).values()].toSorted((left, right) =>
		left.name.localeCompare(right.name),
	);
	const twice = namesInTwoFolders(groups);
	const sources: ComponentSource[] = [];
	const skipped: Skipped[] = [...twice].map((name) => ({ name, reason: REASONS.twoFolders }));
	for (const { name, parts } of groups.filter((group) => !twice.has(group.name))) {
		const source = sourceOf(name, parts);
		if (typeof source === "string") {
			skipped.push({ name, reason: source });
		} else {
			sources.push(source);
		}
	}
	return { sources, skipped };
}
