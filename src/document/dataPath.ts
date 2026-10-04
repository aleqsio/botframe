import { LoroCounter, LoroList, LoroMap, LoroMovableList, LoroText, LoroTree } from "loro-crdt";
import type { Container, LoroDoc } from "loro-crdt";
import { bagOf, isList } from "./bag";
import { isNodeId } from "./path";

export type DataSegment = string | number;

export type DataPath = readonly DataSegment[];

type Sequence = LoroList | LoroMovableList;

export type Owner = LoroDoc | LoroMap | Sequence | LoroTree;

export interface Place {
	owner: Owner;
	key: DataSegment;
	held: unknown;
	inner: DataPath;
}

export const MAP = "$map";
export const LIST = "$list";

export function isContainer(value: unknown): value is Container {
	return (
		value instanceof LoroMap ||
		value instanceof LoroList ||
		value instanceof LoroMovableList ||
		value instanceof LoroTree ||
		value instanceof LoroText ||
		value instanceof LoroCounter
	);
}

export function isSequence(value: unknown): value is Sequence {
	return value instanceof LoroList || value instanceof LoroMovableList;
}

export function indexOf(key: DataSegment): number {
	const index = typeof key === "number" ? key : Number(key);
	if (!Number.isInteger(index) || index < 0) {
		throw new Error(`"${key}" is not a list index.`);
	}
	return index;
}

function rootOf(doc: LoroDoc, name: DataSegment): Container | undefined {
	const id = doc.getShallowValue()[String(name)];
	return id === undefined ? undefined : doc.getContainerById(id);
}

function childOf(owner: Owner, key: DataSegment): unknown {
	if (owner instanceof LoroMap) {
		return owner.get(String(key));
	}
	if (isSequence(owner)) {
		return owner.get(indexOf(key));
	}
	if (owner instanceof LoroTree) {
		const node = typeof key === "string" && isNodeId(key) ? owner.getNodeByID(key) : undefined;
		return node === undefined || node.isDeleted() ? undefined : node.data;
	}
	return rootOf(owner, key);
}

function isOwner(value: unknown): value is Exclude<Owner, LoroDoc> {
	return value instanceof LoroMap || isSequence(value) || value instanceof LoroTree;
}

export function locate(doc: LoroDoc, path: DataPath): Place {
	let owner: Owner = doc;
	for (const [index, key] of path.entries()) {
		const held = childOf(owner, key);
		const last = index === path.length - 1;
		if (last || !isOwner(held)) {
			return { owner, key, held, inner: path.slice(index + 1) };
		}
		owner = held;
	}
	throw new Error("The path is empty.");
}

function plainAt(value: unknown, inner: DataPath): unknown {
	return inner.reduce<unknown>(
		(held, key) => (isList(held) ? held[indexOf(key)] : bagOf(held)[String(key)]),
		value,
	);
}

function encodeTree(tree: LoroTree): unknown {
	const nodes = (list: ReturnType<LoroTree["roots"]>): unknown[] =>
		list.map((node) => ({
			id: node.id,
			data: encode(node.data),
			children: nodes(node.children() ?? []),
		}));
	return { $tree: nodes(tree.roots()) };
}

function encodeContainer(value: Container): unknown {
	if (value instanceof LoroMap) {
		const keys: readonly string[] = value.keys();
		const held: unknown[] = keys.map((key) => value.get(key));
		return { [MAP]: Object.fromEntries(keys.map((key, index) => [key, encode(held[index])])) };
	}
	if (isSequence(value)) {
		return { [LIST]: Array.from({ length: value.length }, (_, index) => encode(value.get(index))) };
	}
	if (value instanceof LoroTree) {
		return encodeTree(value);
	}
	return value instanceof LoroText
		? { $text: value.getShallowValue() }
		: { $counter: value.getShallowValue() };
}

function encode(value: unknown): unknown {
	if (isContainer(value)) {
		return encodeContainer(value);
	}
	if (value instanceof Uint8Array) {
		return { $bytes: value.length };
	}
	if (isList(value)) {
		return value.map((item) => encode(item));
	}
	if (typeof value === "object" && value !== null) {
		return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encode(item)]));
	}
	return value;
}

export function readPath(doc: LoroDoc, path: DataPath): unknown {
	if (path.length === 0) {
		const names = Object.keys(doc.getShallowValue());
		return Object.fromEntries(names.map((name) => [name, encode(rootOf(doc, name))]));
	}
	const { held, inner } = locate(doc, path);
	return encode(plainAt(held, inner));
}
