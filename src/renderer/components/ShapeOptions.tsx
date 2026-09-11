import { Toggle } from "@base-ui-components/react/toggle";
import { Toolbar } from "@base-ui-components/react/toolbar";
import type { ReactElement } from "react";
import type { Slot } from "../state/slot";
import { useSlot } from "../state/useSlot";
import { FloatingBar } from "./FloatingBar";
import { Icon } from "./Icon";
import { SHAPE_TOOLS } from "./tools";
import type { ToolId } from "./tools";

export function ShapeOptions({ tool }: { tool: Slot<ToolId> }): ReactElement {
	const activeTool = useSlot(tool);

	return (
		<FloatingBar label="Shape options">
			{SHAPE_TOOLS.map((shape) => (
				<Toolbar.Button
					className="tool-button option-button"
					key={shape.id}
					render={
						<Toggle
							onPressedChange={() => {
								tool.set(shape.id);
							}}
							pressed={activeTool === shape.id}
						/>
					}
				>
					<Icon name={shape.icon} />
					{shape.label}
				</Toolbar.Button>
			))}
		</FloatingBar>
	);
}
