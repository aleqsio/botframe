import type { DesignDocument } from "../../../document/document";
import type { LayerId } from "../../../document/layer";
import type { DisplayMode } from "../../../document/layout";

const BACK_IN_FLOW = { x: 0, y: 0, layout: { position: "flow" } } as const;

export function flowChildren(doc: DesignDocument, id: LayerId, previous: DisplayMode): void {
	for (const childId of doc.childIds(id)) {
		const child = doc.layer(childId);
		if (child !== null && (previous === "block" || child.layout.position !== "absolute")) {
			doc.update(childId, BACK_IN_FLOW);
		}
	}
}
