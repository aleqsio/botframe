import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DesignDocument } from "../document/document";
import { Canvas } from "./Canvas";
import { connectEditMenu } from "./editMenu";
import { UserState } from "./state/userState";

const container = document.querySelector("#root");

if (container !== null) {
	const doc = DesignDocument.create();
	const user = new UserState();
	connectEditMenu(doc, user);
	createRoot(container).render(
		<StrictMode>
			<Canvas doc={doc} user={user} />
		</StrictMode>,
	);
}
