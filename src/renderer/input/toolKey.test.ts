import { describe, expect, it } from "vitest";
import type { KeyStroke } from "./layerCommand";
import { toolFor } from "./toolKey";

const PLAIN = { shiftKey: false, altKey: false, ctrlKey: false, metaKey: false };

function stroke(key: string, held: Partial<KeyStroke> = {}): KeyStroke {
	return { key, ...PLAIN, ...held };
}

describe("toolFor", () => {
	it("takes the letter of each tool the bar shows", () => {
		expect(toolFor(stroke("v"))).toBe("select");
		expect(toolFor(stroke("a"))).toBe("artboard");
		expect(toolFor(stroke("r"))).toBe("rectangle");
		expect(toolFor(stroke("o"))).toBe("ellipse");
		expect(toolFor(stroke("h"))).toBe("hand");
		expect(toolFor(stroke("t"))).toBe("text");
		expect(toolFor(stroke("i"))).toBe("image");
	});

	it("takes the letter that a keyboard with the caps lock on writes", () => {
		expect(toolFor(stroke("R"))).toBe("rectangle");
	});

	it("leaves a letter with a modifier to the application that holds it", () => {
		expect(toolFor(stroke("r", { metaKey: true }))).toBeNull();
		expect(toolFor(stroke("r", { ctrlKey: true }))).toBeNull();
		expect(toolFor(stroke("r", { altKey: true }))).toBeNull();
		expect(toolFor(stroke("R", { shiftKey: true }))).toBeNull();
	});

	it("gives no tool for a key that the bar does not hold", () => {
		expect(toolFor(stroke("q"))).toBeNull();
		expect(toolFor(stroke("ArrowRight"))).toBeNull();
		expect(toolFor(stroke("]"))).toBeNull();
	});
});
