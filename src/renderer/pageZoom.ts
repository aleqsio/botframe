const SAFARI_GESTURES = ["gesturestart", "gesturechange"] as const;
const ACTIVE = { passive: false };

type Listening = Pick<Window, "addEventListener" | "removeEventListener">;

function preventDefault(event: Event): void {
	event.preventDefault();
}

function preventPinch(event: WheelEvent): void {
	if (event.ctrlKey) {
		event.preventDefault();
	}
}

export function blockPageZoom(page: Listening, stage: EventTarget): () => void {
	page.addEventListener("wheel", preventPinch, ACTIVE);
	stage.addEventListener("wheel", preventDefault, ACTIVE);
	for (const type of SAFARI_GESTURES) {
		page.addEventListener(type, preventDefault, ACTIVE);
	}
	return () => {
		page.removeEventListener("wheel", preventPinch);
		stage.removeEventListener("wheel", preventDefault);
		for (const type of SAFARI_GESTURES) {
			page.removeEventListener(type, preventDefault);
		}
	};
}
