import { useState } from "react";
import type { ReactElement } from "react";
import { importFolder } from "../componentImport";
import { placeComponent } from "../componentPlace";
import type { Placement } from "../componentPlace";
import { useCatalog } from "../useDocument";

const EMPTY_NOTE =
	"Import a folder. Each component is a Name.html file, with Name.css and Name.json.";

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
	const catalog = useCatalog(placement.doc);
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
			{[...report, ...(catalog.length === 0 ? [EMPTY_NOTE] : [])].map((line) => (
				<p className="component-note" key={line}>
					{line}
				</p>
			))}
			<ul className="layer-list">
				{catalog.map((entry) => (
					<li key={entry.name}>
						<button
							className="layer-row"
							onClick={() => {
								placeComponent(placement, entry);
							}}
							type="button"
						>
							<span className="layer-glyph layer-glyph-component" />
							{entry.name}
						</button>
					</li>
				))}
			</ul>
		</aside>
	);
}
