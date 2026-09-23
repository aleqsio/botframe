import { ELLIPSE_DEFAULTS, FRAME_DEFAULTS, RECTANGLE_DEFAULTS } from "../components/layerDefaults";
import type { ToolId } from "../components/tools";
import { composeBehaviors } from "./composeBehaviors";
import { createDrawBehavior } from "./drawBehavior";
import { createGroupHandleBehavior } from "./groupHandleBehavior";
import { createHandleBehavior } from "./handleBehavior";
import { createMarqueeBehavior } from "./marqueeBehavior";
import { createPanBehavior } from "./panBehavior";
import { createPickBehavior } from "./pickBehavior";
import type { ToolBehavior } from "./tool";

type BehaviorFactory = () => ToolBehavior;

const HANDLES: readonly BehaviorFactory[] = [createHandleBehavior, createGroupHandleBehavior];

const TOOL_BEHAVIORS: Readonly<Record<ToolId, readonly BehaviorFactory[]>> = {
	select: [...HANDLES, createPickBehavior, createMarqueeBehavior],
	frame: [...HANDLES, createDrawBehavior(FRAME_DEFAULTS)],
	rectangle: [...HANDLES, createDrawBehavior(RECTANGLE_DEFAULTS)],
	ellipse: [...HANDLES, createDrawBehavior(ELLIPSE_DEFAULTS)],
	text: HANDLES,
	image: HANDLES,
	hand: [createPanBehavior],
};

export function behaviorFor(tool: ToolId): ToolBehavior {
	return composeBehaviors(TOOL_BEHAVIORS[tool].map((create) => create()));
}
