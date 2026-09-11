import type { LayerId } from "../../document/layer";
import { DEFAULT_TOOL } from "../components/tools";
import type { ToolId } from "../components/tools";
import type { ZoneKey } from "../input/handles";
import type { RowDrag } from "../input/rowDrop";
import { IDENTITY_CAMERA } from "./camera";
import type { Camera, Point } from "./camera";
import { Slot } from "./slot";

export const NOTHING_SELECTED: readonly LayerId[] = [];

const NOTHING_COLLAPSED: ReadonlySet<LayerId> = new Set();

export interface Draw {
	id: LayerId;
	origin: Point;
}

export interface LayerMove {
	id: LayerId;
	from: LayerId | null;
	parent: LayerId | null;
	start: Point;
	offset: Point;
}

export interface LayerMenu {
	client: Point;
	layerIds: readonly LayerId[];
}

export class UserState {
	readonly tool = new Slot<ToolId>(DEFAULT_TOOL);
	readonly camera = new Slot<Camera>(IDENTITY_CAMERA);
	readonly selection = new Slot<readonly LayerId[]>(NOTHING_SELECTED);
	readonly menu = new Slot<LayerMenu | null>(null);
	readonly zone = new Slot<ZoneKey | null>(null);
	readonly dragging = new Slot<boolean>(false);
	readonly draw = new Slot<Draw | null>(null);
	readonly pointer = new Slot<Point | null>(null);
	readonly pasteReady = new Slot<boolean>(false);
	readonly move = new Slot<LayerMove | null>(null);
	readonly collapsed = new Slot<ReadonlySet<LayerId>>(NOTHING_COLLAPSED);
	readonly rowDrag = new Slot<RowDrag | null>(null);
	readonly layersOpen = new Slot<boolean>(true);
}

export function toggleCollapsed(collapsed: Slot<ReadonlySet<LayerId>>, id: LayerId): void {
	const next = new Set(collapsed.get());
	if (!next.delete(id)) {
		next.add(id);
	}
	collapsed.set(next);
}
