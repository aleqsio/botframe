import type { DesignDocument } from "../../../document/document";
import type { LayerId } from "../../../document/layer";
import type { DisplayMode } from "../../../document/layout";

const BACK_TO_DEFAULT = { x: 0, y: 0, layout: { position: "default" } } as const;

export function resetChildren(doc: DesignDocument, id: LayerId, previous: DisplayMode): void {
	for (const childId of doc.childIds(id)) {
		const child = doc.layer(childId);
		if (child !== null && (previous === "block" || child.layout.position !== "absolute")) {
			doc.update(childId, BACK_TO_DEFAULT);
		}
	}
}
