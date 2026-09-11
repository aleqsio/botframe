import type { ReactElement, RefObject } from "react";
import type { DesignDocument } from "../../document/document";
import { usePicked } from "../state/useSlot";
import type { UserState } from "../state/userState";
import { ArtboardOptions } from "./ArtboardOptions";
import { ShapeOptions } from "./ShapeOptions";
import { ToolBar } from "./ToolBar";
import { toolOptionsOf } from "./tools";

export function ToolDock({
	doc,
	stage,
	user,
}: {
	doc: DesignDocument;
	stage: RefObject<HTMLElement | null>;
	user: UserState;
}): ReactElement {
	const options = usePicked(user.tool, toolOptionsOf);

	return (
		<div id="dock">
			{options === "artboard" ? <ArtboardOptions doc={doc} stage={stage} user={user} /> : null}
			{options === "shape" ? <ShapeOptions tool={user.tool} /> : null}
			<ToolBar tool={user.tool} />
		</div>
	);
}
