import { onApple } from "./input/command";

const ARROW_KEYS: Readonly<Record<string, string>> = {
	Left: "←",
	Right: "→",
	Up: "↑",
	Down: "↓",
};

const APPLE_KEYS: Readonly<Record<string, string>> = {
	CmdOrCtrl: "⌘",
	Cmd: "⌘",
	Ctrl: "⌃",
	Shift: "⇧",
	Backspace: "⌫",
	...ARROW_KEYS,
};

const OTHER_KEYS: Readonly<Record<string, string>> = {
	CmdOrCtrl: "Ctrl",
	...ARROW_KEYS,
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
