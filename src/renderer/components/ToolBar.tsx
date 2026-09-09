import { useState } from "react";
import type { ReactElement } from "react";
import { FloatingBar } from "./FloatingBar";
import { ToolButton } from "./ToolButton";
import { DEFAULT_TOOL, TOOLS } from "./tools";
import type { ToolId } from "./tools";

export function ToolBar(): ReactElement {
	const [activeTool, setActiveTool] = useState<ToolId>(DEFAULT_TOOL);

	return (
		<FloatingBar label="Tools">
			{TOOLS.map((tool) => (
				<ToolButton
					icon={tool.icon}
					key={tool.id}
					label={tool.label}
					onPress={() => {
						setActiveTool(tool.id);
					}}
					pressed={activeTool === tool.id}
				/>
			))}
		</FloatingBar>
	);
}
