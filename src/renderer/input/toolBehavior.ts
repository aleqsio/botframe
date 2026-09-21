import {
	ARTBOARD_DEFAULTS,
	ELLIPSE_DEFAULTS,
	RECTANGLE_DEFAULTS,
} from "../components/layerDefaults";
import type { ToolId } from "../components/tools";
import { composeBehaviors } from "./composeBehaviors";
import { createDrawBehavior } from "./drawBehavior";
import { createHandleBehavior } from "./handleBehavior";
import { createMarqueeBehavior } from "./marqueeBehavior";
import { createPanBehavior } from "./panBehavior";
import { createPickBehavior } from "./pickBehavior";
import type { ToolBehavior } from "./tool";

type BehaviorFactory = () => ToolBehavior;

const TOOL_BEHAVIORS: Readonly<Record<ToolId, readonly BehaviorFactory[]>> = {
	select: [createHandleBehavior, createPickBehavior, createMarqueeBehavior],
	artboard: [createHandleBehavior, createDrawBehavior(ARTBOARD_DEFAULTS)],
	rectangle: [createHandleBehavior, createDrawBehavior(RECTANGLE_DEFAULTS)],
	ellipse: [createHandleBehavior, createDrawBehavior(ELLIPSE_DEFAULTS)],
	text: [createHandleBehavior],
	image: [createHandleBehavior],
	hand: [createPanBehavior],
};

export function behaviorFor(tool: ToolId): ToolBehavior {
	return composeBehaviors(TOOL_BEHAVIORS[tool].map((create) => create()));
}
