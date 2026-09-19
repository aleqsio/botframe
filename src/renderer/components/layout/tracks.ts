import type { DesignDocument } from "../../../document/document";
import type { Layer } from "../../../document/layer";
import type { LayerLayout, Track, TrackUnit } from "../../../document/layout";
import type { Measure } from "./measure";

export type TrackAxis = "columns" | "rows";

export interface TrackEdit {
	axis: TrackAxis;
	index: number;
}

export const MAX_TRACKS = 6;

export const FRACTION: Track = { value: 1, unit: "fr" };

export const TRACK_WORD: Readonly<Record<TrackAxis, string>> = {
	columns: "Column",
	rows: "Row",
};

const AUTO_FACTOR = 0.7;
const LEAST = 0.3;
const MOST = 3;
const PIXELS_PER_FACTOR = 80;
const PIXELS_PER_REM = 16;
const PERCENT_PER_FACTOR = 50;

const FACTOR: Readonly<Record<Exclude<TrackUnit, "auto">, number>> = {
	fr: 1,
	px: 1 / PIXELS_PER_FACTOR,
	rem: PIXELS_PER_REM / PIXELS_PER_FACTOR,
	"%": 1 / PERCENT_PER_FACTOR,
};

function clamp(value: number): number {
	return Math.min(MOST, Math.max(LEAST, value));
}

export function trackLabel(axis: TrackAxis, index: number): string {
	return `${TRACK_WORD[axis]} ${index + 1}`;
}

export function trackFactor(track: Track): number {
	return track.unit === "auto" ? AUTO_FACTOR : clamp(track.value * FACTOR[track.unit]);
}

export function factorTemplate(tracks: readonly Track[]): string {
	return tracks.map((track) => `${trackFactor(track)}fr`).join(" ");
}

export function addTrack(tracks: readonly Track[]): readonly Track[] {
	return tracks.length >= MAX_TRACKS ? tracks : [...tracks, FRACTION];
}

export function removeTrack(tracks: readonly Track[], index: number): readonly Track[] {
	return tracks.length < 2 ? [FRACTION] : tracks.filter((_track, at) => at !== index);
}

export function setTrack(tracks: readonly Track[], index: number, track: Track): readonly Track[] {
	return tracks.map((current, at) => (at === index ? track : current));
}

export function trackList(tracks: LayerLayout["tracks"], axis: TrackAxis): readonly Track[] {
	return axis === "columns" ? tracks.columns : tracks.rows;
}

export function writeTracks(
	doc: DesignDocument,
	layer: Layer,
	axis: TrackAxis,
	list: readonly Track[],
): void {
	const { tracks } = layer.layout;
	const next = axis === "columns" ? { ...tracks, columns: list } : { ...tracks, rows: list };
	doc.update(layer.id, { layout: { tracks: next } });
}

export function commitTracks(doc: DesignDocument): void {
	doc.commit("set tracks");
}

export function trackMeasure(track: Track): Measure<TrackUnit> {
	return track.unit === "auto" ? { value: 1, unit: "auto" } : track;
}

export function trackOf({ unit, value }: Measure<TrackUnit>): Track {
	return unit === "auto" ? { unit } : { value, unit };
}
