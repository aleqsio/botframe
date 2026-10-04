import { useCallback, useRef, useSyncExternalStore } from "react";
import type { ComponentEntry, ComponentsView } from "../document/components";
import type { DesignDocument, Unsubscribe } from "../document/document";
import type { Layer, LayerId, Rect } from "../document/layer";
import { DOM_DRAWN, drawnPadding, drawnRead } from "./input/drawn";
import { layerChain, uprightLinear } from "./input/layerSpace";
import { boundsOf } from "./input/selectionBounds";
import { spaceTransform } from "./layerStyle";

const NO_LAYER = (): void => {};
const NO_TEXT = "";
const OUTLINE_PART = "|";

export interface DrawnOutline {
	transform: string;
	width: number;
	height: number;
	padding: string;
	upright: string;
}

export function useRootIds(doc: DesignDocument): readonly LayerId[] {
	return useSyncExternalStore(
		useCallback((listener: () => void) => doc.subscribeStructure(listener), [doc]),
		useCallback(() => doc.rootIds(), [doc]),
	);
}

export function useLayerCount(doc: DesignDocument): number {
	return useSyncExternalStore(
		useCallback((listener: () => void) => doc.subscribeStructure(listener), [doc]),
		useCallback(() => doc.layerIds().length, [doc]),
	);
}

export function useChildIds(doc: DesignDocument, id: LayerId): readonly LayerId[] {
	return useSyncExternalStore(
		useCallback((listener: () => void) => doc.subscribeStructure(listener), [doc]),
		useCallback(() => doc.childIds(id), [doc, id]),
	);
}

export function useLayer(doc: DesignDocument, id: LayerId | null): Layer | null {
	return useSyncExternalStore(
		useCallback(
			(listener: () => void) => (id === null ? NO_LAYER : doc.subscribeLayer(id, listener)),
			[doc, id],
		),
		useCallback(() => (id === null ? null : doc.layer(id)), [doc, id]),
	);
}

export interface ComponentRow extends ComponentEntry {
	copies: number;
}

function rowsOf(doc: DesignDocument): readonly ComponentRow[] {
	return doc.components
		.entries()
		.map((entry): ComponentRow => {
			const { id, name, body } = entry;
			return { id, name, body, copies: doc.tree.copyCount(id) };
		})
		.filter((row) => row.body.kind === "html" || row.copies > 0);
}

function sameRows(left: readonly ComponentRow[], right: readonly ComponentRow[]): boolean {
	return (
		left.length === right.length &&
		left.every((row, index) => {
			const other = right[index];
			return (
				other !== undefined &&
				other.id === row.id &&
				other.name === row.name &&
				other.copies === row.copies
			);
		})
	);
}

export function useComponentRows(doc: DesignDocument): readonly ComponentRow[] {
	const held = useRef<readonly ComponentRow[]>([]);
	return useSyncExternalStore(
		useCallback(
			(listener: () => void) => {
				const drops = [doc.subscribeStructure(listener), doc.components.subscribe(listener)];
				return () => {
					for (const drop of drops) {
						drop();
					}
				};
			},
			[doc],
		),
		useCallback(() => {
			const next = rowsOf(doc);
			held.current = sameRows(held.current, next) ? held.current : next;
			return held.current;
		}, [doc]),
	);
}

export function useComponentsView(doc: DesignDocument): ComponentsView {
	return useSyncExternalStore(
		useCallback((listener: () => void) => doc.components.subscribe(listener), [doc]),
		useCallback(() => doc.components.view(), [doc]),
	);
}

export function drawnChain(doc: DesignDocument, id: LayerId | null): Layer[] {
	return layerChain(
		drawnRead(DOM_DRAWN, (layerId) => doc.layer(layerId)),
		id,
	);
}

function spaceText(chain: readonly Layer[]): string {
	return chain.map((layer) => spaceTransform(layer)).join(" ");
}

function uprightText(chain: readonly Layer[]): string {
	const { a, b, c, d } = uprightLinear(chain);
	return `matrix(${a}, ${b}, ${c}, ${d}, 0, 0)`;
}

function outlineText(doc: DesignDocument, id: LayerId): string {
	const chain = drawnChain(doc, id);
	const drawn = chain.at(-1);
	if (drawn === undefined) {
		return NO_TEXT;
	}
	const parts = [drawn.width, drawn.height, drawnPadding(id), uprightText(chain), spaceText(chain)];
	return parts.join(OUTLINE_PART);
}

function outlineOf(text: string): DrawnOutline | null {
	const [width, height, padding, upright, ...rest] = text.split(OUTLINE_PART);
	if (
		width === undefined ||
		height === undefined ||
		padding === undefined ||
		upright === undefined
	) {
		return null;
	}
	return {
		width: Number(width),
		height: Number(height),
		padding,
		upright,
		transform: rest.join(OUTLINE_PART),
	};
}

const NO_FONTS: Unsubscribe = () => {};

function subscribeFontLoads(listener: () => void): Unsubscribe {
	if (!("fonts" in document)) {
		return NO_FONTS;
	}
	document.fonts.addEventListener("loadingdone", listener);
	return () => {
		document.fonts.removeEventListener("loadingdone", listener);
	};
}

export function subscribeAfterCommit(doc: DesignDocument, listener: () => void): Unsubscribe {
	const dropChanges = doc.subscribeChanges(() => {
		queueMicrotask(listener);
	});
	const dropFonts = subscribeFontLoads(listener);
	return () => {
		dropChanges();
		dropFonts();
	};
}

export function useDrawnOutline(doc: DesignDocument, id: LayerId): DrawnOutline | null {
	return outlineOf(
		useSyncExternalStore(
			useCallback((listener: () => void) => subscribeAfterCommit(doc, listener), [doc]),
			useCallback(() => outlineText(doc, id), [doc, id]),
		),
	);
}

export function useDrawnSpace(doc: DesignDocument, id: LayerId | null): string {
	return useSyncExternalStore(
		useCallback((listener: () => void) => subscribeAfterCommit(doc, listener), [doc]),
		useCallback(() => spaceText(drawnChain(doc, id)), [doc, id]),
	);
}

interface LayerCache {
	ids: readonly LayerId[];
	layers: readonly Layer[];
	stale: boolean;
}

const NO_IDS: readonly LayerId[] = [];
const NO_LAYERS: readonly Layer[] = [];

export function useLayers(doc: DesignDocument, ids: readonly LayerId[]): readonly Layer[] {
	const cache = useRef<LayerCache>({ ids: NO_IDS, layers: NO_LAYERS, stale: true });

	return useSyncExternalStore(
		useCallback(
			(listener: () => void) => {
				cache.current.stale = true;
				const drops = ids.map((id) =>
					doc.subscribeLayer(id, () => {
						cache.current.stale = true;
						listener();
					}),
				);
				return () => {
					for (const drop of drops) {
						drop();
					}
				};
			},
			[doc, ids],
		),
		useCallback(() => {
			const held = cache.current;
			if (held.stale || held.ids !== ids) {
				cache.current = { ids, layers: ids.flatMap((id) => doc.layer(id) ?? []), stale: false };
			}
			return cache.current.layers;
		}, [doc, ids]),
	);
}

const BOX_PART = ",";

function boxText(doc: DesignDocument, ids: readonly LayerId[]): string {
	const box = boundsOf(
		drawnRead(DOM_DRAWN, (id) => doc.layer(id)),
		ids,
	);
	return box === null ? NO_TEXT : [box.x, box.y, box.width, box.height].join(BOX_PART);
}

function boxOf(text: string): Rect | null {
	const [x, y, width, height] = text.split(BOX_PART).map(Number);
	if (x === undefined || y === undefined || width === undefined || height === undefined) {
		return null;
	}
	return { x, y, width, height };
}

export function useSelectionBox(doc: DesignDocument, ids: readonly LayerId[]): Rect | null {
	return boxOf(
		useSyncExternalStore(
			useCallback((listener: () => void) => subscribeAfterCommit(doc, listener), [doc]),
			useCallback(() => boxText(doc, ids), [doc, ids]),
		),
	);
}

const NO_TARGETS: readonly LayerId[] = [];

export function useClipTargets(doc: DesignDocument, id: LayerId | null): readonly LayerId[] {
	return useSyncExternalStore(
		useCallback((listener: () => void) => doc.subscribeClips(listener), [doc]),
		useCallback(() => (id === null ? NO_TARGETS : doc.clipTargetsOf(id)), [doc, id]),
	);
}
