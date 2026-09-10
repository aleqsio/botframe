import type { DesignDocument } from "./document";
import type { LayerId } from "./layer";

export function firstId(doc: DesignDocument): LayerId {
	const [id] = doc.layerIds();
	if (id === undefined) {
		throw new Error("document has no layers");
	}
	return id;
}
