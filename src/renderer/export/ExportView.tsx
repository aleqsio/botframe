import type { ReactElement } from "react";
import type { DesignDocument } from "../../document/document";
import { RootLayers } from "../RootLayers";
import { Viewport } from "../Viewport";
import { FontFaces } from "../fonts/FontFaces";
import type { UserState } from "../state/userState";

export function ExportView({ doc, user }: { doc: DesignDocument; user: UserState }): ReactElement {
	return (
		<main id="stage">
			<FontFaces doc={doc} />
			<Viewport camera={user.camera} overlay={null}>
				<RootLayers doc={doc} user={user} />
			</Viewport>
		</main>
	);
}
