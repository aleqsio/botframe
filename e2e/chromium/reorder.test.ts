import { expect, test } from "@playwright/test";
import { at, idOf, layerById } from "../support";
import { drawRowOfThree, openRenderer, rectOf } from "./support";

const FIRST_CHILD = { x: 330, y: 80 };
const PAST_THE_SECOND = 70;

test("a reorder inside a row keeps the child under the pointer after the reorder", async ({
	page,
}) => {
	const { origin } = await openRenderer(page);
	const children = await drawRowOfThree(page, origin);
	const id = await idOf(children.first());
	const first = layerById(page, id);
	const grab = at(origin, FIRST_CHILD);
	const before = await rectOf(first);

	await page.mouse.move(grab.x, grab.y);
	await page.mouse.down();
	await page.mouse.move(grab.x + PAST_THE_SECOND, grab.y);

	await expect(children.nth(1)).toHaveAttribute("data-layer-id", id);
	await expect.poll(async () => (await rectOf(first)).x - before.x).toBe(PAST_THE_SECOND);

	await page.mouse.up();
});
