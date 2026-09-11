import { onApple } from "./input/editCommand";

const APPLE_KEYS: Readonly<Record<string, string>> = {
	CmdOrCtrl: "⌘",
	Cmd: "⌘",
	Ctrl: "⌃",
	Shift: "⇧",
};

const OTHER_KEYS: Readonly<Record<string, string>> = {
	CmdOrCtrl: "Ctrl",
};

export function acceleratorText(accelerator: string): string {
	if (accelerator === "") {
		return "";
	}
	const apple = onApple();
	const keys = apple ? APPLE_KEYS : OTHER_KEYS;
	const parts = accelerator.split("+").map((part) => keys[part] ?? part);
	return parts.join(apple ? "" : "+");
}
