import type { ReactElement } from "react";
import { useSlot } from "../state/useSlot";
import { tabName } from "../state/tab";
import type { Tab } from "../state/tab";
import type { SidePanel } from "../state/userState";
import type { Workspace } from "../state/workspace";
import { FileMenu } from "./FileMenu";
import { Icon } from "./Icon";
import type { IconName } from "./Icon";

interface PanelChoice {
	panel: Exclude<SidePanel, null>;
	label: string;
	icon: IconName;
}

const PANELS: readonly PanelChoice[] = [
	{ panel: "layers", label: "Layers", icon: "layers" },
	{ panel: "components", label: "Components", icon: "component" },
	{ panel: "fills", label: "Fills", icon: "gradient" },
];

export function FileBar({ tab, workspace }: { tab: Tab; workspace: Workspace }): ReactElement {
	const open = useSlot(tab.user.panel);
	const name = tabName(useSlot(tab.file));

	return (
		<div id="file-bar">
			<FileMenu workspace={workspace} />
			<strong className="file-name">{name}</strong>
			{PANELS.map((choice) => (
				<button
					aria-label={choice.label}
					aria-pressed={open === choice.panel}
					className="pill-button"
					key={choice.panel}
					onClick={() => {
						tab.user.panel.set(open === choice.panel ? null : choice.panel);
					}}
					title={choice.label}
					type="button"
				>
					<Icon name={choice.icon} />
				</button>
			))}
		</div>
	);
}
