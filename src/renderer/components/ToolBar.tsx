import type { ReactElement } from "react";
import type { Slot } from "../state/slot";
import { useSlot } from "../state/useSlot";
import { FloatingBar } from "./FloatingBar";
import { ToolButton } from "./ToolButton";
import { TOOL_GROUPS, groupTool } from "./tools";
import type { ToolId } from "./tools";

export function ToolBar({ tool }: { tool: Slot<ToolId> }): ReactElement {
	const activeTool = useSlot(tool);

	return (
		<FloatingBar label="Tools">
			{TOOL_GROUPS.map((group) => {
				const shown = groupTool(group, activeTool);
				return (
					<ToolButton
						icon={shown.icon}
						key={group[0].id}
						label={shown.label}
						onPress={() => {
							tool.set(shown.id);
						}}
						pressed={activeTool === shown.id}
					/>
				);
			})}
		</FloatingBar>
	);
}
