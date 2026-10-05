import { root } from "./example";
import type { Example } from "./example";

const HTML = '<span class="badge">{{label}}{{#hot}}<b class="hot">HOT</b>{{/hot}}</span>';
const CSS = [
	".badge { display: flex; gap: 8px; align-items: center; justify-content: center; height: 100%; border-radius: 24px; background: linear-gradient(90deg, #4f46e5, #06b6d4); color: white; font: 600 22px Inter, sans-serif; }",
	".hot { padding: 2px 8px; border-radius: 8px; background: #f43f5e; font-size: 14px; }",
].join("\n");

function copy(
	x: number,
	props: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
	return {
		x,
		y: 40,
		width: 240,
		height: 56,
		content: { kind: "component", component: "$badge", props },
	};
}

export const COMPONENTS: Example = {
	name: "components",
	fonts: [],
	steps: [
		{
			tool: "create_html_component",
			as: "badge",
			args: {
				name: "Badge",
				html: HTML,
				css: CSS,
				props: [
					{ name: "label", kind: "text", initial: "Default" },
					{ name: "hot", kind: "boolean", initial: false },
				],
			},
		},
		root("Components", { width: 560, height: 140 }, [
			copy(20, {}),
			copy(300, { label: "Changed", hot: true }),
		]),
	],
};
