import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DesignDocument } from "../document/document";
import { Canvas } from "./Canvas";
import { UserState } from "./state/userState";

const container = document.querySelector("#root");

if (container !== null) {
	createRoot(container).render(
		<StrictMode>
			<Canvas doc={DesignDocument.create()} user={new UserState()} />
		</StrictMode>,
	);
}
