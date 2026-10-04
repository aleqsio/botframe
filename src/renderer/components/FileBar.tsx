import type { ReactElement } from "react";
import { inBrowser } from "../bridge";
import { onApple } from "../input/command";
import { useSlot } from "../state/useSlot";
import { tabName } from "../state/tab";
import type { Tab } from "../state/tab";
import type { Workspace } from "../state/workspace";
import { FileMenu } from "./FileMenu";

export function FileBar({ tab, workspace }: { tab: Tab; workspace: Workspace }): ReactElement {
	const name = tabName(useSlot(tab.file));
	const windowButtons = onApple() && !inBrowser();

	return (
		<div data-window-buttons={windowButtons ? "" : undefined} id="file-bar">
			<FileMenu workspace={workspace} />
			<strong className="file-name">{name}</strong>
		</div>
	);
}
