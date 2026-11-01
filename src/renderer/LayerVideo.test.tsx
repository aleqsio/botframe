import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { mediaOf } from "../document/media";
import { LayerVideo } from "./LayerVideo";

function markupOf(playback: Readonly<Record<string, boolean>>): string {
	const fill = mediaOf({ asset: "a".repeat(64), ...playback });
	if (fill === null) {
		throw new Error("the media fill is not valid");
	}
	return renderToStaticMarkup(
		<LayerVideo fill={fill} media={{ kind: "video", url: "blob:clip" }} paint="#000000" />,
	);
}

describe("LayerVideo", () => {
	it("gives the video the playback of the media fill", () => {
		const markup = markupOf({ autoplay: false, loop: false, controls: true });

		expect(markup).toContain('controls=""');
		expect(markup).not.toMatch(/autoplay|loop=/iu);
	});

	it("plays, loops, and shows no controls by default", () => {
		const markup = markupOf({});

		expect(markup).toMatch(/autoplay=""/iu);
		expect(markup).toContain('loop=""');
		expect(markup).not.toContain("controls");
	});
});
