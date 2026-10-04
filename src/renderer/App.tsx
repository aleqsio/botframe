import type { ReactElement } from "react";
import type { AgentLink } from "./agent/webLink";
import { Canvas } from "./Canvas";
import { FileBar } from "./components/FileBar";
import { TabBar } from "./components/TabBar";
import { FontFaces } from "./fonts/FontFaces";
import { useSlot } from "./state/useSlot";
import type { Workspace } from "./state/workspace";

interface AppProps {
	workspace: Workspace;
	agent: AgentLink | null;
}

export function App({ workspace, agent }: AppProps): ReactElement {
	const tab = useSlot(workspace.active);

	return (
		<>
			<FontFaces doc={tab.doc} />
			<Canvas doc={tab.doc} key={tab.id} user={tab.user} />
			<FileBar tab={tab} workspace={workspace} />
			<TabBar agent={agent} workspace={workspace} />
		</>
	);
}
