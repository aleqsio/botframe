import type { LoroMap } from "loro-crdt";
import { bagOf } from "./bag";

export const SYNC_MODES = ["all", "style", "none"] as const;

export type SyncMode = (typeof SYNC_MODES)[number];

export type Overrides = Readonly<Record<string, Readonly<Record<string, unknown>>>>;

export interface InstanceState {
	sync: SyncMode;
	overrides: Overrides;
}

export const SYNC = "sync";
export const OVERRIDES = "overrides";
export const SELF = "self";

export function isSyncMode(value: unknown): value is SyncMode {
	return SYNC_MODES.some((mode) => mode === value);
}

function overridesOf(value: unknown): Overrides {
	return Object.fromEntries(
		Object.entries(bagOf(value)).flatMap(([path, held]) => {
			const flats = bagOf(held);
			return Object.keys(flats).length === 0 ? [] : [[path, flats] as const];
		}),
	);
}

export function instanceStateOf(sync: unknown, overrides: unknown): InstanceState {
	return { sync: isSyncMode(sync) ? sync : "all", overrides: overridesOf(overrides) };
}

function stringKeys(map: LoroMap): readonly string[] {
	return map.keys().filter((key: unknown): key is string => typeof key === "string");
}

export function writeInstance(data: LoroMap, state: InstanceState): void {
	if (state.sync === "all") {
		data.delete(SYNC);
	} else {
		data.set(SYNC, state.sync);
	}
	const map = data.ensureMergeableMap(OVERRIDES);
	for (const path of stringKeys(map).filter((key) => !Object.hasOwn(state.overrides, key))) {
		map.delete(path);
	}
	for (const [path, flats] of Object.entries(state.overrides)) {
		const held = map.ensureMergeableMap(path);
		for (const key of stringKeys(held).filter((name) => !Object.hasOwn(flats, name))) {
			held.delete(key);
		}
		for (const [key, value] of Object.entries(flats)) {
			held.set(key, value);
		}
	}
}
