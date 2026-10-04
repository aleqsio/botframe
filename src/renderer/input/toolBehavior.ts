import { ELLIPSE_DEFAULTS, FRAME_DEFAULTS, RECTANGLE_DEFAULTS } from "../components/layerDefaults";
import type { ToolId } from "../components/tools";
import { composeBehaviors } from "./composeBehaviors";
import { createDrawBehavior } from "./drawBehavior";
import { HANDLES } from "./handleBehaviors";
import type { BehaviorFactory } from "./handleBehaviors";
import { createMarqueeBehavior } from "./marqueeBehavior";
import { createPanBehavior } from "./panBehavior";
import { createPathBehavior } from "./pathBehavior";
import { createPickBehavior } from "./pickBehavior";
import { createTextBehavior } from "./textBehavior";
import { createTextEditBehavior } from "./textEdit";
import type { ToolBehavior } from "./tool";

const TOOL_BEHAVIORS: Readonly<Record<ToolId, readonly BehaviorFactory[]>> = {
	select: [
		createTextEditBehavior,
		createPathBehavior,
		...HANDLES,
		createPickBehavior,
		createMarqueeBehavior,
	],
	frame: [...HANDLES, createDrawBehavior(FRAME_DEFAULTS)],
	rectangle: [...HANDLES, createDrawBehavior(RECTANGLE_DEFAULTS)],
	ellipse: [...HANDLES, createDrawBehavior(ELLIPSE_DEFAULTS)],
	text: [...HANDLES, createTextBehavior],
	image: HANDLES,
	hand: [createPanBehavior],
};

const PATH_EDIT: readonly BehaviorFactory[] = [
	createPathBehavior,
	createPickBehavior,
	createMarqueeBehavior,
];

export function behaviorFor(tool: ToolId, editingPath = false): ToolBehavior {
	const factories = editingPath && tool === "select" ? PATH_EDIT : TOOL_BEHAVIORS[tool];
	return composeBehaviors(factories.map((create) => create()));
}
