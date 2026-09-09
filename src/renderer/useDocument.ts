import { useCallback, useSyncExternalStore } from "react";
import type { DesignDocument } from "../document/document";
import type { Layer, LayerId } from "../document/layer";

export function useLayerIds(doc: DesignDocument): LayerId[] {
	return useSyncExternalStore(
		useCallback((listener: () => void) => doc.subscribeStructure(listener), [doc]),
		useCallback(() => doc.layerIds(), [doc]),
	);
}

export function useLayer(doc: DesignDocument, id: LayerId): Layer | null {
	return useSyncExternalStore(
		useCallback((listener: () => void) => doc.subscribeLayer(id, listener), [doc, id]),
		useCallback(() => doc.layer(id), [doc, id]),
	);
}
