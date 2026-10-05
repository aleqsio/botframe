import { Toolbar } from "@base-ui-components/react/toolbar";
import { useRef, useState } from "react";
import type { ReactElement } from "react";
import { assetKind } from "../../document/assets";
import { MediaFileInput } from "./fill/MediaFileInput";
import { inBrowser } from "../bridge";
import type { PendingMedia } from "../state/userState";
import { DESKTOP_ONLY, UrlField } from "./fill/MediaUrl";
import { KIND_LABELS } from "./fill/MediaThumb";
import { Icon } from "./Icon";

export type LoadState = "idle" | "loading" | "failed";

export function MediaState({
	load,
	media,
}: {
	load: LoadState;
	media: PendingMedia | null;
}): ReactElement | null {
	if (load === "loading") {
		return <output aria-label="Loading media" className="media-spinner" />;
	}
	if (load === "failed") {
		return (
			<span className="option-note" role="alert">
				<Icon name="imageBroken" />
				The media did not load
			</span>
		);
	}
	if (media === null) {
		return null;
	}
	const kind = assetKind(media.asset.type);
	return (
		<span className="option-note">{`${KIND_LABELS[kind]} ${media.width} × ${media.height}`}</span>
	);
}

export function FileButton({ onFile }: { onFile: (file: File) => void }): ReactElement {
	const input = useRef<HTMLInputElement>(null);
	return (
		<>
			<MediaFileInput onFile={onFile} ref={input} />
			<Toolbar.Button
				className="tool-button option-button"
				onClick={() => {
					input.current?.click();
				}}
			>
				<Icon name="image" />
				File
			</Toolbar.Button>
		</>
	);
}

export function UrlButton({ onUrl }: { onUrl: (url: string) => void }): ReactElement {
	const [typing, setTyping] = useState(false);
	if (typing) {
		return (
			<UrlField
				onClose={() => {
					setTyping(false);
				}}
				onSubmit={onUrl}
			/>
		);
	}
	const browser = inBrowser();
	return (
		<Toolbar.Button
			className="tool-button option-button"
			disabled={browser}
			onClick={() => {
				setTyping(true);
			}}
			title={browser ? DESKTOP_ONLY : undefined}
		>
			<Icon name="link" />
			URL
		</Toolbar.Button>
	);
}
