(function() {
  'use strict';
  var Slug, TU;

  TU = require('../deps/traverse_util.js');

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
  this.Linefinder = class Linefinder {
    //---------------------------------------------------------------------------------------------------------
    constructor(cfg) {
      /* TAINT use intertype */
      var defaults;
      defaults = {
        document: document,
        box_element_name: 'div',
        box_class_name: 'box',
        xxx_height_factor: 1 / 2
      };
      this./* relative minimum height to recognize line step */cfg = Object.freeze({...defaults, ...cfg});
      this.state = {
        scroll_left: null,
        scroll_top: null
      };
      return void 0;
    }

    //---------------------------------------------------------------------------------------------------------
    _get_state() {
      if (this.scroll_left == null) {
        this.scroll_left = this.cfg.document.scrollLeft;
      }
      if (this.scroll_top == null) {
        this.scroll_top = this.cfg.document.scrollTop;
      }
      return this.state;
    }

    //---------------------------------------------------------------------------------------------------------
    _draw_box(rectangle, cfg) {
      var box, scroll_left, scroll_top;
      ({scroll_top, scroll_left} = this._get_state);
      cfg = {...this.cfg, ...cfg};
      box = this.cfg.document.createElement(cfg.element_name);
      box.style.top = this.cfg.scroll_top + rectangle.top + 'px';
      box.style.left = this.cfg.scroll_left + rectangle.left + 'px';
      box.style.width = rectangle.width - 1 + 'px'; // collapse borders
      box.style.height = rectangle.height + 'px';
      box.classList.add(cfg.class_name);
      this.cfg.document.body.appendChild(box);
      return box;
    }

    //---------------------------------------------------------------------------------------------------------
    draw_box(rectangle) {
      var box;
      box = this.cfg.document.createElement(this.cfg.box_element_name);
      box.style.top = this.cfg.document.documentElement.scrollTop + rectangle.top + 'px';
      box.style.left = this.cfg.document.documentElement.scrollLeft + rectangle.left + 'px';
      box.style.width = rectangle.width - 1 + 'px'; // collapse borders
      box.style.height = rectangle.height + 'px';
      box.classList.add(this.cfg.box_class_name);
      this.cfg.document.body.appendChild(box);
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
      var c1, c2, rectangles, text_node;
      text_node = node.childNodes[0];
      c1 = new TU.Cursor(text_node, 0, text_node.data);
      c2 = new TU.Cursor(text_node, 0, text_node.data);
      TU.TraverseUtil.setSelection(c1, c2);
      while (true) {
        rectangles = this._get_next_chr_rectangles(node, c1, c2);
        if (rectangles == null) {
          break;
        }
        yield* rectangles;
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
      var rectangle, ref, s;
      this._reset_line_walker(s = {});
      ref = this.walk_chr_rectangles_of_node(node);
      for (rectangle of ref) {
        if (s.count > 0 && rectangle.bottom - s.avg_bottom > s.avg_height * this.cfg.xxx_height_factor) {
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

}).call(this);

//# sourceMappingURL=linefinder.js.map