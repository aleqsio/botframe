import type { ReactElement, RefObject } from "react";
import type { DesignDocument } from "../../document/document";
import { usePicked } from "../state/useSlot";
import type { UserState } from "../state/userState";
import { ArtboardOptions } from "./ArtboardOptions";
import { ShapeOptions } from "./ShapeOptions";
import { ToolBar } from "./ToolBar";
import { toolOptionsOf } from "./tools";
import type { ToolOptions } from "./tools";

interface DockProps {
	doc: DesignDocument;
	stage: RefObject<HTMLElement | null>;
	user: UserState;
}

function OptionsBar({
	kind,
	doc,
	stage,
	user,
}: DockProps & { kind: Exclude<ToolOptions, "none"> }): ReactElement {
	return kind === "artboard" ? (
		<ArtboardOptions doc={doc} stage={stage} user={user} />
	) : (
		<ShapeOptions tool={user.tool} />
	);
}

export function ToolDock({ doc, stage, user }: DockProps): ReactElement {
	const options = usePicked(user.tool, toolOptionsOf);

	return (
		<div id="dock">
			{options === "none" ? null : (
				<div className="tool-options" key={options}>
					<OptionsBar doc={doc} kind={options} stage={stage} user={user} />
				</div>
			)}
			<ToolBar tool={user.tool} />
		</div>
	);
}
