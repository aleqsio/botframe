import type { ReactElement } from "react";
import { Canvas } from "./Canvas";
import { FileBar } from "./components/FileBar";
import { TabBar } from "./components/TabBar";
import { useSlot } from "./state/useSlot";
import type { Workspace } from "./state/workspace";

export function App({ workspace }: { workspace: Workspace }): ReactElement {
	const tab = useSlot(workspace.active);

	return (
		<>
			<Canvas doc={tab.doc} key={tab.id} user={tab.user} />
			<FileBar tab={tab} workspace={workspace} />
			<TabBar workspace={workspace} />
		</>
	);
}
