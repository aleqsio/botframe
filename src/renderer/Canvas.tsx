import { useRef } from "react";
import type { ReactElement } from "react";
import type { DesignDocument } from "../document/document";
import { Stage } from "./Stage";
import { FileBar } from "./components/FileBar";
import { Inspector } from "./components/Inspector";
import { LayersCard } from "./components/LayerList";
import { LayerMenu } from "./components/LayerMenu";
import { ToolDock } from "./components/ToolDock";
import { ZoomBar } from "./components/ZoomBar";
import type { UserState } from "./state/userState";

export function Canvas({ doc, user }: { doc: DesignDocument; user: UserState }): ReactElement {
	const stage = useRef<HTMLElement>(null);

	return (
		<>
			<Stage doc={doc} stage={stage} user={user} />
			<FileBar doc={doc} user={user} />
			<LayersCard doc={doc} user={user} />
			<ZoomBar camera={user.camera} stage={stage} />
			<Inspector doc={doc} user={user} />
			<ToolDock doc={doc} stage={stage} user={user} />
			<LayerMenu doc={doc} user={user} />
		</>
	);
}
