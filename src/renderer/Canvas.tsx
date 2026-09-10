import type { ReactElement } from "react";
import type { DesignDocument } from "../document/document";
import { Stage } from "./Stage";
import { LayerList } from "./components/LayerList";
import { LayerMenu } from "./components/LayerMenu";
import { Properties } from "./components/Properties";
import { ToolBar } from "./components/ToolBar";
import type { UserState } from "./state/userState";

export function Canvas({ doc, user }: { doc: DesignDocument; user: UserState }): ReactElement {
	return (
		<>
			<div id="title-bar" />
			<LayerList doc={doc} user={user} />
			<Stage doc={doc} user={user} />
			<Properties />
			<ToolBar tool={user.tool} />
			<LayerMenu doc={doc} user={user} />
		</>
	);
}
