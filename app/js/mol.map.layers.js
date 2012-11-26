mol.modules.map.layers = function(mol) {

    mol.map.layers = {};

    mol.map.layers.LayerEngine = mol.mvp.Engine.extend(
        {
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
                        }
                    );

                }
            },
            addEventHandlers: function() {
                var self = this;
                this.display.removeAll.click (
                    function(event) {

                        $(self.display).find(".close").trigger("click");
                    }
                );
                this.display.toggleAll.click (
                    function(event) {
                        _.each(
                            $(self.display).find(".toggle"),
                            function(checkbox){
                                    checkbox.click({currentTarget : this})
                            }
                        );
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
                                                if(mt.name == $(layer)
                                                                .attr('id')) {      
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
             * Handler for layer opacity changes via UI. It fires a layer-opacity
             * event on the bus, passing in the layer object and its opacity.
             */
            opacityHandler: function(layer, l) {
                return function(event) {
                    var params = {},
                        e = null;

                    l.toggle.attr('checked', true);

                    params = {
                        layer: layer,
                        opacity: parseFloat(l.opacity.slider("value"))
                    },

                    layer.opacity = params.opacity; //store the opacity on the layer object

                    e = new mol.bus.Event('layer-opacity', params);

                    self.bus.fireEvent(e);
                };
            },

            /**
             * Adds layer widgets to the map. The layers parameter is an array
             * of layer objects {id, name, type, source}.
             */

            addLayers: function(layers) {
                var all = [],
                    layerIds = [],
                    sortedLayers = this.sortLayers(layers),
                    first = (this.display.find('.layer').length==0) 
                                ? true : false,
                    wasSelected = this.display.find('.layer.selected');

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

                        //Opacity slider change handler.
                        l.opacity.bind("slide",self.opacityHandler(layer, l));
                        l.opacity.slider("value",layer.opacity);

                        //Close handler for x button 
                        //fires a 'remove-layers' event.
                        l.close.click(
                            function(event) {
                                var params = {
                                      layers: [layer]
                                    },
                                    e = new mol.bus.Event(
                                            'remove-layers', 
                                            params);

                                self.bus.fireEvent(e);
                                l.remove();
                                
                                //Hide the layer widget toggle in the main menu 
                                //if no layers exist
                                if(self.map.overlayMapTypes.length == 0) {
                                    self.bus.fireEvent(
                                        new mol.bus.Event(
                                            'hide-layer-display-toggle'));
                                    self.display.toggle(false);
                                }
                                event.stopPropagation();
                                event.cancelBubble = true;
                            }
                        );

                        //Click handler for zoom button fires 'layer-zoom-extent'
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
                        //TODO replace with a style picker widget (issue #124)
                        l.styler.click(
                            function(event) {   
                                self.displayLayerStyler(this, layer);
                                
                                event.stopPropagation();
                                event.cancelBubble = true;
                            }
                        );
                        
                        l.layer.click(
                            function(event) {
                                $(l.layer).focus();
                                if($(this).hasClass('selected')) {
                                    $(this).removeClass('selected');
                                } else {
                                    $(self.display).find('.selected').removeClass('selected');
                                    $(this).addClass('selected');
                                }

                                self.map.overlayMapTypes.forEach(
                                    function(mt) {
                                        if(mt.name == layer.id && $(l.layer).hasClass('selected')) {
                                            if(!self.clickDisabled) {
                                               mt.interaction.add();
                                               mt.interaction.clickAction = "full"
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
                this.bus.fireEvent(new mol.bus.Event('reorder-layers', {layers:layerIds}));
                
                
               
                // And this stuff ensures correct initial layer opacities on the map.
                _.each(
                    all.reverse(), // Reverse so that layers on top get rendered on top.
                    function(item) {
                        this.opacityHandler(item.layer, item.l)();
                    },
                    this
                );

                if(first) {
                    if(this.display.list.find('.layer').length > 0) {
                        this.display.list.find('.layer')[0].click();
                    }
                } else {
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
                                    if(mt.name ==
                                        wasSelected.parent().attr("id")) {
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
                }
                
                //done making widgets, toggle on if we have layers.
                if(layerIds.length>0) {
                    this.layersToggle({visible:true});
                }
            },
            
            displayLayerStyler: function(button, layer) {
                var table_name, 
                    params = {
                        layer: layer,
                        style: null
                    },
                    self = this,
                    q,
                    layer_tile_style,
                    baseHtml;
                
                layer_tile_style = self.parseLayerStyle(layer);
                
                baseHtml = '' + 
                       '<div class="mol-LayerControl-Styler">' +
                       '  <div class="colorPickers">' +
                       '  </div>' + 
                       '  <div class="pointSlider">' +
                       '  </div>' +
                       '  <div class="buttonWrapper">' +
                       '    <button id="applyStyle">Apply</button>' +
                       '    <button id="cancelStyle">Cancel</button>' +
                       '  </div>' +      
                       '</div>';
                
                $(button).removeData('qtip');
                q = $(button).qtip({
                    content: {
                        text: baseHtml,
                        title: {
                            text: 'Layer Style',
                            button: false
                        }
                    },
                    position: {
                        at: 'left center',
                        my: 'right center'
                    },
                    show: {
                        event: 'click',
                        delay: 0,
                        ready: true,
                        solo: true
                    },
                    hide: false,
                    events: {
                        render: function(event, api) {    
                            self.getStylerLayout(
                                    $(api.elements.content)
                                        .find('.mol-LayerControl-Styler'),
                                    layer);
                                      
                            $(api.elements.content)
                                .find('.sizer')
                                    .slider({
                                        value: layer_tile_style.size, 
                                        min: 1, 
                                        max:8, 
                                        step: 1, 
                                        animate:"slow",
                                        change: function(event, ui) {
                                            $(api.elements.content)
                                                .find('#pointSizeValue')
                                                    .html(ui.value + "px");
                                        }
                                    });
                                    
                             $(api.elements.content)
                                .find('#pointSizeValue')
                                    .html($(api.elements.content)
                                        .find('.sizer')
                                            .slider('value') + "px");                      
                                        
                            $(api.elements.content)
                                .find('#applyStyle').click(
                                    function(event) {
                                        var o = {},
                                            style_desc;
                                        //new function that updates all values
                                        //TODO needs type if statement
                                        
                                        o.fill = $('#showFillPalette')
                                                    .spectrum("get")
                                                        .toHexString();
                                        o.border = $('#showBorderPalette')
                                                    .spectrum("get")
                                                        .toHexString();
                                                        
                                        //not if polygon                
                                        o.size = $(api.elements.content)
                                                    .find('.sizer')
                                                        .slider('value');

                                        style_desc = '#' + 
                                                     layer.dataset_id + 
                                                     self.updateStyle(
                                                         layer,
                                                         layer.tile_style, 
                                                         o);
                                        
                                        params.style = style_desc;
                                        
                                        console.log(params.style);    
                                        
                                        self.bus.fireEvent(
                                            new mol.bus.Event(
                                                'apply-layer-style', 
                                                params));
                                    }
                                );
                                
                            $(api.elements.content)
                                .find('#cancelStyle').click(
                                    function(event) {
                                        $(button).qtip('destroy');
                                    }
                                );
                        },
                        show: function(event, api) {
                            $('#showFillPalette').spectrum({
                                color:layer_tile_style.fill
                            });
                            $('#showBorderPalette').spectrum({
                                color:layer_tile_style.border
                            });
                        }
                    }
                });
                  
                //keep the style around for later        
                layer.style = params.style; 
            },
            
            getStylerLayout: function(element, layer) {
                var pointsPickers,
                    pointsSizer;
                    
                /*
                styler = '' + 
                   '<div class="mol-LayerControl-Styler">' +
                   '  <div class="colorPickers">' +
                   '    <div class="colorPicker">' + 
                   '      <span class="stylerLabel">Fill:&nbsp</span>' + 
                   '      <input type="text" id="showFillPalette" />' +
                   '    </div>' +
                   '    <div class="colorPicker">' + 
                   '      <span class="stylerLabel">Border:&nbsp</span>' + 
                   '      <input type="text"' +
                          'id="showBorderPalette" />' +
                   '    </div>' +
                   '  </div>' +
                   '  <div class="pointSlider">' +
                   '    <span class="sliderLabel">Size:&nbsp</span>' +
                   '    <div class="pointSizeContainer">' +
                   '      <div class="sizer"></div>' +
                   '    </div>' +
                   '    <span id="pointSizeValue">8px</span>' +
                   '  </div>' + 
                   '  <div class="buttonWrapper">' +
                   '    <button id="applyStyle">Apply</button>' +
                   '    <button>Cancel</button>' +
                   '  </div>' +      
                   '</div>';
                */    
                       
                if(layer.style_table == "points_style") {
                   pointsPickers = '' + 
                       '<div class="colorPicker">' + 
                       '  <span class="stylerLabel">Fill:&nbsp</span>' + 
                       '  <input type="text" id="showFillPalette" />' +
                       '</div>' +
                       '<div class="colorPicker">' + 
                       '  <span class="stylerLabel">Border:&nbsp</span>' + 
                       '  <input type="text" id="showBorderPalette" />' +
                       '</div>';
                       
                   pointsSizer = '' +
                       '<span class="sliderLabel">Size:&nbsp</span>' +
                       '  <div class="pointSizeContainer">' +
                       '    <div class="sizer"></div>' +
                       '  </div>' +
                       '<span id="pointSizeValue">8px</span>';
                   
                   $(element).find('.colorPickers').prepend(pointsPickers);
                   $(element).find('.pointSlider').prepend(pointsSizer);
                } else {
                    if(layer.source == "iucn") {
                        style = '#' + layer.dataset_id + '{' + 
                                'line-color: #000000;' + 
                                'line-opacity: 1.0;' + 
                                'line-width: 0;' + 
                                'polygon-opacity:1.0;' +
                                '  [seasonality=1] {' +
                                '    polygon-fill:#9C0;' +
                                '  }' +
                                '  [seasonality=2] {' +
                                '    polygon-fill:#FC0;' +
                                '  }' +
                                '  [seasonality=3] {' +
                                '    polygon-fill:#006BB4;' +
                                '  }' +
                                '  [seasonality=4] {' +
                                '    polygon-fill:#E39C5B;' +
                                '  }' +
                                '  [seasonality=5] {' +
                                '    polygon-fill:#E25B5B;' +
                                '  }' +
                                '}';
                    } else if (layer.source == "jetz") {    
                        style = '#' + layer.dataset_id + '{' + 
                                'line-color: #000000;' + 
                                'line-opacity: 1.0;' + 
                                'line-width: 0;' + 
                                'polygon-opacity:1.0;' +
                                '  [seasonality=1] {' +
                                '    polygon-fill:#FC0;' +
                                '  }' +
                                '  [seasonality=2] {' +
                                '    polygon-fill:#9C0;' +
                                '  }' +
                                '  [seasonality=3] {' +
                                '    polygon-fill:#006BB4;' +
                                '  }' +
                                '  [seasonality=4] {' +
                                '    polygon-fill:#E25B5B;' +
                                '  }' +
                                '}';
                    } else {
                       pointsPickers = '' + 
                           '<div class="colorPicker">' + 
                           '  <span class="stylerLabel">Fill:&nbsp</span>' + 
                           '  <input type="text" id="showFillPalette" />' +
                           '</div>' +
                           '<div class="colorPicker">' + 
                           '  <span class="stylerLabel">Border:&nbsp</span>' + 
                           '  <input type="text" id="showBorderPalette" />' +
                           '</div>';
                           
                       pointsSizer = '' +
                           '<span class="sliderLabel">Width:&nbsp</span>' +
                           '  <div class="pointSizeContainer">' +
                           '    <div class="sizer"></div>' +
                           '  </div>' +
                           '<span id="pointSizeValue">8px</span>';
                       
                       $(element).find('.colorPickers').prepend(pointsPickers);
                       $(element).find('.pointSlider').prepend(pointsSizer);
                    }
                }
            },
            
            parseLayerStyle: function(layer) {
                var o,
                    style = layer.tile_style,
                    fillStyle,
                    borderStyle,
                    sizeStyle;
                
                
                if(layer.style_table == "points_style") {
                    fillStyle = style
                                    .substring(
                                        style.indexOf('marker-fill'),
                                        style.length-1);
                                        
                    borderStyle = style
                                    .substring(
                                        style.indexOf('marker-line-color'),
                                        style.length-1);   
                                        
                    sizeStyle = style
                                    .substring(
                                        style.indexOf('marker-width'),
                                        style.length-1);                  
                    
                    o = {fill: fillStyle
                                  .substring(
                                    fillStyle.indexOf('#'),
                                    fillStyle.indexOf(';')),
                         border: borderStyle
                                  .substring(
                                    borderStyle.indexOf('#'),
                                    borderStyle.indexOf(';')),
                         size: Number($.trim(sizeStyle
                                  .substring(
                                    sizeStyle.indexOf(':')+1,
                                    sizeStyle.indexOf(';'))))};
                } else {
                    if(layer.source == "iucn") {
                        
                    } else if (layer.source == "jetz") {    
                        
                    } else {
                        fillStyle = style
                                    .substring(
                                        style.indexOf('polygon-fill'),
                                        style.length-1);
                                        
                        borderStyle = style
                                    .substring(
                                        style.indexOf('line-color'),
                                        style.length-1); 
                                  
                        sizeStyle = style
                                    .substring(
                                        style.indexOf('line-width'),
                                        style.length-1);                   
                        
                        o = {fill: fillStyle
                                  .substring(
                                    fillStyle.indexOf('#'),
                                    fillStyle.indexOf(';')),
                             border: borderStyle
                                  .substring(
                                    borderStyle.indexOf('#'),
                                    borderStyle.indexOf(';')),
                             size: Number($.trim(sizeStyle
                                  .substring(
                                    sizeStyle.indexOf(':')+1,
                                    sizeStyle.indexOf(';'))))};
                    }
                }
                               
                return o;
            },
            
            changeStyleProperty: function(style, property, newStyle) {
                var updatedStyle,
                    subStyle;
                
                subStyle = style
                            .substring(
                                style.indexOf(property),
                                style.length);
                
                updatedStyle = style.substring(
                                   0,
                                   style.indexOf(property + ":") + 
                                   property.length+1) +
                               newStyle +
                               subStyle.substring(
                                   subStyle.indexOf(";"),
                                   subStyle.length);
                
                return updatedStyle;
            },
            
            updateStyle: function(layer, style, newStyle) {
                var updatedStyle;
                
                if(layer.style_table == "points_style") {
                    
                    style = this.changeStyleProperty(style, 'marker-fill', newStyle.fill);
                    style = this.changeStyleProperty(style, 'marker-line-color', newStyle.border);
                    style = this.changeStyleProperty(style, 'marker-width', newStyle.size);
                
                    updatedStyle = style;
                } else {
                    if(layer.source == "iucn") {
                        
                    } else if (layer.source == "jetz") {    

                    } else {
                        style = this.changeStyleProperty(style, 'line-color', newStyle.border);
                        style = this.changeStyleProperty(style, 'polygon-fill', newStyle.fill);
                        style = this.changeStyleProperty(style, 'line-width', newStyle.size);
                
                        updatedStyle = style;
                    }
                }
                
                
                return updatedStyle;
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
        }
    );

    mol.map.layers.LayerDisplay = mol.mvp.View.extend(
        {
            init: function(layer) {
                var html = '' +
                    '<div class="layerContainer">' +
                    '  <div class="layer">' +
                    '    <button title="Layer styler." class="styler">' + 
                    '      <div class="legend-point"></div> ' +
                    '      <div class="legend-polygon"></div> ' +
                    '      <div class="legend-seasonal">' +
                    '        <div class="seasonal s1"></div>' +
                    '        <div class="seasonal s2"></div>' +
                    '        <div class="seasonal s3"></div>' +
                    '        <div class="seasonal s4"></div>' +
                    '        <div class="seasonal s5"></div>' +
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
                    '      <div title="{3}" class="layerEnglishName">{3}</div>' +
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
                    '   <div class="opacityContainer">' +
                    '      <div class="opacity"/></div>' +
                    '   </div>' +
                    '   <div class="break"></div>' +
                    '  </div>' +
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
                this.opacity = $(this).find('.opacity').slider(
                    {value: 0.5, min: 0, max:1, step: 0.02, animate:"slow"}
                );
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
                    
                    if(layer.source == "iucn") {
                        this.polygonLegend.hide();
                        this.seasonalLegend.addClass(layer.source);                       
                    } else if (layer.source == "jetz") {    
                        this.polygonLegend.hide();
                        $(this.seasonalLegend).find('.s5').hide();
                        this.seasonalLegend.addClass(layer.source);
                    } else {
                        this.seasonalLegend.hide();
                        this.polygonLegend.addClass(layer.type);
                        
                        if(layer.type == "regionalchecklist" 
                            || layer.type == "localinv") {
                            this.polygonLegend.addClass("withborder");
                        } else {
                            this.polygonLegend.addClass("noborder");
                        }
                    }
                }
            }
        }
    );

    mol.map.layers.LayerListDisplay = mol.mvp.View.extend(
        {
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
                                    '<div id="sortable">' +
                                    '</div>' +
                                '</div>' +
                                '<div class="pageNavigation">' +
                                    '<button class="removeAll">' +
                                        'Remove All Layers' +
                                    '</button>' +
                                    '<button class="toggleAll">' +
                                        'Toggle All Layers' +
                                    '</button>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>';

                this._super(html);
                this.list = $(this).find("#sortable");
                this.removeAll = $(this).find(".removeAll");
                this.toggleAll = $(this).find(".toggleAll");
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
                    return _.find(this.layers, function(layer){ return layer.id === id; });
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
        }
    );
};
