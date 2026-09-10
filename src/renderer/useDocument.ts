import { useCallback, useSyncExternalStore } from "react";
import type { DesignDocument } from "../document/document";
import type { Layer, LayerId } from "../document/layer";

const NO_LAYER = (): void => {};

export function useRootIds(doc: DesignDocument): readonly LayerId[] {
	return useSyncExternalStore(
		useCallback((listener: () => void) => doc.subscribeStructure(listener), [doc]),
		useCallback(() => doc.rootIds(), [doc]),
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
