import type { ReactElement } from "react";
import type { Slot } from "../state/slot";
import { useSlot } from "../state/useSlot";
import { FloatingBar } from "./FloatingBar";
import { ToolButton } from "./ToolButton";
import { TOOLS } from "./tools";
import type { ToolId } from "./tools";

export function ToolBar({ tool }: { tool: Slot<ToolId> }): ReactElement {
	const activeTool = useSlot(tool);

	return (
		<FloatingBar label="Tools">
			{TOOLS.map((definition) => (
				<ToolButton
					icon={definition.icon}
					key={definition.id}
					label={definition.label}
					onPress={() => {
						tool.set(definition.id);
					}}
					pressed={activeTool === definition.id}
				/>
			))}
		</FloatingBar>
	);
}
