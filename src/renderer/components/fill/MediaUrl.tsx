import { useState } from "react";
import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import { Icon } from "../Icon";
import { inBrowser } from "../../bridge";
import { addMediaUrl } from "../mediaFile";
import type { AddChoice } from "../variables/AddMenu";

export interface UrlLoad {
	key: string;
	failed: boolean;
}

export function useUrlLoads(doc: DesignDocument): {
	loads: readonly UrlLoad[];
	start: (url: string) => void;
	dismiss: (key: string) => void;
} {
	const [loads, setLoads] = useState<readonly UrlLoad[]>([]);
	const dismiss = (key: string): void => {
		setLoads((held) => held.filter((load) => load.key !== key));
	};
	const load = async (key: string, url: string): Promise<void> => {
		if (await addMediaUrl(doc, url)) {
			dismiss(key);
			return;
		}
		setLoads((held) => held.map((entry) => (entry.key === key ? { key, failed: true } : entry)));
	};
	const start = (url: string): void => {
		const key = crypto.randomUUID();
		setLoads((held) => [...held, { key, failed: false }]);
		void load(key, url);
	};
	return { loads, start, dismiss };
}

export function UrlField({
	onClose,
	onSubmit,
}: {
	onClose: () => void;
	onSubmit: (url: string) => void;
}): ReactElement {
	return (
		<input
			aria-label="Media URL"
			className="property-input media-url"
			onBlur={onClose}
			onKeyDown={(event) => {
				if (event.key === "Escape") {
					event.stopPropagation();
					onClose();
				} else if (event.key === "Enter" && event.currentTarget.value.trim() !== "") {
					onSubmit(event.currentTarget.value.trim());
					onClose();
				}
			}}
			placeholder="https://"
			ref={(input) => {
				input?.focus();
			}}
			type="url"
		/>
	);
}

export function UrlCard({
	load,
	onDismiss,
}: {
	load: UrlLoad;
	onDismiss: (key: string) => void;
}): ReactElement {
	return (
		<li className="fill-card">
			<button
				aria-label={load.failed ? "Remove the media that did not load" : "Loading media"}
				className="fill-card-button"
				disabled={!load.failed}
				onClick={() => {
					onDismiss(load.key);
				}}
				title={load.failed ? "The media did not load." : undefined}
				type="button"
			>
				<span className="fill-card-preview media-missing">
					{load.failed ? <Icon name="imageBroken" /> : <span className="media-spinner" />}
				</span>
			</button>
		</li>
	);
}

const DESKTOP_ONLY = "Use the desktop app to add media from a URL";

export function mediaChoices(onUrl: () => void, onFile: () => void): readonly AddChoice[] {
	return [
		{
			name: "URL",
			icon: "link",
			pick: onUrl,
			...(inBrowser() ? { unavailable: DESKTOP_ONLY } : {}),
		},
		{ name: "File", icon: "image", pick: onFile },
	];
}
