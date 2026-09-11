import { useRef } from "react";
import type { ReactElement } from "react";
import type { DesignDocument } from "../document/document";
import { Stage } from "./Stage";
import { FileBar } from "./components/FileBar";
import { LayersCard } from "./components/LayerList";
import { LayerMenu } from "./components/LayerMenu";
import { Properties } from "./components/Properties";
import { ToolBar } from "./components/ToolBar";
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
			<Properties doc={doc} stage={stage} user={user} />
			<ToolBar tool={user.tool} />
			<LayerMenu doc={doc} user={user} />
		</>
	);
}
