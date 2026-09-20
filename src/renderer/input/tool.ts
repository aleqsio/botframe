import type { DesignDocument } from "../../document/document";
import type { LayerId } from "../../document/layer";
import type { Point, StagePoint } from "../state/camera";
import type { UserState } from "../state/userState";
import type { DrawnReader } from "./drawn";
import type { Zone } from "./handles";
import type { Modifiers } from "./modifiers";

export interface PointerTarget {
	doc: DesignDocument;
	user: UserState;
	layerIds: readonly LayerId[];
	layerIdsAt: (point: StagePoint) => readonly LayerId[];
	drawn: DrawnReader;
}

export interface ToolBehavior {
	hover?: (target: PointerTarget, point: StagePoint) => Zone | null;
	highlight?: (target: PointerTarget, point: StagePoint) => LayerId | null;
	tap?: (target: PointerTarget, point: StagePoint, modifiers: Modifiers) => boolean;
	dragStart?: (
		target: PointerTarget,
		origin: StagePoint,
		point: StagePoint,
		modifiers: Modifiers,
	) => boolean;
	drag?: (target: PointerTarget, point: StagePoint, modifiers: Modifiers) => void;
	dragEnd?: (target: PointerTarget, point: StagePoint, modifiers: Modifiers) => void;
	context?: (target: PointerTarget, client: Point) => boolean;
}
