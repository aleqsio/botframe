import type { ReactElement } from "react";
import { useSlot } from "../state/useSlot";
import { tabName } from "../state/workspace";
import type { Tab, Workspace } from "../state/workspace";
import { FileMenu } from "./FileMenu";
import { Icon } from "./Icon";

export function FileBar({ tab, workspace }: { tab: Tab; workspace: Workspace }): ReactElement {
	const open = useSlot(tab.user.layersOpen);
	const name = tabName(useSlot(tab.file));

	return (
		<div id="file-bar">
			<FileMenu workspace={workspace} />
			<strong className="file-name">{name}</strong>
			<button
				aria-pressed={open}
				className="pill-button"
				onClick={() => {
					tab.user.layersOpen.set(!open);
				}}
				type="button"
			>
				<Icon name="layers" />
				Layers
			</button>
		</div>
	);
}
