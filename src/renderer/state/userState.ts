import type { LayerId } from "../../document/layer";
import { DEFAULT_TOOL } from "../components/tools";
import type { ToolId } from "../components/tools";
import type { ZoneKey } from "../input/handles";
import { IDENTITY_CAMERA } from "./camera";
import type { Camera, Point } from "./camera";
import { Slot } from "./slot";

export const NOTHING_SELECTED: readonly LayerId[] = [];

export interface Draw {
	id: LayerId;
	origin: Point;
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
}
