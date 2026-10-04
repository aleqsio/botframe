import type { DesignDocument } from "../../document/document";
import type { LayerId } from "../../document/layer";
import type { Point, StagePoint } from "../state/camera";
import type { UserState } from "../state/userState";
import type { CursorKey } from "./cursor";
import type { DrawnReader } from "./drawn";
import type { Modifiers } from "./modifiers";

export interface PointerTarget {
	doc: DesignDocument;
	user: UserState;
	layerIds: readonly LayerId[];
	layerIdsAt: (point: StagePoint) => readonly LayerId[];
	drawn: DrawnReader;
}

export interface ToolBehavior {
	hover?: (target: PointerTarget, point: StagePoint) => CursorKey | null;
	highlight?: (target: PointerTarget, point: StagePoint) => LayerId | null;
	tap?: (target: PointerTarget, point: StagePoint, modifiers: Modifiers) => boolean;
	doubleTap?: (target: PointerTarget, point: StagePoint, modifiers: Modifiers) => boolean;
	dragStart?: (
		target: PointerTarget,
		origin: StagePoint,
		point: StagePoint,
		modifiers: Modifiers,
	) => boolean;
	drag?: (target: PointerTarget, point: StagePoint, modifiers: Modifiers) => boolean;
	dragEnd?: (target: PointerTarget, point: StagePoint, modifiers: Modifiers) => void;
	context?: (target: PointerTarget, client: Point) => boolean;
}
