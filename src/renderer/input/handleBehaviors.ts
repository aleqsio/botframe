import { createGroupHandleBehavior } from "./groupHandleBehavior";
import { createHandleBehavior } from "./handleBehavior";
import { createOriginBehavior } from "./originBehavior";
import { createSkewBehavior } from "./skewBehavior";
import type { ToolBehavior } from "./tool";

export type BehaviorFactory = () => ToolBehavior;

export const HANDLES: readonly BehaviorFactory[] = [
	createOriginBehavior,
	createSkewBehavior,
	createHandleBehavior,
	createGroupHandleBehavior,
];
