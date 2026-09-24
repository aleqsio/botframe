# Custom components

This file is the plan for custom components. A component is a piece of HTML and CSS from a coding project. The user puts it on the canvas as a layer and changes its props in the inspector. STACK.md gives the rule: a component is markup that the model does not read.

## Rules

1. **A component is self-contained.** It is one template, one stylesheet, and one list of props. An agent copies only the components that a design uses, with only their CSS.
2. **Each state is a prop.** A component has no state, no effect, and no script. A checked box is `checked: true`. A hover state is a prop too, because the editor does not send pointer events into a component.
3. **The file holds the source.** The file opens with no coding project and no network, and shows the same pixels.
4. **A source never changes.** A source has a content address. A new version gets a new address. An instance keeps the version that it has until a person updates it.

## Version 1

Version 1 is in the pull request that adds this section.

### Format

A component is two or three files with one name, in one folder. The import reads each folder below the one that the user picks, except `node_modules` and hidden folders:

```
components/
  Checkbox.html   the template
  Checkbox.css    the stylesheet, optional
  Checkbox.json   the props, optional
```

`Checkbox.html`:

```html
<label class="checkbox {{size}} {{#checked}}is-checked{{/checked}}">
	<span class="box">{{#checked}}✓{{/checked}}</span>
	<span class="label">{{label}}</span>
</label>
```

`Checkbox.json` gives each prop and its first value. The type of the value gives the kind of the prop:

```json
{ "label": "Accept the terms", "checked": false, "size": ["md", "sm", "lg"] }
```

| Value | Kind | Inspector control |
| --- | --- | --- |
| text | text | text field |
| `true` or `false` | boolean | switch |
| list of text | choice, the first item is the first value | select |

The template has three tags. `{{name}}` writes the value, with HTML escape. `{{#name}}…{{/name}}` writes its content when the value is `true` or text that is not empty. `{{^name}}…{{/name}}` writes its content in the other case. The template has no loop, no expression, and no script. This makes rule 2 true by construction.

An import skips a component that has no HTML file, a section that is not closed, a JSON file that is not an object, or a prop value of a different type. It also skips a name that has an HTML file in two folders. The card tells the user which component it skipped and why.

`e2e/fixtures/components/` holds two examples.

### Document model

- `components` is a Loro map from the SHA-256 address of a source to the source: `{ name, html, css, props }`.
- `catalog` is a Loro map from a name to the address of its newest version. A second import of a changed component moves the name to the new address. The instances keep the old address.
- Undo does not remove a source or a catalog entry. Their commits have an origin that the undo manager skips. An undo on one peer must not remove a source that an instance of a different peer uses. An edit that is open when a source arrives commits first, as a normal step.
- Paste checks that the address of each source is its hash before the document adopts it.
- A layer has `content`: `{ kind: "none" }` or `{ kind: "component", component, props }`. The layer data holds `component` as one key and `props` as a map with one key for each prop. Two peers who change different props merge with no conflict.
- A layer stores only the props that a person set. The read gives the first value for each other prop, and for a value of the wrong kind.
- Copy puts the sources of the used components into the clipboard envelope. Paste into a different document adds them.
- There is no general asset store. The sources are small text, and the CRDT sends them to each peer. Build the asset store when images come, and move the sources into it with the same addresses.

### Canvas and export

- The layer element of an instance has an open shadow root. It holds the stylesheet, the filled template, and one `<slot>`.
- An editor rule turns off pointer events inside the shadow root. A click selects the layer. It does not toggle the checkbox.
- A new instance hugs its markup on both axes. The layout system already measures a hugged layer from the DOM, so the selection frame follows the component.
- The hit test takes an instance with a transparent fill, because the markup paints it.
- Copy as HTML writes `<template shadowrootmode="open">` with the same markup, without the editor rule.
- The CSP blocks inline event handlers and remote assets inside a component, as it does for the editor.

### User interface

- The file bar has a Components button next to Layers. The two cards share one place.
- The Components card has "Import folder" and the list of names. A click on a name puts an instance at the center of the view, in the selected frame.
- The inspector shows a Props section for an instance.

## Next steps

Each step is one pull request.

1. **Update an instance.** When the catalog has a newer version of a name, the inspector shows "Update". The update sets the new address and keeps each prop that the new version still has.
2. **Slots.** A template writes `{{> body}}` where it takes layers. The slot becomes `<slot name="body">`. A child layer of the instance gets `slot="body"`. The layout system already places a flow child, and the instance already hugs. The unnamed `<slot>` that version 1 writes takes a child with no slot, so no child is lost.
3. **Subcomponents and tokens.** A template writes `{{> Icon}}` to use an other component. The source lists the components and the token sheet that it uses. Copy and paste carry that list. One parsed stylesheet for each address goes into each shadow root with `adoptedStyleSheets`.
4. **React components.** A Vite plugin turns each component into the same format, so the editor never runs project code. It renders each text prop as its `{{name}}` tag. It renders the component once for each set of boolean and choice values, and joins the results into sections. It stops the build when a component uses state, an effect, a ref, or a context, or has too many sets to render.
5. **A query for agents.** One call gives the sources of the components in a selection and the props of each instance.

## Open questions

1. A component that styles `:root` gets no match in a shadow root. Does the import rewrite `:root` to `:host`, or does the user write `:host`?
2. Fonts and images inside a component need the asset store and a change to the CSP.
3. The Display section of the inspector changes the display of the instance element. Does an instance need it?
4. How many boolean and choice sets does a real component have? The limit in step 4 depends on it.
