# Components

This file tells how components work. Issue #103 gives the full model. Read it before you change the model.

A component has one of two bodies:

- **HTML.** A piece of HTML and CSS from a coding project. The model does not read the markup (STACK.md).
- **Layers.** A group of layers that the user makes from a frame. The layers are real layers in the document.

Each component has props. A prop is a variable of the component, and each copy can set it. The two bodies use one system of variables, so there are not two systems.

## Rules

1. **A component is self-contained.** An HTML component is one template, one stylesheet, and one list of props. An agent copies only the components that a design uses, with only their CSS.
2. **Each state is a prop.** A component has no state, no effect, and no script. A checked box is `checked: true`.
3. **The file holds the source.** The file opens with no coding project and no network, and shows the same pixels.
4. **A source never changes.** An HTML source has a content address. A new version gets a new address. A second import of a name points the component at the new address, and each copy shows the new version.
5. **There is no main copy.** Each copy of a component shows the same layers. An edit inside one copy changes each copy. A copy keeps only its place, its size, and its props.

## Variables

- A variable has an id, a name, a type, and a default. The types are color, length, number, text, boolean, and choice. A choice has a list of options.
- A variable belongs to a scope. The scopes are the document and each component. A variable of a component is a **prop**. A document variable is a token. A layer has no variables.
- Each value is one of three kinds. The same kind of value is used for a layer field, for the default of a variable, and for a prop of a copy:

| Kind | Stored as | Example |
| --- | --- | --- |
| Value | a literal | `#ff3b30` |
| Variable | `{ var: id }` | the `accent` prop |
| Condition | `{ when: [{ test, is, result }], else }` | when `status` is `failed` → `danger`, else `#1f7a4d` |

- A condition tests one variable for one value in each case. The first case that matches gives its result. The `else` result is used when no case matches. A result is a value or a variable.
- A field of a layer can **bind** to a variable or a condition. The bound keys are fill, x, y, width, height, rotation, corner radius, corner smoothing, and clip. A plain value in the field removes the binding.
- A binding holds the id of each variable, not the name. A rename changes no binding.

### Resolution

The model resolves a variable from the innermost copy out, as a context:

1. A copy that sets the variable gives the value. A variable or a condition in that value resolves from the next copy out.
2. At a copy of the component that declares the variable, the default gives the value. The default resolves at that copy, so a condition in a default can test a different prop of the same copy.
3. A document variable resolves its default from the innermost copy. So a copy that sets a document `mode` changes each token that tests `mode` inside it.

A prop is visible only inside its component. The resolver stops at a depth of 32. A value of the wrong type gives the default.

A place key (x, y, width, height, rotation) of a copy resolves from the copy above it, because the copy sets its own place.

### Inspector

- Each field that can bind has a small button at its right end. A blue hexagon means a plain value. A purple hexagon means a variable. A purple branch means a condition.
- A click on the button opens a menu. The menu has a search for variables of the type of the field: first the props of the components around the layer, then the document variables. It also has "Add a condition", "Make a prop of …" or "Make a document variable", and "Use a plain value".
- A field with a variable shows a chip and the value now. A field with a condition shows the cases on one line. A click on the branch opens the editor of the cases.
- A copy shows "Props · this copy". A prop that the copy does not set is dim and shows the default. The reset button removes the value of the copy.
- "Props · all copies" gives the name, the type, the options, and the default of each prop, and the buttons that add a prop.
- The page shows "Document variables" in the same form.

## Layer components

### Actions

| Action | Result |
| --- | --- |
| Make component | The frame becomes the first copy. Its children move into a hidden definition. |
| Duplicate | A new copy of the same component. |
| Disconnect | The copy gets a new component with its own definition and variables. |
| Duplicate as new | Duplicate, then Disconnect. |
| Make frame | The copy becomes a frame with real children. A binding that uses a prop becomes its value. |

When the last copy goes away, the component list does not show the component. Undo gives the copy back.

### Document model

- `components` is a Loro map from an id to `{ name, kind, source | root, scope }`. The kind is `html` or `layers`.
- A layer body is a root node in the layer tree with the data key `definition`. The canvas does not show it.
- A copy is a layer with `component` and `props`. The copy has no children in the tree. Its children are the children of the definition root.
- The id of a layer inside a copy is a path: `copy~copy~node`. Two copies of one component give two ids for one node.
- A copy reads its place keys from its own node, and each other key from the definition root. A write goes to the same place.
- A move into or out of a copy is refused, so each id stays the same. A copy of a component inside its own definition is refused.
- A scope is a mergeable map with `variables`. Each variable is a JSON value: `{ name, type, initial, options }`.
- A copy stores its props in the mergeable map `props`. A layer stores its bindings in the mergeable map `bindings`. Two peers that change different props or different fields merge with no conflict.
- Sources and imports commit with an origin that the undo manager skips.
- Copy puts each used component into the clipboard envelope, with its body and its variables. Paste into a different document adds them.

## HTML components

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

- `sources` is a Loro map from the SHA-256 address of a source to the source: `{ name, html, css, props }`.
- An import makes a component of kind `html` for each name, or points the existing component at the new address. Each prop of the source becomes a prop of the component. The inspector does not let the user rename or remove these props.
- Paste checks that the address of each source is its hash before the document adopts it.
- A copy stores only the props that a person set. The resolver gives the value of each other prop.
- The sources are small text, and the CRDT sends them to each peer. They do not go into the asset store.

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
- The Components card shows each component and its number of copies.
- The inspector shows these sections:
  - For a frame: "Make component".
  - For a copy: the actions, "Props · this copy", and "Props · all copies".
  - For the page: "Document variables".
- Each field that can bind has its own button. The Inspector section above tells how it works.

## Next steps

Each step is one pull request.

1. **More tests in a condition.** A case tests one variable for one value. Add "is not", "and", and ranges of numbers when a design needs them.
2. **Slots.** A template writes `{{> body}}` where it takes layers. The slot becomes `<slot name="body">`. A child layer of the instance gets `slot="body"`. The layout system already places a flow child, and the instance already hugs. The unnamed `<slot>` that version 1 writes takes a child with no slot, so no child is lost.
3. **Subcomponents and tokens.** A template writes `{{> Icon}}` to use an other component. The source lists the components and the token sheet that it uses. Copy and paste carry that list. One parsed stylesheet for each address goes into each shadow root with `adoptedStyleSheets`.
4. **React components.** A Vite plugin turns each component into the same format, so the editor never runs project code. It renders each text prop as its `{{name}}` tag. It renders the component once for each set of boolean and choice values, and joins the results into sections. It stops the build when a component uses state, an effect, a ref, or a context, or has too many sets to render.
5. **A query for agents.** One call gives the sources of the components in a selection and the props of each instance.

## Open questions

1. A component that styles `:root` gets no match in a shadow root. Does the import rewrite `:root` to `:host`, or does the user write `:host`?
2. Fonts and images inside a component need the asset store and a change to the CSP.
3. The Display section of the inspector changes the display of the instance element. Does an instance need it?
4. How many boolean and choice sets does a real component have? The limit in step 4 depends on it.
