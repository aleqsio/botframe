import type { DesignDocument } from "./document";
import type { SyncMode } from "./instanceState";
import { applyInstance, setSyncMode } from "./instances";
import type { SyncPart } from "./instanceSync";
import type { LayerId } from "./path";

export function setInstanceSync(doc: DesignDocument, id: LayerId, mode: SyncMode): void {
	setSyncMode(doc.tree, id, mode);
	doc.commit("set sync");
}

export function applyInstanceChanges(doc: DesignDocument, id: LayerId, part: SyncPart): void {
	applyInstance(doc.tree, id, part);
	doc.commit("apply to all instances");
}

export function resetInstance(doc: DesignDocument, id: LayerId): void {
	applyInstance(doc.tree, id, null);
	doc.commit("reset instance");
}
