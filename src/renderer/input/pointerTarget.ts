import type { DesignDocument } from "../../document/document";
import type { LayerId } from "../../document/layer";
import type { UserState } from "../state/userState";
import { copyTargets } from "./copyTarget";
import { DOM_DRAWN } from "./drawn";
import { layerIdsAt, visibleLayerIds } from "./hitTest";
import type { Paint } from "./hitTest";
import type { PointerTarget } from "./tool";

function paintOf(doc: DesignDocument, id: LayerId): Paint | null {
	const layer = doc.layer(id);
	if (layer === null || layer.media === null || doc.assets.has(layer.media.asset)) {
		return layer;
	}
	return { fill: layer.fill, media: null, content: layer.content };
}

function visibleOf(doc: DesignDocument): (ids: readonly LayerId[]) => readonly LayerId[] {
	return (ids) => visibleLayerIds(ids, (id) => paintOf(doc, id));
}

export function targetOf(
	doc: DesignDocument,
	user: UserState,
	layerIds: readonly LayerId[],
): PointerTarget {
	const visible = visibleOf(doc);
	const pick = (ids: readonly LayerId[]): LayerId[] =>
		copyTargets(visible(ids), user.selection.get());
	return {
		doc,
		user,
		layerIds: pick(layerIds),
		layerIdsAt: (point) => pick(layerIdsAt(point.client)),
		drawn: DOM_DRAWN,
	};
}
