import { useCallback, useSyncExternalStore } from "react";
import type { ReactElement } from "react";
import type { DesignDocument } from "../../document/document";
import type { StoredFace } from "../../document/fonts";
import { assetUrlOf } from "../assetUrl";
import { fontFaceCss } from "./fontFaceCss";

export function useFontFaces(doc: DesignDocument): readonly StoredFace[] {
	return useSyncExternalStore(
		useCallback((listener: () => void) => doc.fonts.subscribe(listener), [doc]),
		useCallback(() => doc.fonts.faces(), [doc]),
	);
}

export function FontFaces({ doc }: { doc: DesignDocument }): ReactElement {
	const faces = useFontFaces(doc);
	return (
		<style>
			{fontFaceCss(
				faces,
				(asset) => assetUrlOf((held) => doc.fonts.fileOf(held), asset)?.url ?? null,
			)}
		</style>
	);
}
