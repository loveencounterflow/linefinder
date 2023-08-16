
'use strict'

#===========================================================================================================
TU                        = require '../deps/traverse_util.js'
µ                         = require 'mudom'


#===========================================================================================================
every  = ( dts, f  ) =>                            setInterval f,                  dts * 1000
after  = ( dts, f  ) => new Promise ( resolve ) => setTimeout  ( -> resolve f() ), dts * 1000
sleep  = ( dts     ) => new Promise ( resolve ) => setTimeout  resolve,            dts * 1000
defer  = ( f = ->  ) => await sleep 0; return await f()

#===========================================================================================================
### TAINT to be integrated with types ###
defaults = {}
#...........................................................................................................
defaults.finder_cfg =
  ### TAINT inconsistent naming ###
  linemarker_tagname:       'mu-linemarker'
  linecover_tagname:        'mu-linecover'
  line_step_factor:         1 / 2 ### relative minimum height to recognize line step ###
#...........................................................................................................
defaults.distributor_cfg =
  paragraph_selector:       'mu-galley > p'
  iframe_selector:          'iframe'
  iframe_scrolling:         false
  insert_debug_button:      true
  debug_class_name:         'debug'
  debug_button_id:          'mu-debugbutton'
  insert_stylesheet_after:  null
  insert_stylesheet_before: null
defaults.distributor_cfg = { defaults.finder_cfg..., defaults.distributor_cfg..., }


#===========================================================================================================
class Slug
  constructor: ({ llnr, rlnr, node, rectangle, }) ->
    @llnr       = llnr
    @rlnr       = rlnr
    @node       = node
    @rectangle  = rectangle
    return undefined


#===========================================================================================================
class Finder

  #---------------------------------------------------------------------------------------------------------
  constructor: ( cfg ) ->
    ### TAINT use intertype ###
    @cfg = Object.freeze { defaults.finder_cfg..., cfg..., }
    return undefined

  #---------------------------------------------------------------------------------------------------------
  draw_box: ( rectangle ) ->
    box               = document.createElement @cfg.linemarker_tagname
    box.style.top     =  rectangle.top       + 'px'
    box.style.left    =  rectangle.left      + 'px'
    box.style.width   =  rectangle.width - 1 + 'px' # collapse borders
    box.style.height  =  rectangle.height    + 'px'
    document.body.appendChild box
    return box

  #---------------------------------------------------------------------------------------------------------
  ### TAINT to be merged with `draw_box()` in new method ###
  xxx_draw_line_cover: ( rectangle ) ->
    box               = document.createElement @cfg.linecover_tagname
    box.style.top     =  rectangle.top       + 'px'
    box.style.left    =  rectangle.left      + 'px'
    box.style.width   =  rectangle.width - 1 + 'px' # collapse borders
    box.style.height  =  rectangle.height    + 'px'
    document.body.appendChild box
    return box

  #---------------------------------------------------------------------------------------------------------
  _get_next_chr_rectangles: ( node, c1, c2 ) ->
    TU.TraverseUtil.getNextChar c1, c2, [], false
    selection   = TU.TraverseUtil.setSelection c1, c2
    range       = selection.getRangeAt 0
    return null unless node.contains range.startContainer.parentNode
    return null unless node.contains range.endContainer.parentNode
    return range.getClientRects()

  #---------------------------------------------------------------------------------------------------------
  walk_chr_rectangles_of_node: ( node ) ->
    return null unless ( text_node = node.childNodes[ 0 ] )?
    c1            = new TU.Cursor text_node, 0, text_node.data
    c2            = new TU.Cursor text_node, 0, text_node.data
    TU.TraverseUtil.setSelection c1, c2
    loop
      rectangles = @_get_next_chr_rectangles node, c1, c2
      break unless rectangles?
      for rectangle from rectangles
        yield new DOMRect                                       \
          rectangle.left + document.documentElement.scrollLeft, \   # left
          rectangle.top  + document.documentElement.scrollTop,  \   # top
          rectangle.width,                                      \   # width
          rectangle.height                                          # height
    return null

  #---------------------------------------------------------------------------------------------------------
  _reset_line_walker: ( s ) ->
    s.min_top       = +Infinity
    s.max_bottom    = -Infinity
    s.min_left      = +Infinity
    s.max_right     = -Infinity
    s.avg_height    = 0
    s.avg_bottom    = 0
    s.count         = 0
    return null

  #---------------------------------------------------------------------------------------------------------
  walk_line_rectangles_of_node: ( node ) ->
    @_reset_line_walker s  = {}
    for rectangle from @walk_chr_rectangles_of_node node
      if s.count > 0 and rectangle.bottom - s.avg_bottom > s.avg_height * @cfg.line_step_factor
        yield new DOMRect             \
          s.min_left,                 \   # left
          s.min_top,                  \   # top
          s.max_right   - s.min_left, \   # width
          s.max_bottom  - s.min_top       # height
        @_reset_line_walker s
      #.......................................................................................................
      # draw_box rectangle
      s.count++
      s.min_top     = Math.min s.min_top,     rectangle.top
      s.max_bottom  = Math.max s.max_bottom,  rectangle.bottom
      s.min_left    = Math.min s.min_left,    rectangle.left
      s.max_right   = Math.max s.max_right,   rectangle.right
      s.avg_height  = ( s.avg_height * ( s.count - 1 ) / s.count ) + ( rectangle.height * 1 / s.count )
      s.avg_bottom  = ( s.avg_bottom * ( s.count - 1 ) / s.count ) + ( rectangle.bottom * 1 / s.count )
    #.........................................................................................................
    if s.count > 0
      yield new DOMRect             \
        s.min_left,                 \   # left
        s.min_top,                  \   # top
        s.max_right   - s.min_left, \   # width
        s.max_bottom  - s.min_top       # height
    return null

  #---------------------------------------------------------------------------------------------------------
  walk_slugs_of_node: ( node ) ->
    rectangles  = [ ( @walk_line_rectangles_of_node node )..., ]
    line_count  = rectangles.length
    for rectangle, idx in rectangles
      llnr  = idx + 1
      rlnr  = line_count - idx
      yield new Slug { llnr, rlnr, node, rectangle, }
    return null


#===========================================================================================================
class Column

  #---------------------------------------------------------------------------------------------------------
  constructor: ( ø_iframe, ø_slug ) ->
    @_ø_iframe  = ø_iframe
    @first_slug = ø_slug.value
    @top        = ø_slug.value.rectangle.top
    @height     = 0
    return undefined

  #---------------------------------------------------------------------------------------------------------
  scroll_to_first_line: ->
    @_ø_iframe.window.scrollTo { top: @top, }
    return null

  #---------------------------------------------------------------------------------------------------------
  set_height_from_slug: ( ø_slug ) ->
    @height = ø_slug.value.rectangle.bottom - @top
    return @height


#===========================================================================================================
class Walker
  ### TAINT should add `next` method (or well-known symbol) to make it an iterator ###

  #---------------------------------------------------------------------------------------------------------
  constructor: ( iterator, stop = null ) ->
    @_iterator  = iterator
    @_stop      = stop
    @done       = false
    @value      = stop
    return undefined

  #---------------------------------------------------------------------------------------------------------
  [Symbol.iterator]: ->
    while @step() isnt @_stop
      yield @
    return null

  #---------------------------------------------------------------------------------------------------------
  step: ->
    { value, done, } = @_iterator.next()
    if done
      @done   = true
      @value  = @_stop
      return @_stop
    @value = value
    return value


#===========================================================================================================
class Node_walker extends Walker
class Slug_walker extends Walker


#===========================================================================================================
class Iframe_walker extends Walker

  #---------------------------------------------------------------------------------------------------------
  constructor: ( iterator, stop = null, cfg ) ->
    super iterator, stop
    @height                 = null
    # @galley_document        = null
    @window                 = null
    @µ                      = null
    @LINEFINDER             = null
    @draw_box               = null
    @draw_line_cover        = null
    @cfg                    = cfg
    return undefined

  #---------------------------------------------------------------------------------------------------------
  step: ->
    super()
    return @_stop if @done
    µ.DOM.set @value, 'scrolling', 'no' unless @cfg.iframe_scrolling
    @height                 = µ.DOM.get_height @value
    # @galley_document        = @value.contentDocument
    @window                 = @value.contentWindow
    @µ                      = @window.require 'mudom'
    @LINEFINDER             = @window.require 'linefinder'
    ### TAINT may want to return `linefinder` itself ###
    iframe_linefinder       = new @LINEFINDER.Finder @cfg
    @draw_box               = iframe_linefinder.draw_box.bind             iframe_linefinder
    @draw_line_cover        = iframe_linefinder.xxx_draw_line_cover.bind  iframe_linefinder
    return @value


#===========================================================================================================
class Distributor

  #---------------------------------------------------------------------------------------------------------
  @is_galley_document:  -> (     µ.DOM.page_is_inside_iframe() ) and ( µ.DOM.select_first 'galley', null )?
  @is_main_document:    -> ( not µ.DOM.page_is_inside_iframe() ) and ( µ.DOM.select_first 'iframe', null )?

  #---------------------------------------------------------------------------------------------------------
  constructor: ( cfg ) ->
    ### TAINT use `intertype` ###
    @cfg = Object.freeze { defaults.distributor_cfg..., cfg..., }
    @_insert_stylesheet   'after',  @cfg.insert_stylesheet_after    if @cfg.insert_stylesheet_after?
    @_insert_stylesheet   'before', @cfg.insert_stylesheet_before   if @cfg.insert_stylesheet_before?
    for ø_iframe from @new_iframe_walker()
      new ø_iframe.LINEFINDER.Distributor @cfg
    @insert_debug_button() if @cfg.insert_debug_button
    return undefined

  #---------------------------------------------------------------------------------------------------------
  new_iframe_walker: -> new Iframe_walker ( µ.DOM.select_all @cfg.iframe_selector ).values(), null, @cfg

  #---------------------------------------------------------------------------------------------------------
  distribute_lines: ->
    #.......................................................................................................
    ### Allow user-scrolling for demo ###
    # µ.DOM.set ø_iframe.value, 'scrolling', 'true' for ø_iframe.value in µ.DOM.select_all 'ø_iframe.value'
    #.......................................................................................................
    ø_iframe          = @new_iframe_walker()
    ø_iframe.step()
    ø_node            = new Node_walker ( ø_iframe.µ.DOM.select_all @cfg.paragraph_selector ).values()
    linefinder        = new ø_iframe.LINEFINDER.Finder @cfg
    column            = null
    #.......................................................................................................
    loop
      break if ø_iframe.done
      #.....................................................................................................
      unless ø_node.step()? # might want to mark galleys without content at this point
        break
      #.....................................................................................................
      await defer()
      ø_slug = new Slug_walker linefinder.walk_slugs_of_node ø_node.value
      loop
        unless ø_slug.step()?
          break
        await defer()
        #...................................................................................................
        unless column?.first_slug?
          column = new Column ø_iframe, ø_slug
          column.scroll_to_first_line()
        #...................................................................................................
        column.set_height_from_slug ø_slug
        if ø_iframe.height > column.height
          ø_iframe.draw_box ø_slug.value.rectangle
          continue
        #...................................................................................................
        ø_iframe.draw_line_cover ø_slug.value.rectangle
        column    = null
        unless ø_iframe.step()?
          break
        ø_iframe.draw_box ø_slug.value.rectangle
        column = new Column ø_iframe, ø_slug
        column.scroll_to_first_line()
    #.......................................................................................................
    return null

  #---------------------------------------------------------------------------------------------------------
  mark_lines: ->
    ø_node            = new Node_walker ( µ.DOM.select_all @cfg.paragraph_selector ).values()
    linefinder        = new Finder @cfg
    #.......................................................................................................
    loop
      #.....................................................................................................
      unless ø_node.step()? # might want to mark galleys without content at this point
        break
      #.....................................................................................................
      await defer()
      ø_slug = new Slug_walker linefinder.walk_slugs_of_node ø_node.value
      loop
        unless ø_slug.step()?
          break
        await defer()
        linefinder.draw_box ø_slug.value.rectangle
    #.......................................................................................................
    return null


  #=========================================================================================================
  # INSERTION OF STYLESHEET, DEBUG BUTTON
  #---------------------------------------------------------------------------------------------------------
  insert_stylesheet_before:   ( element_or_selector ) -> @_insert_stylesheet   'before', element_or_selector
  insert_stylesheet_after:    ( element_or_selector ) -> @_insert_stylesheet   'after',  element_or_selector

  #---------------------------------------------------------------------------------------------------------
  _insert_stylesheet: ( where, ref ) ->
    ### TAINT code duplication ###
    element     = if typeof ref is 'string' then ( µ.DOM.select_first ref ) else ref
    stylesheet  = @_get_stylesheet()
    switch where
      when 'before' then µ.DOM.insert_before  element, stylesheet
      when 'after'  then µ.DOM.insert_after   element, stylesheet
      else "unknown location #{µ.TEXT.rpr where}"
    return null

  #---------------------------------------------------------------------------------------------------------
  _get_stylesheet: ->
    ### TAINT must honour element, class name configuration ###
    ### https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleSheet/insertRule ###
    return µ.DOM.new_stylesheet """
      /* stylesheet inserted by mudom `LINE.Distributor` */
      .#{@cfg.debug_class_name} iframe {
        outline:                1px dotted red; }

      #{@cfg.linemarker_tagname} {
        background-color:       transparent;
        pointer-events:         none;
        position:               absolute; }

      .#{@cfg.debug_class_name} #{@cfg.linemarker_tagname} {
        background-color:       rgba( 255, 248, 0, 0.2 );
        outline:                1px solid rgba( 255, 0, 0, 0.2 );
        mix-blend-mode:         multiply; }

      #{@cfg.linecover_tagname} {
        background-color:       white;
        pointer-events:         none;
        position:               absolute; }

      .#{@cfg.debug_class_name} #{@cfg.linecover_tagname} {
        background-color:       rgba( 255, 0, 0, 0.2 );
        mix-blend-mode:         multiply; }

      /* ### TAINT replace magic numbers */
      button##{@cfg.debug_button_id} {
        position:               fixed;
        top:                    3mm;
        left:                   95mm; }

      @media print {
        button##{@cfg.debug_button_id} {
          display: none !important; } }
      """

  #---------------------------------------------------------------------------------------------------------
  insert_debug_button: ->
    µ.DOM.insert_as_first ( µ.DOM.select_first 'body' ), @_get_debug_button()
    return null

  #---------------------------------------------------------------------------------------------------------
  _get_debug_button: ->
    R = µ.DOM.parse_one "<button>DEBUG</button>"
    µ.DOM.set R, 'id', @cfg.debug_button_id
    µ.DOM.on R, 'click', =>
      µ.DOM.toggle_class ( µ.DOM.select_first 'body' ), @cfg.debug_class_name
      for ø_iframe from @new_iframe_walker()
        ø_iframe.µ.DOM.toggle_class ( ø_iframe.µ.DOM.select_first 'body' ), @cfg.debug_class_name
      return null
    return R



module.exports = { Finder, Distributor, }

