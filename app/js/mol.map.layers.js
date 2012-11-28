mol.modules.map.layers = function(mol) {

    mol.map.layers = {};

    mol.map.layers.LayerEngine = mol.mvp.Engine.extend({
        init: function(proxy, bus, map) {
            this.proxy = proxy;
            this.bus = bus;
            this.map = map;
            this.clickDisabled = false;
        },

        start: function() {
            this.display = new mol.map.layers.LayerListDisplay('.map_container');
            this.fireEvents();
            this.addEventHandlers();
            this.initSortable();
            this.display.toggle(false);
        },

        layersToggle: function(event) {
            var self = this,
                visible = event.visible;
            
            if (visible == this.display.expanded) {
                return;
            }
            if(this.display.expanded == true || visible == false) {
                $(self.display.styleAll).prop('disabled', false);
                $(self.display.styleAll).qtip('destroy');
                
                this.display.layersWrapper.animate(
                    {height: this.display.layersHeader.height()+18},
                    1000,
                      function() {
                        self.display.layersToggle.text('▼');
                        self.display.expanded = false;
                    }
                );


            } else {
                this.display.layersWrapper.animate(
                    {height:this.display.layersHeader.height()
                        +this.display.layersContainer.height()+35},
                    1000,
                    function() {
                        self.display.layersToggle.text('▲');
                        self.display.expanded = true;
                        
                        $(self.display.layersWrapper).css({'height':''});
                    }
                );

            }
        },

        addEventHandlers: function() {
            var self = this;
            
            this.display.removeAll.click (
                function(event) {
                    $(self.display.styleAll).prop('disabled', false);
                    $(self.display.styleAll).qtip('destroy');
                    
                    $(self.display).find(".close").trigger("click");
                }
            );
            
            this.display.toggleAll.click (
                function(event) {
                    $(self.display.styleAll).prop('disabled', false);
                    $(self.display.styleAll).qtip('destroy');
                    
                    _.each(
                        $(self.display).find(".toggle"),
                        function(checkbox){
                                checkbox.click({currentTarget : this})
                        }
                    );
                }
            );
            
            this.display.resetAll.click (
                function(event) {
                    $(self.display.styleAll).prop('disabled', false);
                    $(self.display.styleAll).qtip('destroy');
                    
                    _.each(
                        self.display.layers,
                        function(layer) {
                            var l,
                                o;
                                
                            //get original style    
                            l = self.display.getLayer(layer);                                
                            o = self.parseLayerStyle(layer, "orig");
                            
                            //update css
                            self.updateLegendCss(
                                $(l).find('.styler'), 
                                o, 
                                layer,
                                layer.orig_opacity
                            );

                            //update tiles
                            self.updateLayerStyle(
                                $(l).find('.styler'),
                                o,
                                layer, 
                                layer.orig_opacity
                            );
                        }
                    );
                }
            );
            
            this.display.styleAll.click (
                function(event) {
                    var button = this,
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
                           
                    _.each(
                        self.display.layers,
                        function(layer) {
                            var l, 
                                b;
                            
                            l = self.display.getLayer(layer);
                            b = $(l).find('.styler');
                            $(b).qtip('destroy');
                        }
                    );       
                    
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
                                            
                                            _.each(
                                                self.display.layers,
                                                function(layer) {
                                                    var l;
                                                            
                                                    l = self.display
                                                            .getLayer(layer);                                
                                                    
                                                    //update css
                                                    self.updateLegendCss(
                                                        $(l).find('.styler'), 
                                                        o, 
                                                        layer,
                                                        0.5
                                                    );
                        
                                                    //update tiles
                                                    self.updateLayerStyle(
                                                        $(l).find('.styler'),
                                                        o,
                                                        layer, 
                                                        0.5
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
            
            this.display.layersToggle.click(
                function(event) {
                    self.layersToggle(event);
                }
            );
            
            this.bus.addHandler(
                'layer-opacity',
                function(event) {
                    var layer = event.layer,
                        l = self.display.getLayer(layer),
                        opacity = event.opacity,
                        params = {},
                        e = null;

                    if (opacity === undefined) {
                        params = {
                            layer: layer,
                            opacity: parseFloat(l.find('.opacity')
                                .slider("value"))
                        },                        
                        e = new mol.bus.Event('layer-opacity', params);
                        self.bus.fireEvent(e);
                    }
                }
            );

            this.bus.addHandler(
                'add-layers',
                function(event) {
                    var bounds = null;
                    _.each(
                        event.layers,
                        function(layer) { // Removes duplicate layers.
                            if (self.display.getLayer(layer).length > 0) {
                                event.layers = _.without(event.layers, layer);
                            }
                        }
                    );
                    _.each(
                        event.layers,
                        function(layer) {
                            var extent,
                                layer_bounds;
                            try {
                                extent = $.parseJSON(layer.extent);
                                layer_bounds = new google.maps.LatLngBounds(
                                    new google.maps.LatLng(
                                        extent.sw.lat,extent.sw.lng
                                    ),
                                    new google.maps.LatLng(
                                        extent.ne.lat,extent.ne.lng
                                    )
                                );
                                if(!bounds) {
                                    bounds = layer_bounds;
                                } else {
                                    bounds.union(layer_bounds)
                                }
                                
                            }
                            catch(e) {
                                //invalid extent
                            }
                        }
                    )
                    self.addLayers(event.layers);
                    if(bounds != null) {
                        self.map.fitBounds(bounds)
                    }
                }
            );
            
            this.bus.addHandler(
                'layer-display-toggle',
                function(event) {
                    var params = null,
                    e = null;

                    if (event.visible === undefined) {
                        self.display.toggle();
                        params = {visible: self.display.is(':visible')};
                    } else {
                        self.display.toggle(event.visible);
                    }
                }
            );
            
            this.bus.addHandler(
                'layers-toggle',
                function(event) {
                    self.layersToggle(event);
                }
            );
            
            this.bus.addHandler(
                'layer-click-toggle',
                function(event) {
                    
                    self.clickDisabled = event.disable;
                    
                    //true to disable
                    if(event.disable) {
                        self.map.overlayMapTypes.forEach(
                          function(mt) {
                              mt.interaction.remove();
                              mt.interaction.clickAction = "";
                           }
                        );
                    } else {
                        _.any($(self.display.list).children(),
                            function(layer) {
                                if($(layer).find('.layer')
                                        .hasClass('selected')) {    
                                    self.map.overlayMapTypes.forEach(
                                        function(mt) {
                                            if(mt.name == $(layer).attr('id')) {      
                                                mt.interaction.add();
                                                mt.interaction.clickAction
                                                    = "full";
                                            } else {
                                                mt.interaction.remove();
                                                mt.interaction.clickAction 
                                                    = "";
                                            }

                                        }
                                    );
                                    
                                    return true;     
                                }
                            }
                        );
                    }
                }
            );
        },

        /**
         * Fires the 'add-map-control' event. The mol.map.MapEngine handles
         * this event and adds the display to the map.
         */
        fireEvents: function() {
            var params = {
                    display: this.display,
                    slot: mol.map.ControlDisplay.Slot.BOTTOM,
                    position: google.maps.ControlPosition.TOP_RIGHT
                },
                event = new mol.bus.Event('add-map-control', params);

            this.bus.fireEvent(event);
        },

        /**
         * Sorts layers so that they're grouped by name. Within each named
         * group, they are sorted by type_sort_order set in the types table.
         *
         * @layers array of layer objects {name, type, ...}
         */
        sortLayers: function(layers) {
            return _.flatten(
                _.groupBy(
                    _.sortBy(
                        layers,
                        function(layer) {
                            return layer.type_sort_order;
                        }
                    ),
                    function(group) {
                        return(group.name);
                    }
                 )
             );
        },

        /**
         * Adds layer widgets to the map. The layers parameter is an array
         * of layer objects {id, name, type, source}.
         */

        addLayers: function(layers) {
            var all = [],
                layerIds = [],
                sortedLayers = this.sortLayers(layers),
                wasSelected = this.display.find('.layer.selected'),
                o = {};

            _.each(
                sortedLayers,
                function(layer) {
                    var l = this.display.addLayer(layer),
                        self = this,
                        opacity = null;

                    self.bus.fireEvent(
                        new mol.bus.Event('show-layer-display-toggle')
                    );

                    //disable interactivity to start
                    self.map.overlayMapTypes.forEach(
                        function(mt) {
                            mt.interaction.remove();
                            mt.interaction.clickAction = "";
                        }
                    );
                    
                    //Hack so that at the end 
                    //we can fire opacity event with all layers
                    all.push({layer:layer, l:l, opacity:opacity});
                    
                    //style legends initially
                    o = self.parseLayerStyle(layer, "orig");
                                    
                    //initalize css
                    self.updateLegendCss(
                        $(l).find('.styler'), 
                        o, 
                        layer,
                        layer.orig_opacity
                    );

                    //Close handler for x button 
                    //fires a 'remove-layers' event.
                    l.close.click(
                        function(event) {
                            var params = {
                                  layers: [layer]
                                },
                                e = new mol.bus.Event('remove-layers',  params);

                            self.bus.fireEvent(e);
                            l.remove();
                            
                            //Hide the layer widget toggle in the main menu 
                            //if no layers exist
                            if(self.map.overlayMapTypes.length == 0) {
                                self.bus.fireEvent(
                                    new mol.bus.Event(
                                        'hide-layer-display-toggle'));
                                        
                                $(self.display.styleAll)
                                    .prop('disabled', false);
                                $(self.display.styleAll).qtip('destroy');
                                        
                                self.display.toggle(false);
                            }
                            event.stopPropagation();
                            event.cancelBubble = true;
                        }
                    );

                    //Click handler for zoom button 
                    //fires 'layer-zoom-extent'
                    //and 'show-loading-indicator' events.
                    l.zoom.click(
                        function(event) {
                            var params = {
                                    layer: layer,
                                    auto_bound: true
                                },
                                extent = eval('({0})'.format(layer.extent)),
                                bounds = new google.maps.LatLngBounds(
                                            new google.maps.LatLng(
                                                extent.sw.lat, 
                                                extent.sw.lng), 
                                            new google.maps.LatLng(
                                                extent.ne.lat, 
                                                extent.ne.lng));
                                                
                            if(!$(l.layer).hasClass('selected')){
                                l.layer.click();
                            }
                            self.map.fitBounds(bounds);

                            event.stopPropagation();
                            event.cancelBubble = true;
                        }
                    );
                    
                    // Click handler for style toggle 
                    l.styler.click(
                        function(event) {
                            _.each(
                                self.display.layers,
                                function(layer) {
                                    var l, 
                                        b;
                                    
                                    l = self.display.getLayer(layer);
                                    b = $(l).find('.styler');
                                    $(b).prop('disabled', false);
                                    $(b).qtip('destroy');
                                }
                            );
                             
                            self.displayLayerStyler(this, layer);
                            
                            event.stopPropagation();
                            event.cancelBubble = true;
                        }
                    );
                    
                    l.layer.click(
                        function(event) {
                            var boo = false,
                                isSelected = false;

                            $(l.layer).focus();
                            
                            if($(this).hasClass('selected')) {
                                $(this).removeClass('selected');
                                
                                //unstyle previous layer
                                boo = false;
                            } else {
                                
                                if($(self.display)
                                        .find('.selected').length > 0) {       
                                    //get a reference to this layer    
                                    self.toggleLayerHighlight(
                                        self.display
                                            .getLayerById(
                                                $(self.display)
                                                    .find('.selected')
                                                        .parent()
                                                            .attr('id')),
                                                            false,
                                                            false);
                                }
                                
                                $(self.display).find('.selected')
                                    .removeClass('selected');
                                    
                                $(this).addClass('selected');
                                
                                //style selected layer
                                boo = true;
                                isSelected = true;
                            }
                            
                            self.map.overlayMapTypes.forEach(
                                function(mt) {
                                    if(mt.name == layer.id && 
                                       $(l.layer).hasClass('selected')) {
                                        if(!self.clickDisabled) {
                                           mt.interaction.add();
                                           mt.interaction.clickAction = "full";
                                        } else {
                                           mt.interaction.remove();
                                           mt.interaction.clickAction = "";
                                        }
                                    } else {
                                        mt.interaction.remove();
                                        mt.interaction.clickAction = "";
                                    }
                                }
                            )
                            
                            if(self.clickDisabled) {
                                isSelected = false;
                            }
                            
                            self.toggleLayerHighlight(layer,boo,isSelected);
                            
                            event.stopPropagation();
                            event.cancelBubble = true;
                        }
                    );
                    l.toggle.attr('checked', true);

                    // Click handler for the toggle button.
                    l.toggle.click(
                        function(event) {
                            var showing = $(event.currentTarget).is(':checked'),
                                params = {
                                    layer: layer,
                                    showing: showing
                                },
                                e = new mol.bus.Event('layer-toggle', params);

                            self.bus.fireEvent(e);
                            event.stopPropagation();
                            event.cancelBubble = true;
                        }
                    );
                    l.source.click(
                        function(event) {
                            self.bus.fireEvent(
                                new mol.bus.Event(
                                    'metadata-toggle',
                                    {params : {
                                        dataset_id: layer.dataset_id,
                                        title: layer.dataset_title
                                    }}
                                )
                            );
                            event.stopPropagation();
                            event.cancelBubble = true;
                        }
                    );
                    l.type.click(
                        function(event) {
                            self.bus.fireEvent(
                                new mol.bus.Event(
                                    'metadata-toggle',
                                    {params : {
                                        type: layer.type,
                                        title: layer.type_title
                                    }}
                                )
                            );
                            event.stopPropagation();
                            event.cancelBubble = true;
                        }
                    )
                    self.display.toggle(true);

                },
                this
            );

            // All of this stuff ensures layer orders are correct on map.
            layerIds = _.map(
                sortedLayers,
                function(layer) {
                    return layer.id;
                },
                this);
                
            this.bus.fireEvent(
                new mol.bus.Event(
                    'reorder-layers', 
                    {layers:layerIds}
                )
            );

            if(sortedLayers.length == 1) {
                //if only one new layer is being added
                //select it
                this.display.list.find('.layer')
                    [this.display.list.find('.layer').length-1].click();
            } else if(sortedLayers.length > 1) {
                //if multiple layers are being added
                //layer clickability returned to the
                //previously selected layer
                
                if(wasSelected.length > 0) {
                    this.map.overlayMapTypes.forEach(
                        function(mt) {
                            if(mt.name == wasSelected.parent().attr("id")) {
                                mt.interaction.add();
                                mt.interaction.clickAction = "full";
                            } else {
                                mt.interaction.remove();
                                mt.interaction.clickAction = "";
                            }
                        }
                    );
                }
                
            }
            
            //done making widgets, toggle on if we have layers.
            if(layerIds.length>0) {
                this.layersToggle({visible:true});
            }
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
                                    o.s1 = $('#showFill1Palette')
                                             .spectrum("get")
                                                .toHexString();
                                    o.s2 = $('#showFill2Palette')
                                             .spectrum("get")
                                                .toHexString();
                                    o.s3 = $('#showFill3Palette')
                                             .spectrum("get")
                                                .toHexString();
                                    o.s4 = $('#showFill4Palette')
                                             .spectrum("get")
                                                .toHexString();
                                     
                                    //TODO issue #175 replace iucn ref               
                                    if(layer.source == "iucn") {
                                        o.s5 = $('#showFill5Palette')
                                             .spectrum("get")
                                                .toHexString();  
                                        o.p = $('#showFill6Palette')
                                             .spectrum("get")
                                                .toHexString();         
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
                   pickers = '' +
                       '<span class="seasonLabel">Breeding</span>' +
                       '<div class="colorPicker">' + 
                       '  <span class="stylerLabel">Fill:&nbsp</span>' + 
                       '  <input type="text" id="showFill2Palette" />' +
                       '</div>' +
                       '<span class="seasonLabel">Resident</span>' +
                       '<div class="colorPicker">' + 
                       '  <span class="stylerLabel">Fill:&nbsp</span>' + 
                       '  <input type="text" id="showFill1Palette" />' +
                       '</div>' +
                       '<span class="seasonLabel">Non-breeding</span>' +
                       '<div class="colorPicker">' + 
                       '  <span class="stylerLabel">Fill:&nbsp</span>' + 
                       '  <input type="text" id="showFill3Palette" />' +
                       '</div>' +
                       '<span class="seasonLabel">Passage</span>' +
                       '<div class="colorPicker">' + 
                       '  <span class="stylerLabel">Fill:&nbsp</span>' + 
                       '  <input type="text" id="showFill4Palette" />' +
                       '</div>';
                   
                   //TODO issue #175 replace iucn ref                           
                   if (layer.source == "iucn") {
                       pickers+=''+
                           '<span class="seasonLabel">' + 
                               'Seasonality Uncertain</span>' +
                           '<div class="colorPicker">' + 
                           '  <span class="stylerLabel">Fill:&nbsp</span>' + 
                           '  <input type="text" id="showFill5Palette" />' +
                           '</div>'+ 
                           '<span class="seasonLabel">' + 
                               'Extinct or Presence Uncertain</span>' +
                           '<div class="colorPicker">' + 
                           '  <span class="stylerLabel">Fill:&nbsp</span>' + 
                           '  <input type="text" id="showFill6Palette" />' +
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
                objs,
                max,
                min,
                layOpa;    
                            
                if(lay.type == "range") {
                   objs = [ {name: '#showFill1Palette', 
                             color: currSty.s1, 
                             def: origSty.s1},
                            {name: '#showFill2Palette', 
                             color: currSty.s2, 
                             def: origSty.s2},
                            {name: '#showFill3Palette', 
                             color: currSty.s3, 
                             def: origSty.s3},
                            {name: '#showFill4Palette', 
                             color: currSty.s4, 
                             def: origSty.s4},
                            {name: '#showBorderPalette', 
                             color: currSty.border, 
                             def: origSty.border}       
                          ];
                   
                   //TODO issue #175 replace iucn ref           
                   if(lay.source == "iucn") {
                       objs.push({name: '#showFill5Palette', 
                                  color: currSty.s5, 
                                  def: origSty.s5});
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

                layOpa = reset ? lay.orig_opacity : lay.opacity;
                        
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
            
        parseLayerStyle: function(layer, original) {
            var o,
                fillStyle, borderStyle, sizeStyle,
                style,
                s1Style, s2Style, s3Style, s4Style, s5Style, pStyle,
                s1, s2, s3, s4, s5, p;
                
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
                    s1Style = style.substring(
                                    style.indexOf('seasonality=1'),
                                    style.length-1);
                                        
                    s1 = s1Style.substring(
                                    s1Style.indexOf('polygon-fill'),
                                    s1Style.length-1);
                                
                    s2Style = style.substring(
                                    style.indexOf('seasonality=2'),
                                    style.length-1);
                                        
                    s2 = s2Style.substring(
                                    s2Style.indexOf('polygon-fill'),
                                    s2Style.length-1);
                                
                    s3Style = style.substring(
                                    style.indexOf('seasonality=3'),
                                    style.length-1);
                                        
                    s3 = s3Style.substring(
                                    s3Style.indexOf('polygon-fill'),
                                    s3Style.length-1);
                                
                    s4Style = style.substring(
                                    style.indexOf('seasonality=4'),
                                    style.length-1);
                                        
                    s4 = s4Style.substring(
                                    s4Style.indexOf('polygon-fill'),
                                    s4Style.length-1);             
                                
                    o = {s1: s1.substring(
                                    s1.indexOf('#'),
                                    s1.indexOf(';')),
                         s2: s2.substring(
                                    s2.indexOf('#'),
                                    s2.indexOf(';')),
                         s3: s3.substring(
                                    s3.indexOf('#'),
                                    s3.indexOf(';')),
                         s4: s4.substring(
                                    s4.indexOf('#'),
                                    s4.indexOf(';'))};
                    
                    //TODO issue #175 replace iucn ref    
                    if(layer.source == "iucn") {
                        s5Style = style.substring(
                                    style.indexOf('seasonality=5'),
                                    style.length-1);
                                        
                        s5 = s5Style.substring(
                                    s5Style.indexOf('polygon-fill'),
                                    s5Style.length-1);           
                                    
                        o.s5 = s5.substring(
                                    s5.indexOf('#'),
                                    s5.indexOf(';'));
                                    
                        pStyle = style.substring(
                                    style.indexOf('presence=4'),
                                    style.length-1);
                                        
                        p = pStyle.substring(
                                    pStyle.indexOf('polygon-fill'),
                                    pStyle.length-1);           
                                    
                        o.p = p.substring(
                                    p.indexOf('#'),
                                    p.indexOf(';'));            
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
                                style, 'seasonality=4', newStyle.s4, true, 
                                'polygon-fill');            
                    
                    //TODO issue #175 replace iucn ref                
                    if(layer.source == "iucn") {
                        style = this.changeStyleProperty(
                                style, 'seasonality=5', newStyle.s5, true, 
                                'polygon-fill');
                                
                        style = this.changeStyleProperty(
                                style, 'presence=4', newStyle.p, true, 
                                'polygon-fill');
                        style = this.changeStyleProperty(
                                style, 'presence=5', newStyle.p, true, 
                                'polygon-fill'); 
                        style = this.changeStyleProperty(
                                style, 'presence=6', newStyle.p, true, 
                                'polygon-fill');                                         
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
            
        updateLegendCss: function(button, o, layer, opa) {
            if(layer.type == "range") {          
                $(button).find('.s1').css({
                    'background-color':o.s2, 
                    'opacity':opa});
                $(button).find('.s2').css({
                    'background-color':o.s1,
                    'opacity':opa});
                $(button).find('.s3').css({
                    'background-color':o.s3,
                    'opacity':opa});
                $(button).find('.s4').css({
                    'background-color':o.s4,
                    'opacity':opa});
                
                $(button).find('.legend-seasonal')
                    .css({
                        'border-color':o.border,
                        'border-width':o.size+"px",
                        'opacity':opa
                    }
                );                                       
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
                opacity: opa
            };

            //store the opacity on the layer object
            lay.opacity = oparams.opacity;

            self.bus.fireEvent(new mol.bus.Event(
                'layer-opacity', oparams));
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
                                visible ? 1 : oldStyle.size, 
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
            
        /**
        * Add sorting capability to LayerListDisplay, when a result is
        * drag-n-drop, and the order of the result list is changed,
        * then the map will re-render according to the result list's order.
        **/

        initSortable: function() {
            var self = this, 
                display = this.display;

            display.list.sortable({
                update : function(event, ui) {
                    var layers = [], 
                        params = {}, 
                        e = null;

                    $(display.list)
                        .find('.layerContainer')
                            .each(function(i, el) {
                                layers.push($(el).attr('id'));
                    });

                    params.layers = layers;
                    e = new mol.bus.Event('reorder-layers', params);
                    self.bus.fireEvent(e);
                }
            });
        }
    });

    mol.map.layers.LayerDisplay = mol.mvp.View.extend({
        init: function(layer) {
            var html = '' +
                '<div class="layerContainer">' +
                '  <div class="layer">' +
                '    <button title="Click to edit layer style." ' +
                            'class="styler">' + 
                '      <div class="legend-point"></div> ' +
                '      <div class="legend-polygon"></div> ' +
                '      <div class="legend-seasonal">' +
                '        <div class="seasonal s1"></div>' +
                '        <div class="seasonal s2"></div>' +
                '        <div class="seasonal s3"></div>' +
                '        <div class="seasonal s4"></div>' +
                '      </div> ' +
                '    </button>' +
                '    <button class="source" title="Layer Source: {5}">' +
                '      <img src="/static/maps/search/{0}.png">' +
                '    </button>' +
                '    <button class="type" title="Layer Type: {6}">' +
                '      <img src="/static/maps/search/{1}.png">' +
                '    </button>' +
                '    <div class="layerName">' +
                '      <div class="layerRecords">{4}</div>' +
                '      <div title="{2}" class="layerNomial">{2}</div>' +
                '      <div title="{3}" class="layerEnglishName">{3}</div>'+
                '    </div>' +
                '    <button title="Remove layer." class="close">' + 
                       'x' + 
                '    </button>' +
                '    <button title="Zoom to layer extent." class="zoom">' +
                       'z' +
                '    </button>' +
                '    <label class="buttonContainer">' +
                '       <input class="toggle" type="checkbox">' +
                '       <span title="Toggle layer visibility." ' +
                        'class="customCheck"></span>' + 
                '    </label>' +
                '   </div>' +
                '   <div class="break"></div>' +
                '</div>',
                self = this;

            this._super(
                html.format(
                    layer.source_type,
                    layer.type,
                    layer.name,
                    layer.names,
                    (layer.feature_count != null) ?
                        '{0} features'.format(layer.feature_count) : '',
                    layer.source_title,
                    layer.type_title
                )
            );
            
            this.attr('id', layer.id);
            this.toggle = $(this).find('.toggle').button();
            this.styler = $(this).find('.styler');
            this.zoom = $(this).find('.zoom');
            if(layer.extent == null) {
                this.zoom.css('visibility','hidden');
            }
            this.info = $(this).find('.info');
            this.close = $(this).find('.close');
            this.type = $(this).find('.type');
            this.source = $(this).find('.source');
            this.layer = $(this).find('.layer');
            this.layerObj = layer;
            
            //legend items
            this.pointLegend = $(this).find('.legend-point');
            this.polygonLegend = $(this).find('.legend-polygon');
            this.seasonalLegend = $(this).find('.legend-seasonal');
            
            if(layer.style_table == "points_style") {
                this.polygonLegend.hide();
                this.seasonalLegend.hide();
                
                this.pointLegend.addClass(layer.type);
            } else {
                this.pointLegend.hide();
                
                //TODO issue #175 replace iucn ref    
                if(layer.source == "iucn" || layer.source == "jetz") {
                    this.polygonLegend.hide();
                    this.seasonalLegend.addClass(layer.source);                       
                } else {
                    this.seasonalLegend.hide();
                    this.polygonLegend.addClass(layer.type);
                }
            }
        }
    });

    mol.map.layers.LayerListDisplay = mol.mvp.View.extend({
        init: function() {
            var html = '' +
                '<div class="mol-LayerControl-Layers">' +
                    '<div class="layers widgetTheme">' +
                        '<div class="layersHeader">' +
                            '<button class="layersToggle button">▲</button>' +
                            'Layers' +
                        '</div>' +
                        '<div class="layersContainer">' +
                            '<div class="scrollContainer">' +
                                '<div id="sortable"></div>' +
                            '</div>' +
                            '<div class="pageNavigation">' +
                                '<button class="removeAll">' +
                                    'Remove All' +
                                '</button>' +
                                '<button class="toggleAll">' +
                                    'Toggle All' +
                                '</button>' +
                                '<button class="resetAll">' +
                                    'Reset All' +
                                '</button>' +
                                '<button class="styleAll">' +
                                    'Style All' +
                                '</button>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>';

            this._super(html);
            this.list = $(this).find("#sortable");
            this.removeAll = $(this).find(".removeAll");
            this.toggleAll = $(this).find(".toggleAll");
            this.resetAll = $(this).find(".resetAll");
            this.styleAll = $(this).find(".styleAll");
            this.open = false;
            this.views = {};
            this.layers = [];
            this.layersToggle = $(this).find(".layersToggle");
            this.layersWrapper = $(this).find(".layers");
            this.layersContainer = $(this).find(".layersContainer");
            this.layersHeader = $(this).find(".layersHeader");
            this.expanded = true;
        },

        getLayer: function(layer) {
            return $(this).find('#{0}'.format(escape(layer.id)));
        },

        getLayerById: function(id) {
            return _.find(this.layers, function(layer){ 
                            return layer.id === id; });
        },

        addLayer: function(layer) {
            var ld = new mol.map.layers.LayerDisplay(layer);
            this.list.append(ld);
            this.layers.push(layer);
            return ld;
        },

        render: function(howmany, order) {
                var self = this;
            this.updateLayerNumber();
            return this;
        },

        updateLayerNumber: function() {
            var t = 0;
            _(this.layers).each(function(a) {
                if(a.enabled) t++;
            });
            $(this).find('.layer_number').html(t + " LAYER"+ (t>1?'S':''));
        },

        sortLayers: function() {
            var order = [];
            $(this).find('.layerContainer').each(function(i, el) {
                order.push($(el).attr('id'));
            });
            this.bus.emit("map:reorder_layers", order);
        },

        open: function(e) {
            if(e) e.preventDefault();
            this.el.addClass('open');
            this.el.css("z-index","100");
            this.open = true;
        },

        close: function(e) {
            this.el.removeClass('open');
            this.el.css("z-index","10");
            this.open = false;
        },

        sort_by: function(layers_order) {
            this.layers.sort(function(a, b) {
                                 return _(layers_order).indexOf(a.name) -
                                     _(layers_order).indexOf(b.name);
                             });
            this.open = true;
            this.hiding();
        },

        hiding: function(e) {
            var layers = null;

            if (!this.open) {
                return;
            }

            // put first what are showing
            this.layers.sort(
                function(a, b) {
                    if (a.enabled && !b.enabled) {
                        return -1;
                    } else if (!a.enabled && b.enabled) {
                        return 1;
                    }
                    return 0;
                }
            );
            layers = _(this.layers).pluck('name');
            this.bus.emit("map:reorder_layers", layers);
            this.order = layers;
            this.render(3);
            this.close();
        }
    });
};
