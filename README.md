<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [`µ.LINE`: Distribute Lines across HTML iFrames](#%C2%B5line-distribute-lines-across-html-iframes)
  - [How it Works and What it Does](#how-it-works-and-what-it-does)
  - [`µ.LINE.Finder`](#%C2%B5linefinder)
    - [Configuration](#configuration)
  - [Structure of a Document](#structure-of-a-document)
  - [`µ.LINE.Distributor`](#%C2%B5linedistributor)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->



# `µ.LINE`: Distribute Lines across HTML iFrames

## How it Works and What it Does



## `µ.LINE.Finder`

### Configuration

* **`linemarker_tagname`** (`'mu-linemarker'`): Which HTML tag name to use when drawing a rectangle for each
  line of text. These are normally transparent (hence invisible) but can be made visible for debugging.

* **`linecover_tagname`** (`'mu-linecover'`): Which HTML tag name to use for the rectangles that are used to
  cover the first line of text in an `iframe` that is only partially visible. This will normally be without
  outline and opaque white to 'erase' the line in question, but can be made visible for debugging.

* **`debug_class_name`** (`'debug'`): Which CSS class name to use on the `body` element for debugging.

* **`line_step_factor`** (`1 / 2 `): The relative minimum height to recognize a line step. When iterating
  over single characters in the text, the distance `d = cy - ay` from the bottom of the character `cy` and
  the average bottom of the line rectangle `ay` is compared with the average character height `ch`; if
  distance `d` is found to exceed the product `ch * line_step_factor`, then it is assumed the current
  character is the first one of the next line.

* **`inject_stylesheet_after`** (`null`), **`inject_stylesheet_before`** (`null`): A prebuilt stylesheet can
  be injected into the current document. Since relative order of stylesheets is essential, two convenient
  methods are provided that accept either a CSS selector or a DOM element to determine the insertion point.
  For example, if you have a linked CSS-Reset stylesheet, you typically want to have that to be the first
  stylesheet with all the defaults; it would then be appropriate to call `finder.inject_stylesheet_after
  'link[href$="reset.css"]'` with the default styles for the `mu-linemarker` and `mu-linecover` elements.
  *Note* that the selector can match one or more elements; only the first match will be considered.

The CSS rules defined in the injected stylesheet for iFrames, linemarkers and linecovers are:

```css
/* for normal look: */
${linemarker_tagname} { ... }
${linecover_tagname} { ... }

/* for debugging: */
.${debug_class_name} iframe { ... }
.${debug_class_name} ${linemarker_tagname} { ... }
.${debug_class_name} ${linecover_tagname} { ... }
```

The debug button has these style selectors:

```css
button#${debug_button_id} { ... }
@media print { button#${debug_button_id} { ... } }
```

## Structure of a Document

* two HTML files:
  * the 'galley' document which contains a `<mu-galley>` element (user-defined tag with CSS `display:
    block;`); the nodes directly under this (and their child nodes) will be traversed by a `µ.LINE.Finder`
    instance in (hopefully) the intended reading order.
  * the 'main' document which contains any number of `<iframe>` elements the `src` attribute of which should
    point to the same galley document.

Sample code:

```coffee
µ.DOM.ready ->
  ### (1) ###
  cfg =
    paragraph_selector:         'mu-galley > p'
    iframe_selector:            'iframe'
    insert_stylesheet_after:    'link[href$="reset.css"]'
    insert_debug_button:        true
  #.........................................................................................................
  ### (2) ###
  if ( not µ.DOM.page_is_inside_iframe() ) and ( µ.DOM.select_first 'mu-galley', null )?
    distributor = new µ.LINE.Distributor cfg
    await distributor.mark_lines()
    return null
  #.........................................................................................................
  ### (3) ###
  return null unless  µ.LINE.Distributor.is_main_document()
  #.........................................................................................................
  ### (4) ###
  distributor = new µ.LINE.Distributor cfg
  await distributor.distribute_lines()
  return null
```

* **(1)** Configuration values, valid for both the galley and the main document.

* **(2)** Here we test whether the current document is the standalone galley document (i.e. not displayed
  inside an iframe). If so, instantiate a `LINE.Distributor` instance and mark lines; the linemarkers in the
  galley document are only for debugging and demonstration and so the call to `distributor.mark_lines()` may
  be skipped.

* **(3)** Do not continue unless we are in main document.

* **(4)** If in main document, instantiate a distributor and await the finishing of
  `distributor.distribute_lines()`. This call is asynchronous so can be watched live. The default style has
  transparent linemarkers and opaque white linecovers; when debugging is activated, their are displayed with
  translucent yellow and red backgrounds.

## `µ.LINE.Distributor`




