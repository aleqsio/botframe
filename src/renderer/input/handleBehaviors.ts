import { createGroupHandleBehavior } from "./groupHandleBehavior";
import { createHandleBehavior } from "./handleBehavior";
import { createOriginBehavior } from "./originBehavior";
import type { ToolBehavior } from "./tool";

export type BehaviorFactory = () => ToolBehavior;

export const HANDLES: readonly BehaviorFactory[] = [
	createOriginBehavior,
	createHandleBehavior,
	createGroupHandleBehavior,
];
