import { describe, expect, it } from "vitest";
import { REASONS, isComponentFile, readComponentFolder } from "./componentFiles";

describe("readComponentFolder", () => {
	it("makes one component from the HTML, CSS, and JSON files with one name, in any folder", () => {
		const read = readComponentFolder([
			{ path: "kit/Button/Button.css", text: ".b{}" },
			{ path: "kit/Button/Button.html", text: "<button>{{label}}</button>" },
			{ path: "kit/Button/Button.json", text: '{ "label": "Save" }' },
			{ path: "kit/Badge.html", text: "<b></b>" },
		]);

		expect(read.skipped).toEqual([]);
		expect(read.sources).toEqual([
			{ name: "Badge", html: "<b></b>", css: "", props: [] },
			{
				name: "Button",
				html: "<button>{{label}}</button>",
				css: ".b{}",
				props: [{ name: "label", kind: "text", initial: "Save" }],
			},
		]);
	});

	it("skips a component with no HTML file, an open section, bad JSON, or a prop it cannot edit", () => {
		const read = readComponentFolder([
			{ path: "Lonely.css", text: "" },
			{ path: "Open.html", text: "{{#on}}" },
			{ path: "List.html", text: "" },
			{ path: "List.json", text: "[1, 2]" },
			{ path: "Count.html", text: "" },
			{ path: "Count.json", text: '{ "count": 3 }' },
		]);

		expect(read.sources).toEqual([]);
		expect(read.skipped).toEqual([
			{ name: "Count", reason: REASONS.badProp("count") },
			{ name: "List", reason: REASONS.badJson },
			{ name: "Lonely", reason: REASONS.noTemplate },
			{ name: "Open", reason: REASONS.openSection },
		]);
	});

	it("skips a name that two folders use, and the files in node_modules and hidden folders", () => {
		const read = readComponentFolder([
			{ path: "app/Button.html", text: "<button></button>" },
			{ path: "legacy/Button.html", text: "<button></button>" },
			{ path: "app/node_modules/pkg/Badge.html", text: "<b></b>" },
			{ path: "app/.cache/Tag.html", text: "<i></i>" },
			{ path: "app/Tag.html", text: "<i></i>" },
		]);

		expect(read.sources.map((source) => source.name)).toEqual(["Tag"]);
		expect(read.skipped).toEqual([{ name: "Button", reason: REASONS.twoFolders }]);
	});

	it("imports a component when a file with its name is in a folder with no HTML file, and reports that file", () => {
		const read = readComponentFolder([
			{ path: "app/Tag.html", text: "<i></i>" },
			{ path: "app/Tag.css", text: "i{}" },
			{ path: "notes/Tag.json", text: "{}" },
		]);

		expect(read.sources).toEqual([{ name: "Tag", html: "<i></i>", css: "i{}", props: [] }]);
		expect(read.skipped).toEqual([{ name: "Tag", reason: REASONS.noTemplate }]);
	});
});

describe("isComponentFile", () => {
	it("takes HTML, CSS, and JSON files only", () => {
		expect(
			["a/B.html", "B.css", "B.json", "B.png", "node_modules/B.html"].map((path) =>
				isComponentFile(path),
			),
		).toEqual([true, true, true, false, false]);
	});
});
