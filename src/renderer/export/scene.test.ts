import { describe, expect, it } from "vitest";
import { sceneOf } from "./scene";

const SCENE = { file: new Uint8Array([1]), target: "1@1", area: null, scale: 2, longSide: 2048 };

describe("sceneOf", () => {
	it("accepts a valid request", () => {
		expect(sceneOf(SCENE)).toEqual(SCENE);
	});

	it("refuses a request with no file, a bad scale, or a bad area", () => {
		expect(() => sceneOf({ ...SCENE, file: [1] })).toThrow(/not valid/u);
		expect(() => sceneOf({ ...SCENE, scale: 0 })).toThrow(/not valid/u);
		expect(() => sceneOf({ ...SCENE, area: { x: 0 } })).toThrow(/area/u);
		expect(() => sceneOf({ ...SCENE, target: 4 })).toThrow(/target/u);
	});
});
