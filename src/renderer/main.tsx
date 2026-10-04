import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { connectAgent } from "./agent/connect";
import { App } from "./App";
import { watchClipboard } from "./clipboard";
import { connectEditMenu } from "./editMenu";
import { connectFileMenu } from "./file";
import { keepSession } from "./session";
import { Tab } from "./state/tab";
import { Workspace } from "./state/workspace";

const container = document.querySelector("#root");

if (container !== null) {
	const workspace = new Workspace(Tab.untitled());
	connectEditMenu(workspace);
	connectFileMenu(workspace);
	watchClipboard(workspace);
	void keepSession(workspace);
	const agent = connectAgent(workspace);
	createRoot(container).render(
		<StrictMode>
			<App agent={agent} workspace={workspace} />
		</StrictMode>,
	);
}
