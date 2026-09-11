import { useRef } from "react";
import type { ReactElement } from "react";
import type { DesignDocument } from "../document/document";
import { Stage } from "./Stage";
import { FileBar } from "./components/FileBar";
import { LayersCard } from "./components/LayerList";
import { LayerMenu } from "./components/LayerMenu";
import { Properties } from "./components/Properties";
import { ToolDock } from "./components/ToolDock";
import { ZoomBar } from "./components/ZoomBar";
import type { UserState } from "./state/userState";

export function Canvas({ doc, user }: { doc: DesignDocument; user: UserState }): ReactElement {
	const stage = useRef<HTMLElement>(null);

	return (
		<>
			<Stage doc={doc} stage={stage} user={user} />
			<div id="title-bar" />
			<FileBar layersOpen={user.layersOpen} />
			<LayersCard doc={doc} user={user} />
			<ZoomBar camera={user.camera} stage={stage} />
			<Properties doc={doc} user={user} />
			<ToolDock doc={doc} stage={stage} user={user} />
			<LayerMenu doc={doc} user={user} />
		</>
	);
}
