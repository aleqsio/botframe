import type { ReactElement } from "react";
import type { DesignDocument } from "../../document/document";
import { useSlot } from "../state/useSlot";
import type { UserState } from "../state/userState";
import { FileMenu } from "./FileMenu";
import { Icon } from "./Icon";

export function FileBar({ doc, user }: { doc: DesignDocument; user: UserState }): ReactElement {
	const open = useSlot(user.layersOpen);
	const name = useSlot(user.fileName);

	return (
		<div id="file-bar">
			<FileMenu doc={doc} user={user} />
			<strong className="file-name">{name}</strong>
			<button
				aria-pressed={open}
				className="pill-button"
				onClick={() => {
					user.layersOpen.set(!open);
				}}
				type="button"
			>
				<Icon name="layers" />
				Layers
			</button>
		</div>
	);
}
