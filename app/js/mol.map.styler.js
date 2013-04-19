mol.modules.map.styler = function(mol) {
    mol.map.styler = {};

    mol.map.styler.StylerEngine = mol.mvp.Engine.extend({
        init: function(proxy, bus) {
            this.proxy = proxy;
            this.bus = bus;
        },

        start: function() {
            this.display = new mol.map.styler.StylerDisplay();
            this.addEventHandlers();
        },

        addEventHandlers: function() {
            var self = this;

            this.bus.addHandler(
                'show-styler',
                function(event) {
                    self.displayLayerStyler(
                        event.params.target,
                        event.params.layer);

                }
            );

            this.bus.addHandler(
                'reset-layer-style',
                function(event) {
                    var o = self.parseLayerStyle(event.params.layer, "orig");

                    //update css
                    self.updateLegendCss(
                        $(event.params.l).find('.styler'),
                        o,
                        event.params.layer,
                        event.params.layer.orig_opacity
                    );

                    //update tiles
                    self.updateLayerStyle(
                        $(event.params.l).find('.styler'),
                        o,
                        event.params.layer,
                        event.params.layer.orig_opacity
                    );
                }
            );

            this.bus.addHandler(
                'style-all-layers',
                function(event) {
                    var button = event.params.target,
                        display = event.params.display,
                        layers = event.params.layers,
                        baseHtml,
                        q;

                    baseHtml = '' +
                           '<div class="mol-LayerControl-Styler">' +
                           '  <div class="colorPickers">' +
                           '    <div class="colorPicker">' +
                           '      <span class="stylerLabel">Color:&nbsp</span>' +
                           '      <input type="text" id="allFill" />' +
                           '    </div>' +
                           '  </div>' +
                           '  <div class="buttonWrapper allStyler">' +
                           '    <button id="applyStyle">Apply</button>' +
                           '    <button id="cancelStyle">Cancel</button>' +
                           '  </div>' +
                           '</div>';

                    $(button).removeData('qtip');

                    q = $(button).qtip({
                        content: {
                            text: baseHtml,
                            title: {
                                text: 'Style All Layers',
                                button: true
                            }
                        },
                        position: {
                            at: 'left center',
                            my: 'right top'
                        },
                        show: {
                            event: 'click',
                            delay: 0,
                            ready: true,
                            solo: true
                        },
                        hide: false,
                        style: {
                            def: false,
                            classes: 'ui-tooltip-widgettheme'
                        },
                        events: {
                            render: function(event, api) {
                                var colors = ['black','white','red','yellow',
                                              'blue','green','orange','purple'],
                                    colors2 = ['#66C2A5','#FC8D62', '#8DA0CB',
                                               '#E78AC3', '#A6D854', '#FFD92F',
                                               '#E5C494'];

                                $("#allFill").spectrum({
                                      color: 'black',
                                      showPaletteOnly: true,
                                      palette: [colors, colors2]
                                });

                                $(api.elements.content)
                                    .find('#applyStyle').click(
                                        function(event) {
                                            var o = {},
                                                color;

                                            color = $('#allFill')
                                                        .spectrum("get")
                                                            .toHexString();

                                            o.fill = color;
                                            o.size = 1;
                                            o.border = color;
                                            o.s1 = color;
                                            o.s2 = color;
                                            o.s3 = color;
                                            o.s4 = color;
                                            o.s5 = color;
                                            o.p = color;
                                            
                                            self.bus.fireEvent(
                                                new mol.bus.Event(
                                                    'clear-map'));
                                            
                                            _.each(
                                                layers,
                                                function(layer) {
                                                    var l,
                                                        current;

                                                    l = display.getLayer(layer);

                                                    current = self
                                                            .parseLayerStyle(
                                                                layer,
                                                                "current");

                                                    o.s1c = current.s1c;
                                                    o.s2c = current.s2c;
                                                    o.s3c = current.s3c;
                                                    o.s4c = current.s4c;
                                                    o.s5c = current.s5c;
                                                    o.pc = current.pc;

                                                    if(layer.type == "range") {
                                                        o.size = 0;
                                                    }

                                                    if(layer.style_table ==
                                                                "point_style") {
                                                        o.size = 3;
                                                    }

                                                    //update css
                                                    self.updateLegendCss(
                                                        $(l).find('.styler'),
                                                        o,
                                                        layer,
                                                        0.9
                                                    );

                                                    //update tiles
                                                    self.updateLayerStyle(
                                                        $(l).find('.styler'),
                                                        o,
                                                        layer,
                                                        0.9
                                                    );
                                                }
                                            );

                                            $(button).prop('disabled', false);
                                            $(button).qtip('destroy');
                                        }
                                );

                                $(api.elements.content)
                                    .find('#cancelStyle').click(
                                        function(event) {
                                            $(button).prop('disabled', false);
                                            $(button).qtip('destroy');
                                        }
                                    );
                            },
                            show: function(event, api) {
                                $(button).prop('disabled', true);
                            },
                            hide: function(event, api) {
                                $(button).prop('disabled', false);
                                $(button).qtip('destroy');
                            }
                        }
                    });
                }
            );

            this.bus.addHandler(
                'initial-legend-style',
                function(event) {
                    var o = {};

                    //style legends initially
                    o = self.parseLayerStyle(event.params.layer, "orig");

                    //initalize css
                    self.updateLegendCss(
                        $(event.params.l).find('.styler'),
                        o,
                        event.params.layer,
                        event.params.layer.orig_opacity
                    );
                }
            );

            this.bus.addHandler(
                'toggle-layer-highlight',
                function(event) {
                    self.toggleLayerHighlight(
                        event.params.layer,
                        event.params.visible,
                        event.params.selected
                    );
                }
            );
        },

        displayLayerStyler: function(button, layer) {
            var baseHtml,
                layer_curr_style,
                layer_orig_style,
                max,
                min,
                params = {
                    layer: layer,
                    style: null
                },
                q,
                self = this;

            layer_curr_style = self.parseLayerStyle(layer, "current");
            layer_orig_style = self.parseLayerStyle(layer, "orig");

            baseHtml = '' +
                   '<div class="mol-LayerControl-Styler ' +layer.source+ '">' +
                   '  <div class="colorPickers"></div>' +
                   '  <div class="sizerHolder"></div>' +
                   '  <div class="opacityHolder">' +
                   '    <span class="sliderLabel">Opacity:&nbsp</span>' +
                   '    <div class="sliderContainer">' +
                   '      <div class="opacity"></div>' +
                   '    </div>' +
                   '    <span id="opacityValue">50</span>' +
                   '  </div>' +
                   '  <div class="buttonWrapper">' +
                   '    <button id="applyStyle">Apply</button>' +
                   '    <button id="resetStyle">Reset</button>' +
                   '    <button id="cancelStyle">Cancel</button>' +
                   '  </div>' +
                   '</div>';

            $(button).removeData('qtip');

            q = $(button).qtip({
                content: {
                    text: baseHtml,
                    title: {
                        text: 'Layer Style',
                        button: true
                    }
                },
                position: {
                    at: 'left center',
                    my: 'right top'
                },
                show: {
                    event: 'click',
                    delay: 0,
                    ready: true,
                    solo: true
                },
                hide: false,
                style: {
                    def: false,
                    classes: 'ui-tooltip-widgettheme'
                },
                events: {
                    render: function(event, api) {
                        self.getStylerLayout(
                                $(api.elements.content)
                                    .find('.mol-LayerControl-Styler'),
                                layer);

                        self.setStylerProperties(
                                    api.elements.content,
                                    layer,
                                    layer_curr_style,
                                    layer_orig_style,
                                    false);

                        $(api.elements.content).find('#applyStyle').click(
                            function(event) {
                                var o = {};

                                if(layer.type == "range") {
                                    //TODO issue #175 replace iucn ref
                                    if(layer.source == "jetz" ||
                                       layer.source == "iucn") {
                                        o.s1 = $('#showFill1Palette')
                                             .spectrum("get")
                                                .toHexString();
                                        o.s1c = $('#seasChk1')
                                                    .is(':checked') ? 1:0;
                                        o.s2 = $('#showFill2Palette')
                                                 .spectrum("get")
                                                    .toHexString();
                                        o.s2c = $('#seasChk2')
                                                    .is(':checked') ? 1:0;
                                        o.s3 = $('#showFill3Palette')
                                                 .spectrum("get")
                                                    .toHexString();
                                        o.s3c = $('#seasChk3')
                                                    .is(':checked') ? 1:0;
                                    }

                                    //TODO issue #175 replace iucn ref
                                    if(layer.source == "iucn") {
                                        o.s4 = $('#showFill4Palette')
                                             .spectrum("get")
                                                .toHexString();
                                        o.s4c = $('#seasChk4')
                                                    .is(':checked') ? 1:0;
                                    }

                                    if(layer.source != "jetz") {
                                        o.s5 = $('#showFill5Palette')
                                             .spectrum("get")
                                                .toHexString();
                                        o.s5c = $('#seasChk5')
                                                    .is(':checked') ? 1:0;
                                    }

                                    if(layer.source == "iucn") {
                                        o.p = $('#showFill6Palette')
                                             .spectrum("get")
                                                .toHexString();
                                        o.pc = $('#seasChk6')
                                                    .is(':checked') ? 1:0;
                                    }
                                } else {
                                    o.fill = $('#showFillPalette')
                                            .spectrum("get")
                                                .toHexString();
                                }

                                o.border = $('#showBorderPalette')
                                                .spectrum("get")
                                                    .toHexString();
                                o.size = $(api.elements.content)
                                                .find('.sizer')
                                                    .slider('value');

                                self.updateLegendCss(
                                        button,
                                        o,
                                        layer,
                                        parseFloat($(api.elements.content)
                                            .find('.opacity')
                                                .slider("value")));

                                self.updateLayerStyle(
                                        button,
                                        o,
                                        layer,
                                        parseFloat($(api.elements.content)
                                            .find('.opacity')
                                                .slider("value"))
                                );

                                $(button).prop('disabled', false);
                                $(button).qtip('destroy');
                            }
                        );

                        $(api.elements.content)
                            .find('#resetStyle').click(
                                function(event) {
                                    self.setStylerProperties(
                                                    api.elements.content,
                                                    layer,
                                                    layer_orig_style,
                                                    layer_orig_style,
                                                    true);
                                }
                            );

                        $(api.elements.content)
                            .find('#cancelStyle').click(
                                function(event) {
                                    $(button).prop('disabled', false);
                                    $(button).qtip('destroy');
                                }
                            );
                    },
                    show: function(event, api) {
                        $(button).prop('disabled', true);
                    },
                    hide: function(event, api) {
                        $(button).prop('disabled', false);
                        $(button).qtip('destroy');
                    }
                }
            });
        },

        parseLayerStyle: function(layer, original) {
            var o = {},
                fillStyle, borderStyle, sizeStyle,
                style,
                s1Style, s2Style, s3Style, s4Style, s5Style, pStyle,
                s1, s2, s3, s4, s5, p, pc,
                c1, c2, c3, c4, c5;

            if(original == "current") {
                style = layer.style;
            } else if(original == "orig") {
                style = layer.orig_style;
            } else {
                style = layer.tile_style;
            }

            if(layer.style_table == "points_style") {
                fillStyle = style.substring(
                                    style.indexOf('marker-fill'),
                                    style.length-1);

                borderStyle = style.substring(
                                    style.indexOf('marker-line-color'),
                                    style.length-1);

                sizeStyle = style.substring(
                                    style.indexOf('marker-width'),
                                    style.length-1);

                o = {fill: fillStyle.substring(
                                    fillStyle.indexOf('#'),
                                    fillStyle.indexOf(';')),
                     border: borderStyle.substring(
                                    borderStyle.indexOf('#'),
                                    borderStyle.indexOf(';')),
                     size: Number($.trim(sizeStyle.substring(
                                    sizeStyle.indexOf(':')+1,
                                    sizeStyle.indexOf(';'))))};
            } else {
                if(layer.type == "range") {
                    if(layer.source == "jetz" || layer.source == "iucn") {
                        s1Style = style.substring(
                                        style.indexOf('seasonality=1'),
                                        style.length-1);

                        s1 = s1Style.substring(
                                        s1Style.indexOf('polygon-fill'),
                                        s1Style.length-1);

                        c1 = s1Style.substring(
                                        s1Style.indexOf('polygon-opacity'),
                                        s1Style.length-1);

                        s2Style = style.substring(
                                        style.indexOf('seasonality=2'),
                                        style.length-1);

                        s2 = s2Style.substring(
                                        s2Style.indexOf('polygon-fill'),
                                        s2Style.length-1);

                        c2 = s2Style.substring(
                                        s2Style.indexOf('polygon-opacity'),
                                        s2Style.length-1);

                        s3Style = style.substring(
                                        style.indexOf('seasonality=3'),
                                        style.length-1);

                        s3 = s3Style.substring(
                                        s3Style.indexOf('polygon-fill'),
                                        s3Style.length-1);

                        c3 = s3Style.substring(
                                        s3Style.indexOf('polygon-opacity'),
                                        s3Style.length-1);

                        o.s1 = s1.substring(
                                        s1.indexOf('#'),
                                        s1.indexOf(';'));
                        o.s2 = s2.substring(
                                        s2.indexOf('#'),
                                        s2.indexOf(';'));
                        o.s3 = s3.substring(
                                        s3.indexOf('#'),
                                        s3.indexOf(';'));
                        o.s1c = c1.substring(
                                        c1.indexOf(':')+1,
                                        c1.indexOf(';'));
                        o.s2c = c2.substring(
                                        c2.indexOf(':')+1,
                                        c2.indexOf(';'));
                        o.s3c = c3.substring(
                                        c3.indexOf(':')+1,
                                        c3.indexOf(';'));
                    }

                    //TODO issue #175 replace iucn ref
                    if(layer.source == "iucn") {
                        s4Style = style.substring(
                                    style.indexOf('seasonality=4'),
                                    style.length-1);

                        s4 = s4Style.substring(
                                        s4Style.indexOf('polygon-fill'),
                                        s4Style.length-1);

                        c4 = s4Style.substring(
                                        s4Style.indexOf('polygon-opacity'),
                                        s4Style.length-1);

                        o.s4 = s4.substring(
                                    s4.indexOf('#'),
                                    s4.indexOf(';'));

                        o.s4c = c4.substring(
                                    c4.indexOf(':')+1,
                                    c4.indexOf(';'));
                    }

                    if(layer.source != 'jetz') {
                        s5Style = style.substring(
                                    style.indexOf('seasonality=5'),
                                    style.length-1);

                        s5 = s5Style.substring(
                                    s5Style.indexOf('polygon-fill'),
                                    s5Style.length-1);

                        c5 = s5Style.substring(
                                    s5Style.indexOf('polygon-opacity'),
                                    s5Style.length-1);

                        o.s5 = s5.substring(
                                    s5.indexOf('#'),
                                    s5.indexOf(';'));

                        o.s5c = c5.substring(
                                    c5.indexOf(':')+1,
                                    c5.indexOf(';'));
                    }

                    if(layer.source == "iucn") {
                        pStyle = style.substring(
                                    style.indexOf('presence=4'),
                                    style.length-1);

                        p = pStyle.substring(
                                    pStyle.indexOf('polygon-fill'),
                                    pStyle.length-1);

                        pc = pStyle.substring(
                                    pStyle.indexOf('polygon-opacity'),
                                    pStyle.length-1);

                        o.p = p.substring(
                                    p.indexOf('#'),
                                    p.indexOf(';'));

                        o.pc = pc.substring(
                                    pc.indexOf(':')+1,
                                    pc.indexOf(';'));
                    }
                } else {
                    fillStyle = style.substring(
                                    style.indexOf('polygon-fill'),
                                    style.length-1);

                    o = {fill: fillStyle.substring(
                                    fillStyle.indexOf('#'),
                                    fillStyle.indexOf(';'))};
                }

                borderStyle = style.substring(
                                    style.indexOf('line-color'),
                                    style.length-1);

                sizeStyle = style.substring(
                                style.indexOf('line-width'),
                                style.length-1);

                o.border = borderStyle.substring(
                                borderStyle.indexOf('#'),
                                borderStyle.indexOf(';'));

                o.size = Number($.trim(sizeStyle.substring(
                                sizeStyle.indexOf(':')+1,
                                sizeStyle.indexOf(';'))));
            }

            return o;
        },

        getStylerLayout: function(element, layer) {
            var pickers,
                sizer;

            if(layer.style_table == "points_style") {
               pickers = '' +
                   '<div class="colorPicker">' +
                   '  <span class="stylerLabel">Fill:&nbsp</span>' +
                   '  <input type="text" id="showFillPalette" />' +
                   '</div>' +
                   '<div class="colorPicker">' +
                   '  <span class="stylerLabel">Border:&nbsp</span>' +
                   '  <input type="text" id="showBorderPalette" />' +
                   '</div>';

               sizer = '' +
                   '<span class="sliderLabel">Size:&nbsp</span>' +
                   '  <div class="sliderContainer">' +
                   '    <div class="sizer"></div>' +
                   '  </div>' +
                   '<span id="pointSizeValue">8px</span>';

               $(element).find('.colorPickers').prepend(pickers);
               $(element).find('.sizerHolder').prepend(sizer);
            } else {
                if(layer.type == "range") {
                   pickers = '';

                   //TODO issue #175 replace iucn ref
                   if(layer.source == "jetz" || layer.source == "iucn") {
                       pickers+=''+
                           '<span class="seasonLabel">Breeding</span>' +
                           '<div class="colorPicker">' +
                           '  <span class="stylerLabel">Fill:&nbsp</span>' +
                           '  <input type="text" id="showFill2Palette" />' +
                           '  <input type="checkbox" id="seasChk2" ' +
                                    'class="seasChk" checked="checked"/>' +
                           '</div>' +
                           '<span class="seasonLabel">Resident</span>' +
                           '<div class="colorPicker">' +
                           '  <span class="stylerLabel">Fill:&nbsp</span>' +
                           '  <input type="text" id="showFill1Palette" />' +
                           '  <input type="checkbox" id="seasChk1" ' +
                                    'class="seasChk" checked="checked"/>' +
                           '</div>' +
                           '<span class="seasonLabel">Non-breeding</span>' +
                           '<div class="colorPicker">' +
                           '  <span class="stylerLabel">Fill:&nbsp</span>' +
                           '  <input type="text" id="showFill3Palette" />' +
                           '  <input type="checkbox" id="seasChk3" ' +
                                    'class="seasChk" checked="checked"/>' +
                           '</div>';
                   }

                   //TODO issue #175 replace iucn ref
                   if (layer.source == "iucn") {
                       pickers+=''+
                           '<span class="seasonLabel">Passage</span>' +
                           '<div class="colorPicker">' +
                           '  <span class="stylerLabel">Fill:&nbsp</span>' +
                           '  <input type="text" id="showFill4Palette" />' +
                           '  <input type="checkbox" id="seasChk4" ' +
                                    'class="seasChk" checked="checked"/>' +
                           '</div>';
                   }

                   //TODO issue #175 replace iucn ref
                   if(layer.source != 'jetz') {
                        pickers+=''+
                           '<span class="seasonLabel">' +
                               'Seasonality Uncertain</span>' +
                           '<div class="colorPicker">' +
                           '  <span class="stylerLabel">Fill:&nbsp</span>' +
                           '  <input type="text" id="showFill5Palette" />' +
                           '  <input type="checkbox" id="seasChk5" ' +
                                    'class="seasChk" checked="checked"/>' +
                           '</div>';
                   }

                   //TODO issue #175 replace iucn ref
                   if(layer.source == "iucn") {
                       pickers+=''+
                           '<span class="seasonLabel">' +
                               'Extinct or Presence Uncertain</span>' +
                           '<div class="colorPicker">' +
                           '  <span class="stylerLabel">Fill:&nbsp</span>' +
                           '  <input type="text" id="showFill6Palette" />' +
                           '  <input type="checkbox" id="seasChk6" ' +
                                    'class="seasChk" checked="checked"/>' +
                           '</div>';
                   }

                   pickers+=''+
                       '<span class="seasonLabel">All</span>' +
                       '<div class="colorPicker">' +
                       '  <span class="stylerLabel">Border:&nbsp</span>' +
                       '  <input type="text" id="showBorderPalette" />' +
                       '</div>';

                   sizer = '' +
                       '<span class="sliderLabel">Width:&nbsp</span>' +
                       '  <div class="sliderContainer">' +
                       '    <div class="sizer"></div>' +
                       '  </div>' +
                       '<span id="pointSizeValue">8px</span>';

                   $(element).find('.colorPickers').prepend(pickers);
                   $(element).find('.sizerHolder').prepend(sizer);
                } else {
                   pickers = '' +
                       '<div class="colorPicker">' +
                       '  <span class="stylerLabel">Fill:&nbsp</span>' +
                       '  <input type="text" id="showFillPalette" />' +
                       '</div>' +
                       '<div class="colorPicker">' +
                       '  <span class="stylerLabel">Border:&nbsp</span>' +
                       '  <input type="text" id="showBorderPalette" />' +
                       '</div>';

                   sizer = '' +
                       '<span class="sliderLabel">Width:&nbsp</span>' +
                       '  <div class="sliderContainer">' +
                       '    <div class="sizer"></div>' +
                       '  </div>' +
                       '<span id="pointSizeValue">8px</span>';

                   $(element).find('.colorPickers').prepend(pickers);
                   $(element).find('.sizerHolder').prepend(sizer);
                }
            }
        },

        setStylerProperties: function(cont, lay, currSty, origSty, reset) {
            var colors = ['black','white','red','yellow',
                          'blue','green','orange','purple'],
                colors2 = ['#66C2A5','#FC8D62', '#8DA0CB',
                           '#E78AC3', '#A6D854', '#FFD92F','#E5C494'],
                objs = [],
                max,
                min,
                layOpa;

            if(lay.type == "range") {
                if(lay.source == "jetz" || lay.source == "iucn") {
                    objs.push({name: '#showFill1Palette',
                            color: currSty.s1,
                            def: origSty.s1});
                    objs.push({name: '#showFill2Palette',
                            color: currSty.s2,
                            def: origSty.s2});
                    objs.push({name: '#showFill3Palette',
                            color: currSty.s3,
                            def: origSty.s3});

                    $(cont).find('#seasChk1')
                        .prop('checked', (currSty.s1c == 1) ? true : false);
                    $(cont).find('#seasChk2')
                        .prop('checked', (currSty.s2c == 1) ? true : false);
                    $(cont).find('#seasChk3')
                        .prop('checked', (currSty.s3c == 1) ? true : false);
                }

                objs.push({name: '#showBorderPalette',
                            color: currSty.border,
                            def: origSty.border});

               //TODO issue #175 replace iucn ref
                if(lay.source == "iucn") {
                    $(cont).find('#seasChk4')
                        .prop('checked', (currSty.s4c == 1) ? true : false);
                    objs.push({name: '#showFill4Palette',
                          color: currSty.s4,
                          def: origSty.s4});
                }

                if(lay.source != 'jetz') {
                    $(cont).find('#seasChk5')
                        .prop('checked', (currSty.s5c == 1) ? true : false);
                    objs.push({name: '#showFill5Palette',
                          color: currSty.s5,
                          def: origSty.s5});
                }

                if(lay.source == "iucn") {
                    $(cont).find('#seasChk6')
                        .prop('checked', (currSty.pc == 1) ? true : false);
                    objs.push({name: '#showFill6Palette',
                              color: currSty.p,
                              def: origSty.p});
                }
            } else {
                objs = [ {name: '#showFillPalette',
                          color: currSty.fill,
                          def: origSty.fill},
                         {name: '#showBorderPalette',
                          color: currSty.border,
                          def: origSty.border}
                       ];
            }

            _.each(objs, function(obj) {
                $(obj.name).spectrum({
                  color: obj.color,
                  showPaletteOnly: true,
                  palette: [
                      [obj.def],
                      colors, colors2
                  ]
               });
            });

            //sizer
            if(lay.style_table == "points_style") {
                max = 8;
                min = 1;
            } else {
                max = 3;
                min = 0;
            }

            $(cont).find('.sizer').slider({
                value: currSty.size,
                min:min,
                max:max,
                step:1,
                animate:"slow",
                slide: function(event, ui) {
                    $(cont).find('#pointSizeValue').html(ui.value + "px");
                }
            });

            $(cont).find('#pointSizeValue').html(
                $(cont).find('.sizer').slider('value') + "px");

            layOpa = reset ? lay.orig_opacity : lay.style_opacity;

            //opacity
            $(cont).find('.opacity').slider({
                value: layOpa,
                min:0,
                max:1,
                step: 0.1,
                animate:"slow",
                slide: function(event, ui) {
                    $(cont).find('#opacityValue').html(
                        (ui.value)*100 + "&#37");
                }}
            );

            $(cont).find('#opacityValue').html((layOpa)*100 + "&#37");
        },

        updateLegendCss: function(button, o, layer, opa) {
            if(layer.type == "range") {
                if(layer.source == "jetz" || layer.source == "iucn") {
                    $(button).find('.s1').css({
                        'background-color':o.s2,
                        'opacity': (o.s2c == 0) ? 0 : opa});
                    $(button).find('.s2').css({
                        'background-color':o.s1,
                        'opacity': (o.s1c == 0) ? 0 : opa});
                    $(button).find('.s3').css({
                        'background-color':o.s3,
                        'opacity': (o.s3c == 0) ? 0 : opa});

                    //TODO issue #175 replace iucn ref
                    if(layer.source == "iucn") {
                        $(button).find('.s4').css({
                            'background-color':o.s4,
                            'opacity': (o.s4c == 0) ? 0 : opa});
                    }

                    $(button).find('.legend-seasonal')
                        .css({
                            'border-color':o.border,
                            'border-width':o.size+"px",
                            'opacity':opa
                        }
                    );
                } else {
                    $(button).find('.legend-polygon')
                        .css({
                            'background-color':o.s5,
                            'border-color':o.border,
                            'border-width':o.size+"px",
                            'opacity':(o.s5c == 0) ? 0 : opa
                        }
                    );
                }
            } else {
                if(layer.style_table == "points_style") {
                    $(button).find('.legend-point')
                        .css({
                            'background-color':o.fill,
                            'border-color':o.border,
                            'width':(o.size+3)+"px",
                            'height':(o.size+3)+"px",
                            'opacity':opa
                        }
                    );
                } else {
                    $(button).find('.legend-polygon')
                        .css({
                            'background-color':o.fill,
                            'border-color':o.border,
                            'border-width':o.size+"px",
                            'opacity':opa
                        }
                    );
                }
            }
        },

        updateLayerStyle: function(button, obj, lay, opa) {
            var o = obj,
                os = {},
                sel_style_desc,
                style_desc,
                params = {},
                oparams = {},
                self = this;

            $.extend(os, o);

            if($(button).parent().hasClass('selected')) {
                os.border = "#FF00FF";
            }

            sel_style_desc = self.updateStyle(lay, lay.tile_style, os);
            style_desc = self.updateStyle(lay, lay.tile_style, o);

            params.layer = lay;
            params.style = sel_style_desc;

            //keep the style around for later
            lay.style = style_desc;

            self.bus.fireEvent(new mol.bus.Event(
                'apply-layer-style', params));

            oparams = {
                layer: lay,
                opacity: lay.opacity,
                style_opacity: opa
            };

            //store the opacity on the layer object
            lay.style_opacity = oparams.style_opacity;

            self.bus.fireEvent(new mol.bus.Event(
                'layer-opacity', oparams));
        },

        updateStyle: function(layer, style, newStyle) {
            var updatedStyle,
                season;

            if(layer.style_table == "points_style") {
                style = this.changeStyleProperty(
                            style, 'marker-fill', newStyle.fill, false);
                style = this.changeStyleProperty(
                            style, 'marker-line-color', newStyle.border,
                                false);
                style = this.changeStyleProperty(
                            style, 'marker-width', newStyle.size, false);
            } else {
                if(layer.type == "range") {
                    if(layer.source == "jetz" || layer.source == "iucn") {
                        style = this.changeStyleProperty(
                                    style, 'seasonality=1', newStyle.s1, true,
                                    'polygon-fill');
                        style = this.changeStyleProperty(
                                    style, 'seasonality=2', newStyle.s2, true,
                                    'polygon-fill');
                        style = this.changeStyleProperty(
                                    style, 'seasonality=3', newStyle.s3, true,
                                    'polygon-fill');

                        style = this.changeStyleProperty(
                                    style, 'seasonality=1', newStyle.s1c, true,
                                    'polygon-opacity');
                        style = this.changeStyleProperty(
                                    style, 'seasonality=2', newStyle.s2c, true,
                                    'polygon-opacity');
                        style = this.changeStyleProperty(
                                    style, 'seasonality=3', newStyle.s3c, true,
                                    'polygon-opacity');
                    }

                    //TODO issue #175 replace iucn ref
                    if(layer.source == "iucn") {
                        style = this.changeStyleProperty(
                                style, 'seasonality=4', newStyle.s4, true,
                                'polygon-fill');
                        style = this.changeStyleProperty(
                                style, 'seasonality=4', newStyle.s4c, true,
                                'polygon-opacity');
                    }

                    if(layer.source != 'jetz') {
                        style = this.changeStyleProperty(
                                style, 'seasonality=5', newStyle.s5, true,
                                'polygon-fill');
                        style = this.changeStyleProperty(
                                style, 'seasonality=5', newStyle.s5c, true,
                                'polygon-opacity');
                        style = this.changeStyleProperty(
                                style, 'seasonality=0', newStyle.s5, true,
                                'polygon-fill');
                        style = this.changeStyleProperty(
                                style, 'seasonality=0', newStyle.s5c, true,
                                'polygon-opacity');
                    }

                    if(layer.source == 'iucn') {
                        style = this.changeStyleProperty(
                                style, 'presence=4', newStyle.p, true,
                                'polygon-fill');
                        style = this.changeStyleProperty(
                                style, 'presence=5', newStyle.p, true,
                                'polygon-fill');
                        style = this.changeStyleProperty(
                                style, 'presence=6', newStyle.p, true,
                                'polygon-fill');
                        style = this.changeStyleProperty(
                                style, 'presence=4', newStyle.pc, true,
                                'polygon-opacity');
                        style = this.changeStyleProperty(
                                style, 'presence=5', newStyle.pc, true,
                                'polygon-opacity');
                        style = this.changeStyleProperty(
                                style, 'presence=6', newStyle.pc, true,
                                'polygon-opacity');
                    }
                } else {
                    style = this.changeStyleProperty(
                                style, 'polygon-fill', newStyle.fill,
                                    false);
                }

                style = this.changeStyleProperty(
                                style, 'line-color', newStyle.border, false);
                style = this.changeStyleProperty(
                                style, 'line-width', newStyle.size, false);
            }

            updatedStyle = style;

            return updatedStyle;
        },

        changeStyleProperty: function(style, prop, newSty, isSeas, seasonProp) {
            var updatedStyle,
                subStyle,
                spreStyle,
                preStyle,
                smidStyle,
                midStyle,
                srestStyle;

            if(isSeas) {
                spreStyle = style.substring(
                                0,
                                style.indexOf(prop+"]")
                            );

                preStyle = style.substring(
                                style.indexOf(prop+"]"),
                                style.length
                           );

                smidStyle = preStyle.substring(
                                0,
                                preStyle.indexOf(seasonProp+":")
                            );

                midStyle = preStyle.substring(
                                preStyle.indexOf(seasonProp+":"),
                                preStyle.length
                           );

                srestStyle = midStyle.substring(
                                midStyle.indexOf(";"),
                                midStyle.length
                             );

                updatedStyle = spreStyle +
                              smidStyle +
                              seasonProp + ":" +
                              newSty +
                              srestStyle;
            } else {
                subStyle = style.substring(style.indexOf(prop), style.length);

                updatedStyle = style.substring(
                                    0,
                                    style.indexOf(prop + ":") +
                                    prop.length+1
                               ) +
                               newSty +
                               subStyle.substring(
                                    subStyle.indexOf(";"),
                                    subStyle.length
                               );
            }

            return updatedStyle;
        },

        toggleLayerHighlight: function(layer, visible, sel) {
            var o = {},
                style_desc,
                self = this,
                style = layer.tile_style,
                oldStyle,
                params = {
                    layer: layer,
                    style: null,
                    isSelected: sel
                };

                oldStyle = self.parseLayerStyle(layer, "current");

                if(layer.style_table == "points_style") {
                    style = this.changeStyleProperty(
                                style,
                                'marker-line-color',
                                visible ? '#FF00FF' : oldStyle.border,
                                false
                            );
                } else {
                    style = this.changeStyleProperty(
                                style,
                                'line-color',
                                visible ? '#FF00FF' : oldStyle.border,
                                false
                            );

                    style = this.changeStyleProperty(
                                style,
                                'line-width',
                                visible ? 2 : oldStyle.size,
                                false
                            );
                }

                style_desc = style;

                params.style = style_desc;
                
                self.bus.fireEvent(
                    new mol.bus.Event(
                        'apply-layer-style',
                        params));
        },
    });

    mol.map.styler.StylerDisplay = mol.mvp.View.extend({
        init: function(styler) {
            var html = '' +
                       '<div>Something here.</div>',
                self = this;

            this._super(html);
        }
    });
}
