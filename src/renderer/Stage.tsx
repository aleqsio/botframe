import type { ReactElement, RefObject } from "react";
import type { DesignDocument } from "../document/document";
import { FrameLabel, LayerView } from "./LayerView";
import { Overlay } from "./Overlay";
import { Viewport } from "./Viewport";
import { changesParent } from "./input/moveDrag";
import { useCanvasInput } from "./input/useCanvasInput";
import { useSlot } from "./state/useSlot";
import type { UserState } from "./state/userState";
import { useRootIds } from "./useDocument";

export function Stage({
	doc,
	stage,
	user,
}: {
	doc: DesignDocument;
	stage: RefObject<HTMLElement | null>;
	user: UserState;
}): ReactElement {
	const ids = useRootIds(doc);
	const tool = useSlot(user.tool);
	const zone = useSlot(user.zone);
	const move = useSlot(user.move);
	const handlers = useCanvasInput(doc, user);

	return (
		<main
			data-drop={changesParent(move) ? "" : undefined}
			data-tool={tool}
			data-zone={zone ?? undefined}
			id="stage"
			ref={stage}
			{...handlers}
		>
			<Viewport camera={user.camera} overlay={<Overlay doc={doc} user={user} />}>
				{ids.map((id) => (
					<LayerView
						doc={doc}
						id={id}
						key={id}
						lift={user.lift}
						parentDisplay={null}
						selection={user.selection}
					/>
				))}
				{ids.map((id) => (
					<FrameLabel doc={doc} id={id} key={id} selection={user.selection} />
				))}
			</Viewport>
		</main>
	);
}
