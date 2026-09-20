import { useCallback, useSyncExternalStore } from "react";
import type { DesignDocument, Unsubscribe } from "../document/document";
import type { Layer, LayerId } from "../document/layer";
import { DOM_DRAWN, drawnPadding, drawnRead } from "./input/drawn";
import { layerChain } from "./input/layerSpace";
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
