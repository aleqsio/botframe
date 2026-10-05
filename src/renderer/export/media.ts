const VIDEO_WAIT_MS = 3000;
const IMAGE_URL = /url\("([^"]+)"\)/gu;

function imageUrls(stage: HTMLElement): readonly string[] {
	const urls = Array.from(stage.querySelectorAll("*"), (element) =>
		Array.from(getComputedStyle(element).backgroundImage.matchAll(IMAGE_URL), (match) => match[1]),
	);
	return [...new Set(urls.flat())].filter((url) => url !== undefined);
}

function decoded(url: string): Promise<unknown> {
	const image = new Image();
	image.src = url;
	return image.decode().catch(() => null);
}

function videoReady(video: HTMLVideoElement): Promise<void> {
	if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
		return Promise.resolve();
	}
	return new Promise((resolve) => {
		const timer = setTimeout(resolve, VIDEO_WAIT_MS);
		video.addEventListener(
			"loadeddata",
			() => {
				clearTimeout(timer);
				resolve();
			},
			{ once: true },
		);
	});
}

export async function mediaLoaded(stage: HTMLElement): Promise<void> {
	await Promise.all([
		document.fonts.ready,
		...imageUrls(stage).map((url) => decoded(url)),
		...Array.from(stage.querySelectorAll("video"), (video) => videoReady(video)),
	]);
}
