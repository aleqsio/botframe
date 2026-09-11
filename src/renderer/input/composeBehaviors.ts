import type { ToolBehavior } from "./tool";

function firstAnswer<T>(
	behaviors: readonly ToolBehavior[],
	ask: (behavior: ToolBehavior) => T | null,
): T | null {
	for (const behavior of behaviors) {
		const answer = ask(behavior);
		if (answer !== null) {
			return answer;
		}
	}
	return null;
}

export function composeBehaviors(behaviors: readonly ToolBehavior[]): ToolBehavior {
	let owner: ToolBehavior | null = null;

	return {
		hover(target, point) {
			return firstAnswer(behaviors, (behavior) => behavior.hover?.(target, point) ?? null);
		},
		highlight(target, point) {
			return firstAnswer(behaviors, (behavior) => behavior.highlight?.(target, point) ?? null);
		},
		tap(target, point) {
			return behaviors.some((behavior) => behavior.tap?.(target, point) === true);
		},
		dragStart(target, origin, point, modifiers) {
			owner =
				behaviors.find(
					(behavior) => behavior.dragStart?.(target, origin, point, modifiers) === true,
				) ?? null;
			return owner !== null;
		},
		drag(target, point, modifiers) {
			owner?.drag?.(target, point, modifiers);
		},
		dragEnd(target, point, modifiers) {
			const held = owner;
			owner = null;
			held?.dragEnd?.(target, point, modifiers);
		},
		context(target, client) {
			return behaviors.some((behavior) => behavior.context?.(target, client) === true);
		},
	};
}
