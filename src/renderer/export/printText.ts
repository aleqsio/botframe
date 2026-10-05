import { bridge } from "../bridge";
import { base64Of } from "./base64";
import { painted } from "./drawScene";

const PICTURE_SCALE = 2;
const LONGEST_PICTURE = 2048;

export function textColorOf(
	paint: Pick<CSSStyleDeclaration, "backgroundColor" | "backgroundImage">,
): string | null {
	return paint.backgroundImage === "none" ? paint.backgroundColor : null;
}

function isolatedCopy(box: HTMLElement, scale: number): HTMLElement {
	const copy = box.cloneNode(true);
	if (!(copy instanceof HTMLElement)) {
		throw new TypeError("botframe cannot copy the text.");
	}
	Object.assign(copy.style, {
		position: "fixed",
		left: "0",
		top: "0",
		margin: "0",
		width: `${box.offsetWidth}px`,
		height: `${box.offsetHeight}px`,
		transform: `scale(${scale})`,
		transformOrigin: "0 0",
		clipPath: "none",
	});
	copy.dataset["exportTarget"] = "";
	return copy;
}

interface Size {
	width: number;
	height: number;
}

function paintedSize(box: HTMLElement): Size {
	return {
		width: Math.max(1, box.offsetWidth, box.scrollWidth),
		height: Math.max(1, box.offsetHeight, box.scrollHeight),
	};
}

async function textPicture(box: HTMLElement, size: Size): Promise<string> {
	const scale = Math.min(PICTURE_SCALE, LONGEST_PICTURE / Math.max(size.width, size.height));
	const copy = isolatedCopy(box, scale);
	document.body.append(copy);
	try {
		await painted();
		const bytes = await bridge().capturePage({
			x: 0,
			y: 0,
			width: Math.ceil(size.width * scale),
			height: Math.ceil(size.height * scale),
		});
		if (bytes === null) {
			throw new Error("botframe did not capture the text.");
		}
		return `data:image/png;base64,${base64Of(bytes)}`;
	} finally {
		copy.remove();
	}
}

async function printText(text: HTMLElement): Promise<void> {
	const color = textColorOf(getComputedStyle(text));
	if (color !== null) {
		Object.assign(text.style, { background: "none", color });
		return;
	}
	const box = text.parentElement;
	if (box === null) {
		return;
	}
	const size = paintedSize(box);
	const picture = new Image(size.width, size.height);
	picture.src = await textPicture(box, size);
	Object.assign(picture.style, { position: "absolute", left: "0", top: "0" });
	await picture.decode();
	text.style.visibility = "hidden";
	box.append(picture);
}

export async function printableText(target: HTMLElement): Promise<void> {
	const texts = Array.from(target.querySelectorAll<HTMLElement>(".layer-text"));
	await texts.reduce(
		(done: Promise<void>, text) => done.then(() => printText(text)),
		Promise.resolve(),
	);
}
