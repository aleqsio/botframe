import { LoroDoc } from "loro-crdt";
import { bagOf } from "./bag";
import { entryProblems } from "./dataCheck";
import { MAP, readPath } from "./dataPath";
import type { DataPath } from "./dataPath";
import { deletePath, writePath } from "./dataWrite";
import { isNodeId } from "./path";

interface EntryEdit {
	entry: DataPath;
	below: DataPath;
	value: unknown;
}

type Apply = (doc: LoroDoc, path: DataPath, value: unknown) => void;

const HOLDER = "entry";
const LAYERS = "layers";
const VALUE = "value";

function mapEntries(value: unknown): Readonly<Record<string, unknown>> {
	return bagOf(bagOf(value)[MAP]);
}

function editsOf(path: DataPath, value: unknown): readonly EntryEdit[] {
	const [root, key] = path;
	if (root === undefined) {
		return [];
	}
	if (key !== undefined) {
		return [{ entry: [root, key], below: path.slice(2), value }];
	}
	return Object.entries(mapEntries(value)).map(([name, held]) => ({
		entry: [root, name],
		below: [],
		value: held,
	}));
}

function touchedKeys(edit: EntryEdit): readonly string[] {
	const [field] = edit.below;
	return field === undefined ? Object.keys(mapEntries(edit.value)) : [String(field)];
}

function entryAfter(doc: LoroDoc, edit: EntryEdit, apply: Apply): unknown {
	const scratch = new LoroDoc();
	const holder = scratch.getMap(HOLDER);
	const current = readPath(doc, edit.entry);
	if (current !== undefined) {
		writePath(scratch, [HOLDER, VALUE], current);
	}
	apply(scratch, [HOLDER, VALUE, ...edit.below], edit.value);
	const held: unknown = holder.toJSON();
	return bagOf(held)[VALUE];
}

function isParent(doc: LoroDoc, entry: DataPath): boolean {
	const [root, node] = entry;
	if (root !== LAYERS || typeof node !== "string" || !isNodeId(node)) {
		return false;
	}
	return (doc.getTree(LAYERS).getNodeByID(node)?.children()?.length ?? 0) > 0;
}

function check(doc: LoroDoc, path: DataPath, value: unknown, apply: Apply): void {
	for (const edit of editsOf(path, value)) {
		const root = String(edit.entry[0]);
		const after = entryAfter(doc, edit, apply);
		const problems = entryProblems(root, after, touchedKeys(edit), isParent(doc, edit.entry));
		if (problems.length > 0) {
			throw new TypeError(`botframe cannot read ${edit.entry.join("/")}: ${problems.join(", ")}.`);
		}
	}
}

export function writeChecked(doc: LoroDoc, path: DataPath, value: unknown): void {
	check(doc, path, value, writePath);
	writePath(doc, path, value);
}

export function deleteChecked(doc: LoroDoc, path: DataPath): void {
	check(doc, path, undefined, (scratch, target) => {
		deletePath(scratch, target);
	});
	deletePath(doc, path);
}
