import type { DesignDocument } from "../../document/document";
import type { LayerId } from "../../document/layer";
import type { UserState } from "../state/userState";
import { DOM_DRAWN } from "./drawn";
import { layerIdsAt, visibleLayerIds } from "./hitTest";
import type { PointerTarget } from "./tool";

function visibleOf(doc: DesignDocument): (ids: readonly LayerId[]) => readonly LayerId[] {
	return (ids) => visibleLayerIds(ids, (id) => doc.layer(id)?.fill ?? null);
}

export function targetOf(
	doc: DesignDocument,
	user: UserState,
	layerIds: readonly LayerId[],
): PointerTarget {
	const visible = visibleOf(doc);
	return {
		doc,
		user,
		layerIds: visible(layerIds),
		layerIdsAt: (point) => visible(layerIdsAt(point.client)),
		drawn: DOM_DRAWN,
	};
}
