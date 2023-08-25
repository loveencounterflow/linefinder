(function() {
  'use strict';
  var Column, Distributor, Finder, Iframe_walker, Node_walker, Slug, Slug_walker, TU, Walker, after, defaults, defer, every, sleep, µ;

  //===========================================================================================================
  TU = require('../deps/traverse_util.js');

  µ = require('mudom');

  //===========================================================================================================
  every = (dts, f) => {
    return setInterval(f, dts * 1000);
  };

  after = (dts, f) => {
    return new Promise((resolve) => {
      return setTimeout((function() {
        return resolve(f());
      }), dts * 1000);
    });
  };

  sleep = (dts) => {
    return new Promise((resolve) => {
      return setTimeout(resolve, dts * 1000);
    });
  };

  defer = async(f = function() {}) => {
    await sleep(0);
    return (await f());
  };

  //===========================================================================================================
  /* TAINT to be integrated with types */
  defaults = {};

  //...........................................................................................................
  defaults.finder_cfg = {
    /* TAINT inconsistent naming */
    linemarker_tagname: 'mu-linemarker',
    linecover_tagname: 'mu-linecover',
    line_step_factor: 1 / 2
  };

  //...........................................................................................................
  /* relative minimum height to recognize line step */  defaults.distributor_cfg = {
    paragraph_selector: 'mu-galley > p',
    iframe_selector: 'iframe',
    iframe_scrolling: false,
    insert_debug_button: true,
    debug_class_name: 'debug',
    debug_button_id: 'mu-debugbutton',
    insert_paginate_button: true,
    paginate_class_name: 'paginate',
    paginate_button_id: 'mu-paginatebutton',
    insert_stylesheet_after: null,
    insert_stylesheet_before: null
  };

  defaults.distributor_cfg = {...defaults.finder_cfg, ...defaults.distributor_cfg};

  //===========================================================================================================
  Slug = class Slug {
    constructor({llnr, rlnr, node, rectangle}) {
      this.llnr = llnr;
      this.rlnr = rlnr;
      this.node = node;
      this.rectangle = rectangle;
      return void 0;
    }

  };

  //===========================================================================================================
  Finder = class Finder {
    //---------------------------------------------------------------------------------------------------------
    constructor(cfg) {
      /* TAINT use intertype */
      this.cfg = Object.freeze({...defaults.finder_cfg, ...cfg});
      return void 0;
    }

    //---------------------------------------------------------------------------------------------------------
    draw_box(rectangle) {
      var box;
      box = document.createElement(this.cfg.linemarker_tagname);
      box.style.top = rectangle.top + 'px';
      box.style.left = rectangle.left + 'px';
      box.style.width = rectangle.width - 1 + 'px'; // collapse borders
      box.style.height = rectangle.height + 'px';
      document.body.appendChild(box);
      return box;
    }

    //---------------------------------------------------------------------------------------------------------
    /* TAINT to be merged with `draw_box()` in new method */
    xxx_draw_line_cover(rectangle) {
      var box;
      box = document.createElement(this.cfg.linecover_tagname);
      box.style.top = rectangle.top + 'px';
      box.style.left = rectangle.left + 'px';
      box.style.width = rectangle.width - 1 + 'px'; // collapse borders
      box.style.height = rectangle.height + 'px';
      document.body.appendChild(box);
      return box;
    }

    //---------------------------------------------------------------------------------------------------------
    _get_next_chr_rectangles(node, c1, c2) {
      var range, selection;
      TU.TraverseUtil.getNextChar(c1, c2, [], false);
      selection = TU.TraverseUtil.setSelection(c1, c2);
      range = selection.getRangeAt(0);
      if (!node.contains(range.startContainer.parentNode)) {
        return null;
      }
      if (!node.contains(range.endContainer.parentNode)) {
        return null;
      }
      return range.getClientRects();
    }

    //---------------------------------------------------------------------------------------------------------
    * walk_chr_rectangles_of_node(node) {
      var c1, c2, rectangle, rectangles, text_node;
      if ((text_node = node.childNodes[0]) == null) {
        return null;
      }
      c1 = new TU.Cursor(text_node, 0, text_node.data);
      c2 = new TU.Cursor(text_node, 0, text_node.data);
      TU.TraverseUtil.setSelection(c1, c2);
      while (true) {
        rectangles = this._get_next_chr_rectangles(node, c1, c2);
        if (rectangles == null) {
          break;
        }
        for (rectangle of rectangles) {
          yield new DOMRect(rectangle.left + document.documentElement.scrollLeft, rectangle.top + document.documentElement.scrollTop, rectangle.width, rectangle.height); // left // top // width // height
        }
      }
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    _reset_line_walker(s) {
      s.min_top = +2e308;
      s.max_bottom = -2e308;
      s.min_left = +2e308;
      s.max_right = -2e308;
      s.avg_height = 0;
      s.avg_bottom = 0;
      s.count = 0;
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    * walk_line_rectangles_of_node(node) {
      var rectangle, ref1, s;
      this._reset_line_walker(s = {});
      ref1 = this.walk_chr_rectangles_of_node(node);
      for (rectangle of ref1) {
        if (s.count > 0 && rectangle.bottom - s.avg_bottom > s.avg_height * this.cfg.line_step_factor) {
          yield new DOMRect(s.min_left, s.min_top, s.max_right - s.min_left, s.max_bottom - s.min_top); // left // top // width // height
          this._reset_line_walker(s);
        }
        //.......................................................................................................
        // draw_box rectangle
        s.count++;
        s.min_top = Math.min(s.min_top, rectangle.top);
        s.max_bottom = Math.max(s.max_bottom, rectangle.bottom);
        s.min_left = Math.min(s.min_left, rectangle.left);
        s.max_right = Math.max(s.max_right, rectangle.right);
        s.avg_height = (s.avg_height * (s.count - 1) / s.count) + (rectangle.height * 1 / s.count);
        s.avg_bottom = (s.avg_bottom * (s.count - 1) / s.count) + (rectangle.bottom * 1 / s.count);
      }
      //.........................................................................................................
      if (s.count > 0) {
        yield new DOMRect(s.min_left, s.min_top, s.max_right - s.min_left, s.max_bottom - s.min_top); // left // top // width // height
      }
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    * walk_slugs_of_node(node) {
      var i, idx, len, line_count, llnr, rectangle, rectangles, rlnr;
      rectangles = [...(this.walk_line_rectangles_of_node(node))];
      line_count = rectangles.length;
      for (idx = i = 0, len = rectangles.length; i < len; idx = ++i) {
        rectangle = rectangles[idx];
        llnr = idx + 1;
        rlnr = line_count - idx;
        yield new Slug({llnr, rlnr, node, rectangle});
      }
      return null;
    }

  };

  //===========================================================================================================
  Column = class Column {
    //---------------------------------------------------------------------------------------------------------
    constructor(ø_iframe, ø_slug) {
      this._ø_iframe = ø_iframe;
      this.first_slug = ø_slug.value;
      this.top = ø_slug.value.rectangle.top;
      this.height = 0;
      return void 0;
    }

    //---------------------------------------------------------------------------------------------------------
    scroll_to_first_line() {
      this._ø_iframe.window.scrollTo({
        top: this.top
      });
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    set_height_from_slug(ø_slug) {
      this.height = ø_slug.value.rectangle.bottom - this.top;
      return this.height;
    }

  };

  //===========================================================================================================
  Walker = class Walker {
    /* TAINT should add `next` method (or well-known symbol) to make it an iterator */
    //---------------------------------------------------------------------------------------------------------
    constructor(iterator, stop = null) {
      this._iterator = iterator;
      this._stop = stop;
      this.done = false;
      this.value = stop;
      return void 0;
    }

    //---------------------------------------------------------------------------------------------------------
    * [Symbol.iterator]() {
      while (this.step() !== this._stop) {
        yield this;
      }
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    step() {
      var done, value;
      ({value, done} = this._iterator.next());
      if (done) {
        this.done = true;
        this.value = this._stop;
        return this._stop;
      }
      this.value = value;
      return value;
    }

  };

  //===========================================================================================================
  Node_walker = class Node_walker extends Walker {};

  Slug_walker = class Slug_walker extends Walker {};

  //===========================================================================================================
  Iframe_walker = class Iframe_walker extends Walker {
    //---------------------------------------------------------------------------------------------------------
    constructor(iterator, stop = null, cfg) {
      super(iterator, stop);
      this.height = null;
      // @galley_document        = null
      this.window = null;
      this.µ = null;
      this.LINEFINDER = null;
      this.draw_box = null;
      this.draw_line_cover = null;
      this.cfg = cfg;
      return void 0;
    }

    //---------------------------------------------------------------------------------------------------------
    step() {
      /* TAINT may want to return `linefinder` itself */
      var iframe_linefinder;
      super.step();
      if (this.done) {
        return this._stop;
      }
      if (!this.cfg.iframe_scrolling) {
        µ.DOM.set(this.value, 'scrolling', 'no');
      }
      this.height = µ.DOM.get_height(this.value);
      // @galley_document        = @value.contentDocument
      this.window = this.value.contentWindow;
      this.µ = this.window.require('mudom');
      this.LINEFINDER = this.window.require('linefinder');
      iframe_linefinder = new this.LINEFINDER.Finder(this.cfg);
      this.draw_box = iframe_linefinder.draw_box.bind(iframe_linefinder);
      this.draw_line_cover = iframe_linefinder.xxx_draw_line_cover.bind(iframe_linefinder);
      return this.value;
    }

  };

  //===========================================================================================================
  Distributor = class Distributor {
    //---------------------------------------------------------------------------------------------------------
    static is_galley_document() {
      return (µ.DOM.page_is_inside_iframe()) && ((µ.DOM.select_first('galley', null)) != null);
    }

    static is_main_document() {
      return (!µ.DOM.page_is_inside_iframe()) && ((µ.DOM.select_first('iframe', null)) != null);
    }

    //---------------------------------------------------------------------------------------------------------
    constructor(cfg) {
      var ref1, ø_iframe;
      /* TAINT use `intertype` */
      this.cfg = Object.freeze({...defaults.distributor_cfg, ...cfg});
      if (this.cfg.insert_stylesheet_after != null) {
        this._insert_stylesheet('after', this.cfg.insert_stylesheet_after);
      }
      if (this.cfg.insert_stylesheet_before != null) {
        this._insert_stylesheet('before', this.cfg.insert_stylesheet_before);
      }
      ref1 = this.new_iframe_walker();
      for (ø_iframe of ref1) {
        new ø_iframe.LINEFINDER.Distributor({
          ...this.cfg,
          insert_debug_button: false,
          insert_paginate_button: false
        });
      }
      if (this.cfg.insert_debug_button) {
        this.insert_debug_button();
      }
      if (this.cfg.insert_paginate_button) {
        this.insert_paginate_button();
      }
      return void 0;
    }

    //---------------------------------------------------------------------------------------------------------
    new_iframe_walker() {
      return new Iframe_walker((µ.DOM.select_all(this.cfg.iframe_selector)).values(), null, this.cfg);
    }

    //---------------------------------------------------------------------------------------------------------
    async distribute_lines() {
      var column, linefinder, ø_iframe, ø_node, ø_slug;
      //.......................................................................................................
      /* Allow user-scrolling for demo */
      // µ.DOM.set ø_iframe.value, 'scrolling', 'true' for ø_iframe.value in µ.DOM.select_all 'ø_iframe.value'
      //.......................................................................................................
      ø_iframe = this.new_iframe_walker();
      ø_iframe.step();
      ø_node = new Node_walker((ø_iframe.µ.DOM.select_all(this.cfg.paragraph_selector)).values());
      linefinder = new ø_iframe.LINEFINDER.Finder(this.cfg);
      column = null;
      while (true) {
        if (ø_iframe.done) {
          //.......................................................................................................
          break;
        }
        //.....................................................................................................
        if (ø_node.step() == null) {
          break; // might want to mark galleys without content at this point
        }
        //.....................................................................................................
        await defer();
        ø_slug = new Slug_walker(linefinder.walk_slugs_of_node(ø_node.value));
        while (true) {
          if (ø_slug.step() == null) {
            break;
          }
          await defer();
          //...................................................................................................
          if ((column != null ? column.first_slug : void 0) == null) {
            column = new Column(ø_iframe, ø_slug);
            column.scroll_to_first_line();
          }
          //...................................................................................................
          column.set_height_from_slug(ø_slug);
          if (ø_iframe.height > column.height) {
            ø_iframe.draw_box(ø_slug.value.rectangle);
            continue;
          }
          //...................................................................................................
          ø_iframe.draw_line_cover(ø_slug.value.rectangle);
          column = null;
          if (ø_iframe.step() == null) {
            break;
          }
          ø_iframe.draw_box(ø_slug.value.rectangle);
          column = new Column(ø_iframe, ø_slug);
          column.scroll_to_first_line();
        }
      }
      //.......................................................................................................
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    async mark_lines() {
      var linefinder, ø_node, ø_slug;
      ø_node = new Node_walker((µ.DOM.select_all(this.cfg.paragraph_selector)).values());
      linefinder = new Finder(this.cfg);
      while (true) {
        //.....................................................................................................
        //.......................................................................................................
        if (ø_node.step() == null) {
          break; // might want to mark galleys without content at this point
        }
        //.....................................................................................................
        await defer();
        ø_slug = new Slug_walker(linefinder.walk_slugs_of_node(ø_node.value));
        while (true) {
          if (ø_slug.step() == null) {
            break;
          }
          await defer();
          linefinder.draw_box(ø_slug.value.rectangle);
        }
      }
      //.......................................................................................................
      return null;
    }

    //=========================================================================================================
    // INSERTION OF STYLESHEET, BUTTONS
    //---------------------------------------------------------------------------------------------------------
    insert_stylesheet_before(element_or_selector) {
      return this._insert_stylesheet('before', element_or_selector);
    }

    insert_stylesheet_after(element_or_selector) {
      return this._insert_stylesheet('after', element_or_selector);
    }

    //---------------------------------------------------------------------------------------------------------
    _insert_stylesheet(where, ref) {
      /* TAINT code duplication */
      var element, stylesheet;
      element = typeof ref === 'string' ? µ.DOM.select_first(ref) : ref;
      stylesheet = this._get_stylesheet();
      switch (where) {
        case 'before':
          µ.DOM.insert_before(element, stylesheet);
          break;
        case 'after':
          µ.DOM.insert_after(element, stylesheet);
          break;
        default:
          `unknown location ${µ.TEXT.rpr(where)}`;
      }
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    _get_stylesheet() {
      /* TAINT must honour element, class name configuration */
      /* https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleSheet/insertRule */
      return µ.DOM.new_stylesheet(`/* stylesheet inserted by mudom \`LINE.Distributor\` */
.${this.cfg.debug_class_name} iframe {
  outline:                1px dotted red; }

${this.cfg.linemarker_tagname} {
  background-color:       transparent;
  pointer-events:         none;
  position:               absolute; }

.${this.cfg.debug_class_name} ${this.cfg.linemarker_tagname} {
  background-color:       rgba( 255, 248, 0, 0.2 );
  outline:                1px solid rgba( 255, 0, 0, 0.2 );
  mix-blend-mode:         multiply; }

${this.cfg.linecover_tagname} {
  background-color:       white;
  pointer-events:         none;
  position:               absolute; }

.${this.cfg.debug_class_name} ${this.cfg.linecover_tagname} {
  background-color:       rgba( 255, 0, 0, 0.2 );
  mix-blend-mode:         multiply; }

/* ### TAINT replace magic numbers */
/* ### TAINT consolidate button styles */
button#${this.cfg.debug_button_id} {
  position:               fixed;
  top:                    5mm;
  left:                   5mm; }

button#${this.cfg.paginate_button_id} {
  position:               fixed;
  top:                    5mm;
  left:                   25mm; }

@media print {
  button#${this.cfg.debug_button_id}, button#${this.cfg.paginate_button_id} {
    display: none !important; } }`);
    }

    //---------------------------------------------------------------------------------------------------------
    insert_debug_button() {
      µ.DOM.insert_as_first(µ.DOM.select_first('body'), this._get_debug_button());
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    _get_debug_button() {
      var R;
      R = µ.DOM.parse_one("<button>DEBUG</button>");
      µ.DOM.set(R, 'id', this.cfg.debug_button_id);
      µ.DOM.on(R, 'click', () => {
        var ref1, ø_iframe;
        µ.DOM.toggle_class(µ.DOM.select_first('body'), this.cfg.debug_class_name);
        ref1 = this.new_iframe_walker();
        for (ø_iframe of ref1) {
          ø_iframe.µ.DOM.toggle_class(ø_iframe.µ.DOM.select_first('body'), this.cfg.debug_class_name);
        }
        return null;
      });
      return R;
    }

    //---------------------------------------------------------------------------------------------------------
    insert_paginate_button() {
      µ.DOM.insert_as_first(µ.DOM.select_first('body'), this._get_paginate_button());
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    _get_paginate_button() {
      var R;
      R = µ.DOM.parse_one("<button>PAGINATE</button>");
      µ.DOM.set(R, 'id', this.cfg.paginate_button_id);
      µ.DOM.on(R, 'click', () => {
        var ref1, ø_iframe;
        µ.DOM.toggle_class(µ.DOM.select_first('body'), this.cfg.paginate_class_name);
        ref1 = this.new_iframe_walker();
        for (ø_iframe of ref1) {
          ø_iframe.µ.DOM.toggle_class(ø_iframe.µ.DOM.select_first('body'), this.cfg.paginate_class_name);
        }
        return null;
      });
      return R;
    }

  };

  module.exports = {Finder, Distributor};

  // intersectionObserver = new IntersectionObserver ( entries ) =>
//   # If intersectionRatio is 0, the target is out of view
//   # and we do not need to do anything.
//   return if entries[ 0 ].intersectionRatio <= 0
//   console.log("Loaded new items");
//   return null
// # start observing
// intersectionObserver.observe document.querySelectorAll "p"

}).call(this);

//# sourceMappingURL=main.js.map