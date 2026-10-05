import type { ReactElement } from "react";
import type { DesignDocument } from "../document/document";
import { FrameLabel, LayerView } from "./LayerView";
import type { UserState } from "./state/userState";
import { useRootIds } from "./useDocument";

export function RootLayers({ doc, user }: { doc: DesignDocument; user: UserState }): ReactElement {
	const ids = useRootIds(doc);

	return (
		<>
			{ids.map((id) => (
				<LayerView
					doc={doc}
					id={id}
					key={id}
					lift={user.lift}
					parentDisplay={null}
					selection={user.selection}
					textEdit={user.textEdit}
				/>
			))}
		</>
	);
}

export function FrameLabels({ doc, user }: { doc: DesignDocument; user: UserState }): ReactElement {
	const ids = useRootIds(doc);

	return (
		<>
			{ids.map((id) => (
				<FrameLabel doc={doc} id={id} key={id} selection={user.selection} />
			))}
		</>
	);
}
