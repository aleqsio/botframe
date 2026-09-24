import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Canvas } from "./Canvas";
import { watchClipboard } from "./clipboard";
import { connectEditMenu } from "./editMenu";
import { connectFileMenu, startDocument } from "./file";
import { UserState } from "./state/userState";

async function start(container: Element): Promise<void> {
	const user = new UserState();
	const doc = await startDocument(user);
	connectEditMenu(doc, user);
	connectFileMenu(doc, user);
	watchClipboard(user);
	createRoot(container).render(
		<StrictMode>
			<Canvas doc={doc} user={user} />
		</StrictMode>,
	);
}

const container = document.querySelector("#root");

if (container !== null) {
	await start(container);
}
