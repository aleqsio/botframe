import { useState } from "react";
import type { ReactElement } from "react";
import { importFolder } from "../componentImport";
import { placeComponent } from "../componentPlace";
import type { Placement } from "../componentPlace";
import { useComponentRows } from "../useDocument";

const FOLDER_TIP = "Each HTML component is a Name.html file, with Name.css and Name.json.";

function EmptyNote(): ReactElement {
	return (
		<p className="panel-note">
			Make a component from a frame, or{" "}
			<span className="note-tip" title={FOLDER_TIP}>
				import a folder
			</span>
			.
		</p>
	);
}

function ImportButton({ onImport }: { onImport: (files: readonly File[]) => void }): ReactElement {
	return (
		<label className="pill-button component-import">
			Import folder
			<input
				hidden
				multiple
				onChange={(event) => {
					onImport([...(event.target.files ?? [])]);
					event.target.value = "";
				}}
				ref={(input) => {
					if (input !== null) {
						input.webkitdirectory = true;
					}
				}}
				type="file"
			/>
		</label>
	);
}

export function ComponentList(placement: Placement): ReactElement {
	const rows = useComponentRows(placement.doc);
	const [report, setReport] = useState<readonly string[]>([]);

	return (
		<aside aria-label="Components" id="components">
			<ImportButton
				onImport={(files) => {
					importFolder(placement.doc, files).then(setReport, (error: unknown) => {
						setReport([`The import stopped. ${String(error)}`]);
					});
				}}
			/>
			{report.map((line) => (
				<p className="panel-note" key={line}>
					{line}
				</p>
			))}
			{rows.length === 0 ? <EmptyNote /> : null}
			<ul className="layer-list">
				{rows.map((row) => (
					<li key={row.id}>
						<button
							className="layer-row"
							onClick={() => {
								placeComponent(placement, row);
							}}
							title={row.body.kind === "html" ? "Code component" : "Component"}
							type="button"
						>
							<span
								className={`layer-glyph layer-glyph-${row.body.kind === "html" ? "code" : "component"}`}
							/>
							<span className="component-row-name">{row.name}</span>
							<span className="component-row-count">{row.copies}</span>
						</button>
					</li>
				))}
			</ul>
		</aside>
	);
}
