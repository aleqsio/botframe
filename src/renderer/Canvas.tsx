import { useRef } from "react";
import type { ReactElement } from "react";
import type { DesignDocument } from "../document/document";
import { Stage } from "./Stage";
import { Inspector } from "./components/Inspector";
import { LayerMenu } from "./components/LayerMenu";
import { SidePanel } from "./components/SidePanel";
import { ToolDock } from "./components/ToolDock";
import { ZoomBar } from "./components/ZoomBar";
import type { UserState } from "./state/userState";

export function Canvas({ doc, user }: { doc: DesignDocument; user: UserState }): ReactElement {
	const stage = useRef<HTMLElement>(null);

	return (
		<>
			<Stage doc={doc} stage={stage} user={user} />
			<SidePanel doc={doc} stage={stage} user={user} />
			<ZoomBar camera={user.camera} stage={stage} />
			<Inspector doc={doc} user={user} />
			<ToolDock doc={doc} stage={stage} user={user} />
			<LayerMenu doc={doc} user={user} />
		</>
	);
}
