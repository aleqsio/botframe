import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PaintBody } from "./PaintPicker";

describe("PaintBody", () => {
	it("shows the CSS text of a custom fill", () => {
		const text = "conic-gradient(red, blue)";
		const markup = renderToStaticMarkup(
			<PaintBody
				edit={{ value: text, change: () => undefined, commit: () => undefined }}
				paint={{ kind: "custom", text }}
				target={null}
			/>,
		);

		expect(markup).toBe(`<code class="layout-note">${text}</code>`);
	});
});
