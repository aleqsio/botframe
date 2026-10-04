import { LoroList, LoroMap, LoroTree } from "loro-crdt";
import type { LoroDoc } from "loro-crdt";
import { bagOf, isList } from "./bag";
import { LIST, MAP, indexOf, isContainer, isSequence, locate } from "./dataPath";
import type { DataPath, DataSegment, Owner, Place, Sequence } from "./dataPath";

type Slots = LoroMap | Sequence;

function marked(value: unknown, marker: string): unknown {
	const bag = bagOf(value);
	return Object.keys(bag).length === 1 && Object.hasOwn(bag, marker) ? bag[marker] : undefined;
}

function entriesOf(value: unknown): readonly (readonly [string, unknown])[] | null {
	const held = marked(value, MAP);
	return typeof held === "object" && held !== null && !isList(held) ? Object.entries(held) : null;
}

function itemsOf(value: unknown): readonly unknown[] | null {
	const held = marked(value, LIST);
	return isList(held) ? held : null;
}

function slotsOf(owner: Owner): Slots {
	if (owner instanceof LoroMap || isSequence(owner)) {
		return owner;
	}
	throw new Error(
		"The path must end in a map key or a list index. Use the layer tools for tree nodes.",
	);
}

function setPlain(owner: Slots, key: DataSegment, value: unknown): void {
	if (owner instanceof LoroMap) {
		owner.set(String(key), value);
		return;
	}
	owner.insert(freeIndex(owner, key), value);
}

function freeIndex(owner: Sequence, key: DataSegment): number {
	const index = indexOf(key);
	if (index < owner.length) {
		owner.delete(index, 1);
	}
	return Math.min(index, owner.length);
}

function emptyKey(owner: LoroMap, key: string): string {
	if (owner.get(key) !== undefined) {
		owner.delete(key);
	}
	return key;
}

function childMap(owner: Slots, key: DataSegment): Slots {
	if (!(owner instanceof LoroMap)) {
		return owner.insertContainer(freeIndex(owner, key), new LoroMap());
	}
	const map = owner.ensureMergeableMap(emptyKey(owner, String(key)));
	map.clear();
	return map;
}

function childList(owner: Slots, key: DataSegment): Slots {
	if (!(owner instanceof LoroMap)) {
		return owner.insertContainer(freeIndex(owner, key), new LoroList());
	}
	const list = owner.ensureMergeableList(emptyKey(owner, String(key)));
	list.clear();
	return list;
}

const HOLDS_CONTAINER = `The path holds a container. Give {"${MAP}": {...}} for a map or {"${LIST}": [...]} for a list.`;

function mergeMap(map: Slots, entries: readonly (readonly [string, unknown])[]): void {
	for (const [key, item] of entries) {
		writeSlot(map, key, item);
	}
}

function fillList(list: Slots, items: readonly unknown[]): void {
	if (isSequence(list)) {
		list.clear();
	}
	for (const [index, item] of items.entries()) {
		writeSlot(list, index, item);
	}
}

function writeInto(held: unknown, value: unknown): boolean {
	const entries = entriesOf(value);
	if (held instanceof LoroMap && entries !== null) {
		mergeMap(held, entries);
		return true;
	}
	const items = itemsOf(value);
	if (isSequence(held) && items !== null) {
		fillList(held, items);
		return true;
	}
	return false;
}

function writeSlot(owner: Slots, key: DataSegment, value: unknown): void {
	const held: unknown = owner instanceof LoroMap ? owner.get(String(key)) : owner.get(indexOf(key));
	if (writeInto(held, value)) {
		return;
	}
	if (isContainer(held)) {
		throw new TypeError(HOLDS_CONTAINER);
	}
	const entries = entriesOf(value);
	if (entries !== null) {
		mergeMap(childMap(owner, key), entries);
		return;
	}
	const items = itemsOf(value);
	if (items === null) {
		setPlain(owner, key, value);
		return;
	}
	fillList(childList(owner, key), items);
}

const GONE = Symbol("gone");

type Edit = (held: unknown) => unknown;

function editInner(held: unknown, inner: DataPath, edit: Edit): unknown {
	const [key, ...rest] = inner;
	if (key === undefined) {
		return edit(held);
	}
	if (isList(held)) {
		const index = indexOf(key);
		const changed = editInner(held[index], rest, edit);
		return held.toSpliced(index, 1, ...(changed === GONE ? [] : [changed]));
	}
	const { [String(key)]: child, ...others } = bagOf(held);
	const changed = editInner(child, rest, edit);
	return changed === GONE ? others : { ...others, [String(key)]: changed };
}

function editPlain(place: Place, edit: Edit): void {
	if (isContainer(place.held)) {
		throw new TypeError("The path goes into a container that holds no plain value.");
	}
	setPlain(slotsOf(place.owner), place.key, editInner(place.held, place.inner, edit));
}

export function writePath(doc: LoroDoc, path: DataPath, value: unknown): void {
	const place = locate(doc, path);
	if (place.inner.length > 0) {
		editPlain(place, () => value);
		return;
	}
	if (writeInto(place.held, value)) {
		return;
	}
	if (isContainer(place.held)) {
		throw new TypeError(HOLDS_CONTAINER);
	}
	writeSlot(slotsOf(place.owner), place.key, value);
}

export function deletePath(doc: LoroDoc, path: DataPath): void {
	const place = locate(doc, path);
	const { owner, key, inner } = place;
	if (inner.length > 0) {
		editPlain(place, () => GONE);
		return;
	}
	if (owner instanceof LoroTree) {
		throw new TypeError("Use delete_layers to delete a tree node.");
	}
	const slots = slotsOf(owner);
	if (slots instanceof LoroMap) {
		slots.delete(String(key));
		return;
	}
	slots.delete(indexOf(key), 1);
}
