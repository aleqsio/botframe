import { Toolbar } from "@base-ui-components/react/toolbar";
import { useState } from "react";
import type { ReactElement } from "react";
import type { Asset } from "../../document/assets";
import { pendingMediaOf } from "../mediaSize";
import { useSlot } from "../state/useSlot";
import type { UserState } from "../state/userState";
import { FloatingBar } from "./FloatingBar";
import { FileButton, MediaState, UrlButton } from "./ImageParts";
import type { LoadState } from "./ImageParts";
import { fileAsset, urlAsset } from "./mediaFile";

export function ImageOptions({ user }: { user: UserState }): ReactElement {
	const media = useSlot(user.pendingMedia);
	const [load, setLoad] = useState<LoadState>("idle");
	const start = async (asset: Promise<Asset | null>): Promise<void> => {
		setLoad("loading");
		const pending = await pendingMediaOf(await asset);
		setLoad(pending === null ? "failed" : "idle");
		if (pending !== null && user.tool.get() === "image") {
			user.pendingMedia.set(pending);
		}
	};

	return (
		<FloatingBar label="Image options">
			<FileButton onFile={(file) => void start(fileAsset(file))} />
			<UrlButton onUrl={(url) => void start(urlAsset(url))} />
			{load === "idle" && media === null ? null : (
				<>
					<Toolbar.Separator className="bar-separator" />
					<MediaState load={load} media={media} />
				</>
			)}
		</FloatingBar>
	);
}
