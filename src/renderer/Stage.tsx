import { useEffect } from "react";
import type { ReactElement, RefObject } from "react";
import type { DesignDocument } from "../document/document";
import { Overlay } from "./Overlay";
import { blockPageZoom } from "./pageZoom";
import { FrameLabels, RootLayers } from "./RootLayers";
import { Viewport } from "./Viewport";
import { changesParent } from "./input/moveDrag";
import { useCanvasInput } from "./input/useCanvasInput";
import { useSlot } from "./state/useSlot";
import type { UserState } from "./state/userState";

export function Stage({
	doc,
	stage,
	user,
}: {
	doc: DesignDocument;
	stage: RefObject<HTMLElement | null>;
	user: UserState;
}): ReactElement {
	const tool = useSlot(user.tool);
	const zone = useSlot(user.zone);
	const move = useSlot(user.move);
	const handlers = useCanvasInput(doc, user);

	useEffect(() => {
		const element = stage.current;
		return element === null ? undefined : blockPageZoom(window, element);
	}, [stage]);

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
				<RootLayers doc={doc} user={user} />
				<FrameLabels doc={doc} user={user} />
			</Viewport>
		</main>
	);
}
