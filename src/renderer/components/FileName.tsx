import { ContextMenu } from "@base-ui-components/react/context-menu";
import { useState } from "react";
import type { ReactElement } from "react";
import { FILE_EXTENSION, FILE_NAME } from "../../shared/file";
import { renameTab } from "../file";
import { useSlot } from "../state/useSlot";
import type { Tab } from "../state/tab";

const RENAME = "Rename";
const DOT_EXTENSION = `.${FILE_EXTENSION}`;

function cleanName(text: string): string | null {
	const trimmed = text.trim();
	const name = trimmed.endsWith(DOT_EXTENSION)
		? trimmed.slice(0, -DOT_EXTENSION.length).trim()
		: trimmed;
	return FILE_NAME.test(name) ? name : null;
}

function focusAll(input: HTMLInputElement | null): void {
	input?.focus();
	input?.select();
}

function NameInput({
	name,
	onDone,
}: {
	name: string;
	onDone: (name: string) => void;
}): ReactElement {
	const [original] = useState(name);

	return (
		<input
			aria-label="File name"
			className="file-name-input"
			defaultValue={original}
			onBlur={(event) => {
				onDone(cleanName(event.currentTarget.value) ?? original);
			}}
			onKeyDown={(event) => {
				if (event.key === "Escape") {
					event.currentTarget.value = original;
				}
				if (event.key === "Enter" || event.key === "Escape") {
					event.currentTarget.blur();
				}
			}}
			ref={focusAll}
		/>
	);
}

export function FileName({ tab }: { tab: Tab }): ReactElement {
	const name = useSlot(tab.name);
	const [editing, setEditing] = useState(false);

	if (editing) {
		return (
			<NameInput
				name={name}
				onDone={(next) => {
					setEditing(false);
					if (next !== name) {
						void renameTab(tab, next);
					}
				}}
			/>
		);
	}
	return (
		<ContextMenu.Root>
			<ContextMenu.Trigger
				className="file-name"
				onDoubleClick={() => {
					setEditing(true);
				}}
				render={<strong />}
				title={name}
			>
				{name}
			</ContextMenu.Trigger>
			<ContextMenu.Portal>
				<ContextMenu.Positioner>
					<ContextMenu.Popup aria-label={name} className="layer-menu">
						<ContextMenu.Item
							className="layer-menu-item"
							onClick={() => {
								setEditing(true);
							}}
						>
							<span className="layer-menu-label">{RENAME}</span>
						</ContextMenu.Item>
					</ContextMenu.Popup>
				</ContextMenu.Positioner>
			</ContextMenu.Portal>
		</ContextMenu.Root>
	);
}
