import type { Asset } from "../../document/assets";
import type { Layer, LayerId, Rect } from "../../document/layer";
import type { LayerLayout, Placement, PositionMode } from "../../document/layout";
import { DEFAULT_TOOL } from "../components/tools";
import type { ToolId } from "../components/tools";
import type { CursorKey } from "../input/cursor";
import type { RowDrag } from "../input/rowDrop";
import type { Linear } from "../../document/linear";
import type { SnapField, SnapSegment } from "../input/snap";
import { IDENTITY_CAMERA } from "./camera";
import type { Camera, Point } from "./camera";
import { Slot } from "./slot";

export const NOTHING_SELECTED: readonly LayerId[] = [];

const NOTHING_COLLAPSED: ReadonlySet<LayerId> = new Set();

export interface Draw {
	id: LayerId;
	origin: Point;
}

interface MoveStart extends Pick<
	Layer,
	"x" | "y" | "width" | "height" | "rotation" | "skewX" | "skewY" | "mirrored"
> {
	position: PositionMode;
	sizing: Pick<LayerLayout, "width" | "height">;
	cell: Placement;
	index: number;
}

export interface MovedLayer {
	id: LayerId;
	from: LayerId | null;
	start: MoveStart;
	anchor: Point;
	seen: Linear;
}

export interface LayerMove extends MovedLayer {
	parent: LayerId | null;
	field: SnapField;
	followers: readonly MovedLayer[];
}

export function movedIds(move: LayerMove): LayerId[] {
	return [move.id, ...move.followers.map((follower) => follower.id)];
}

export interface Lifted {
	id: LayerId;
	at: Point;
}

export interface Marquee {
	origin: Point;
	box: Rect;
}

export interface SnapGuides {
	parent: LayerId | null;
	segments: readonly SnapSegment[];
}

export interface GroupPivot {
	ids: readonly LayerId[];
	at: Point;
}

export interface LayerMenu {
	client: Point;
	layerIds: readonly LayerId[];
}

export type SidePanel = "layers" | "components";

export interface TextEdit {
	id: LayerId;
	message: string;
}

export interface PendingMedia {
	asset: Asset;
	width: number;
	height: number;
}

export class UserState {
	readonly tool = new Slot<ToolId>(DEFAULT_TOOL);
	readonly camera = new Slot<Camera>(IDENTITY_CAMERA);
	readonly selection = new Slot<readonly LayerId[]>(NOTHING_SELECTED);
	readonly menu = new Slot<LayerMenu | null>(null);
	readonly zone = new Slot<CursorKey | null>(null);
	readonly highlight = new Slot<LayerId | null>(null);
	readonly dragging = new Slot<boolean>(false);
	readonly draw = new Slot<Draw | null>(null);
	readonly pasteReady = new Slot<boolean>(false);
	readonly move = new Slot<LayerMove | null>(null);
	readonly marquee = new Slot<Marquee | null>(null);
	readonly snap = new Slot<SnapGuides | null>(null);
	readonly lift = new Slot<Lifted | null>(null);
	readonly collapsed = new Slot<ReadonlySet<LayerId>>(NOTHING_COLLAPSED);
	readonly rowDrag = new Slot<RowDrag | null>(null);
	readonly panel = new Slot<SidePanel>("layers");
	readonly groupPivot = new Slot<GroupPivot | null>(null);
	readonly pathEdit = new Slot<LayerId | null>(null);
	readonly textEdit = new Slot<TextEdit | null>(null);
	readonly pendingMedia = new Slot<PendingMedia | null>(null);

	constructor() {
		const endPathEdit = (): void => {
			this.pathEdit.set(null);
		};
		this.selection.subscribe(endPathEdit);
		this.tool.subscribe(endPathEdit);
		this.tool.subscribe(() => {
			if (this.tool.get() !== "image") {
				this.pendingMedia.set(null);
			}
		});
	}
}

export function toggleCollapsed(collapsed: Slot<ReadonlySet<LayerId>>, id: LayerId): void {
	const next = new Set(collapsed.get());
	if (!next.delete(id)) {
		next.add(id);
	}
	collapsed.set(next);
}
