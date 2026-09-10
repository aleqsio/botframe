import type { LayerId } from "../../document/layer";
import { DEFAULT_TOOL } from "../components/tools";
import type { ToolId } from "../components/tools";
import type { ZoneKey } from "../input/handles";
import { DEFAULT_APPEARANCE } from "./appearance";
import type { Appearance } from "./appearance";
import { IDENTITY_CAMERA } from "./camera";
import type { Camera, Point } from "./camera";
import { Slot } from "./slot";

export interface LayerMenu {
	client: Point;
	layerIds: readonly LayerId[];
}

export class UserState {
	readonly tool = new Slot<ToolId>(DEFAULT_TOOL);
	readonly appearance = new Slot<Appearance>(DEFAULT_APPEARANCE);
	readonly camera = new Slot<Camera>(IDENTITY_CAMERA);
	readonly selection = new Slot<readonly LayerId[]>([]);
	readonly menu = new Slot<LayerMenu | null>(null);
	readonly zone = new Slot<ZoneKey | null>(null);
	readonly dragging = new Slot<boolean>(false);
}
