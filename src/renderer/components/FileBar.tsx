import type { ReactElement } from "react";
import { inBrowser } from "../bridge";
import { onApple } from "../input/command";
import type { Tab } from "../state/tab";
import type { Workspace } from "../state/workspace";
import { FileMenu } from "./FileMenu";
import { FileName } from "./FileName";

export function FileBar({ tab, workspace }: { tab: Tab; workspace: Workspace }): ReactElement {
	const windowButtons = onApple() && !inBrowser();

	return (
		<div data-window-buttons={windowButtons ? "" : undefined} id="file-bar">
			<FileMenu workspace={workspace} />
			<FileName key={tab.id} tab={tab} />
		</div>
	);
}
