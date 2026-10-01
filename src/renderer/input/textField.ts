const TEXT_EDITS: Readonly<Record<string, string>> = {
	undo: "undo",
	redo: "redo",
	cut: "cut",
	copy: "copy",
	paste: "paste",
	delete: "delete",
};

const TEXT_TYPES: ReadonlySet<string> = new Set(["text", "search", "number", "url", "email"]);

export function isTextField(target: EventTarget | null): boolean {
	if (target instanceof HTMLInputElement) {
		return TEXT_TYPES.has(target.type);
	}
	return (
		target instanceof HTMLTextAreaElement ||
		(target instanceof HTMLElement && target.isContentEditable)
	);
}

export function textEditFor(command: string, typing: boolean): string | null {
	return typing ? (TEXT_EDITS[command] ?? null) : null;
}

interface TextStroke {
	key: string;
	metaKey: boolean;
	ctrlKey: boolean;
	shiftKey: boolean;
}

export function textKeyFor(stroke: TextStroke): string | null {
	if (!stroke.metaKey && !stroke.ctrlKey) {
		return null;
	}
	const key = stroke.key.toLowerCase();
	if (key === "z") {
		return stroke.shiftKey ? "redo" : "undo";
	}
	return key === "a" ? "selectAll" : null;
}

// An input keeps its own undo stack, and only execCommand drives it:
// https://developer.mozilla.org/docs/Web/API/Document/execCommand
export function runTextEdit(command: string): void {
	document.execCommand(command);
}
