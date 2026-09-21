import { useCallback, useRef, useSyncExternalStore } from "react";
import type { DesignDocument, Unsubscribe } from "../document/document";
import type { Layer, LayerId, Rect } from "../document/layer";
import { DOM_DRAWN, drawnPadding, drawnRead } from "./input/drawn";
import { layerChain } from "./input/layerSpace";
import { boundsOf } from "./input/selectionBounds";
import { spaceTransform } from "./layerStyle";

const NO_LAYER = (): void => {};
const NO_FRAME = "";
const FRAME_PART = "|";

export interface DrawnFrame {
	transform: string;
	width: number;
	height: number;
	padding: string;
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

function drawnChain(doc: DesignDocument, id: LayerId | null): Layer[] {
	return layerChain(
		drawnRead(DOM_DRAWN, (layerId) => doc.layer(layerId)),
		id,
	);
}

function spaceText(chain: readonly Layer[]): string {
	return chain.map((layer) => spaceTransform(layer)).join(" ");
}

function frameText(doc: DesignDocument, id: LayerId): string {
	const chain = drawnChain(doc, id);
	const drawn = chain.at(-1);
	if (drawn === undefined) {
		return NO_FRAME;
	}
	return [drawn.width, drawn.height, drawnPadding(id), spaceText(chain)].join(FRAME_PART);
}

function frameOf(text: string): DrawnFrame | null {
	const [width, height, padding, ...rest] = text.split(FRAME_PART);
	if (width === undefined || height === undefined || padding === undefined) {
		return null;
	}
	return {
		width: Number(width),
		height: Number(height),
		padding,
		transform: rest.join(FRAME_PART),
	};
}

function subscribeAfterCommit(doc: DesignDocument, listener: () => void): Unsubscribe {
	return doc.subscribeChanges(() => {
		queueMicrotask(listener);
	});
}

export function useDrawnFrame(doc: DesignDocument, id: LayerId): DrawnFrame | null {
	return frameOf(
		useSyncExternalStore(
			useCallback((listener: () => void) => subscribeAfterCommit(doc, listener), [doc]),
			useCallback(() => frameText(doc, id), [doc, id]),
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
	return box === null ? NO_FRAME : [box.x, box.y, box.width, box.height].join(BOX_PART);
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
