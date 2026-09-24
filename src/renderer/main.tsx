import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { watchClipboard } from "./clipboard";
import { connectEditMenu } from "./editMenu";
import { connectFileMenu } from "./file";
import { Tab, Workspace } from "./state/workspace";

const container = document.querySelector("#root");

if (container !== null) {
	const workspace = new Workspace(Tab.untitled());
	connectEditMenu(workspace);
	connectFileMenu(workspace);
	watchClipboard(workspace);
	createRoot(container).render(
		<StrictMode>
			<App workspace={workspace} />
		</StrictMode>,
	);
}
