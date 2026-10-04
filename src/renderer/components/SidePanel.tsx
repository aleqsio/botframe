import type { ReactElement, RefObject } from "react";
import type { DesignDocument } from "../../document/document";
import { useSlot } from "../state/useSlot";
import type { UserState } from "../state/userState";
import { ComponentList } from "./ComponentList";
import { LayerList } from "./LayerList";

export function SidePanel({
	doc,
	stage,
	user,
}: {
	doc: DesignDocument;
	stage: RefObject<HTMLElement | null>;
	user: UserState;
}): ReactElement | null {
	const panel = useSlot(user.panel);

	if (panel === "layers") {
		return <LayerList doc={doc} user={user} />;
	}
	return panel === "components" ? <ComponentList doc={doc} stage={stage} user={user} /> : null;
}
