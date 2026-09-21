import { createContext, useContext } from "react";
import type { DesignDocument } from "../../document/document";
import type { Layer, LayerId, LayerPatch } from "../../document/layer";
import { NOTHING_SELECTED } from "../state/userState";

export type LayerEdit = (layer: Layer) => LayerPatch | null;

export const TargetsContext = createContext<readonly LayerId[]>(NOTHING_SELECTED);

export function useTargets(): readonly LayerId[] {
	return useContext(TargetsContext);
}

export function plainEdit(patch: LayerPatch): LayerEdit {
	return () => patch;
}

export function editEach(doc: DesignDocument, ids: readonly LayerId[], edit: LayerEdit): void {
	for (const id of ids) {
		const layer = doc.layer(id);
		const patch = layer === null ? null : edit(layer);
		if (patch !== null) {
			doc.update(id, patch);
		}
	}
}
