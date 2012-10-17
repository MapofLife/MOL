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
                                opacity: parseFloat(l.find('.opacity').slider("value"))
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
                                    console.log(
                                        '[Invalid extent for {0} \'{1}\'] {2}'
                                        .format(
                                            layer.dataset_id,
                                            layer.name,
                                            layer.extent
                                        )
                                    );
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
                            _.each(
                                $(self.display.list).children(),
                                function(layer) {
                                    self.map.overlayMapTypes.forEach(
                                        function(mt) {
                                            if(mt.name == $(layer).attr('id') 
                                                && $(layer).find('.layer')
                                                    .hasClass('selected')) {
                                                mt.interaction.add();
                                                mt.interaction.clickAction 
                                                    = "full";
                                            } else {
                                                mt.interaction.remove();
                                                mt.interaction.clickAction = "";
                                            }
                                            
                                        }
                                    );
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
                        slot: mol.map.ControlDisplay.Slot.MIDDLE,
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
                    first = (this.display.find('.layer').length==0) ? true : false,
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
                        
                        //set this correctly
                        //disable interactivity to start
                        self.map.overlayMapTypes.forEach(
                            function(mt) {
                                mt.interaction.remove();
                                mt.interaction.clickAction = "";
                            }
                        );

                        // Hack so that at the end we can fire opacity event with all layers.
                        all.push({layer:layer, l:l, opacity:opacity});

                        // Opacity slider change handler.
                        l.opacity.bind("slide",self.opacityHandler(layer, l));
                        l.opacity.slider("value",layer.opacity);

                        // Close handler for x button fires a 'remove-layers' event.
                        l.close.click(
                            function(event) {
                                var params = {
                                      layers: [layer]
                                    },
                                    e = new mol.bus.Event('remove-layers', params);

                                self.bus.fireEvent(e);
                                l.remove();
                                // Hide the layer widget toggle in the main menu if no layers exist
                                if(self.map.overlayMapTypes.length == 0) {
                                    self.bus.fireEvent(new mol.bus.Event('hide-layer-display-toggle'));
                                    self.display.toggle(false);
                                }
                                event.stopPropagation();
                                event.cancelBubble = true;
                            }
                        );

                        // Click handler for zoom button fires 'layer-zoom-extent'
                        // and 'show-loading-indicator' events.
                        l.zoom.click(
                            function(event) {
                                var params = {
                                        layer: layer,
                                        auto_bound: true
                                },
                                    extent = eval('({0})'.format(layer.extent)),
                                    bounds = new google.maps.LatLngBounds(new google.maps.LatLng(extent.sw.lat, extent.sw.lng), new google.maps.LatLng(extent.ne.lat, extent.ne.lng));
                                if(!$(l.layer).hasClass('selected')){
                                    l.layer.click();
                                }
                                self.map.fitBounds(bounds);

                                event.stopPropagation();
                                event.cancelBubble = true;
                            }
                        );
                        // Click handler for style toggle button fires 'apply-layer-style'
                        //TODO replace with a style picker widget (issue #124)
                        l.styler.click(
                            function(event) {
                                var params = {
                                        layer: layer,
                                        style: (layer.style) ? '' : '#polygons {polygon-fill:gray}' //turns the layer gray, or goes back to default style.
                                };
                                self.bus.fireEvent(new mol.bus.Event('apply-layer-style', params));
                                layer.style = params.style; // keep the style around for later
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
            },

               /**
                * Add sorting capability to LayerListDisplay, when a result is
             * drag-n-drop, and the order of the result list is changed,
             * then the map will re-render according to the result list's order.
                **/
               initSortable: function() {
                    var self = this,
                         display = this.display;

                    display.list.sortable(
                    {
                            update: function(event, ui) {
                                  var layers = [],
                                  params = {},
                            e = null;

                                  $(display.list).find('.layerContainer').each(
                                function(i, el) {
                                           layers.push($(el).attr('id'));
                                      }
                            );

                            params.layers = layers;
                                  e = new mol.bus.Event('reorder-layers', params);
                                  self.bus.fireEvent(e);
                             }
                        }
                    );


               }
        }
    );

    mol.map.layers.LayerDisplay = mol.mvp.View.extend(
        {
            init: function(layer) {
                var html = '' +
                    '<div class="layerContainer">' +
                    '  <div class="layer">' +
                    '    <button class="source" title="Layer Source: {5}"><img src="/static/maps/search/{0}.png"></button>' +
                    '    <button class="type" title="Layer Type: {6}"><img src="/static/maps/search/{1}.png"></button>' +
                    '    <div class="layerName">' +
                    '        <div class="layerRecords">{4}</div>' +
                    '        <div title="{2}" class="layerNomial">{2}</div>' +
                    '        <div title="{3}" class="layerEnglishName">{3}</div>' +
                    '    </div>' +
                    '    <input class="keycatcher" type="text" />' +
                    '    <button title="Remove layer." class="close">x</button>' +
                    '    <button title="Zoom to layer extent." class="zoom">z</button>' +
                  /*'    <button title="Layer styler." class="styler">s</button>' + */
                    '    <label class="buttonContainer"><input class="toggle" type="checkbox"><span title="Toggle layer visibility." class="customCheck"></span></label>' +
                    '    <div class="opacityContainer"><div class="opacity"/></div>' +
                    '  </div>' +
                    '  <div class="break"></div>' +
                    '</div>';

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
                this.opacity = $(this).find('.opacity').slider({value: 0.5, min: 0, max:1, step: 0.02, animate:"slow"});
                this.toggle = $(this).find('.toggle').button();
                this.styler = $(this).find('.styler');
                this.zoom = $(this).find('.zoom');
                this.info = $(this).find('.info');
                this.close = $(this).find('.close');
                this.type = $(this).find('.type');
                this.source = $(this).find('.source');
                this.layer = $(this).find('.layer');
                this.keycatcher = $(this).find('.keycatcher');
                this.layerObj = layer;


            }
        }
    );

    mol.map.layers.LayerListDisplay = mol.mvp.View.extend(
        {
            init: function() {
                var html = '' +
                    '<div class="mol-LayerControl-Layers widgetTheme">' +
                    '   <div class="layers">' +
                    '       <div class="layersHeader">' +
                    '           Layers ' +
                   /* '           <a href="#" class="selectNone">none</a>' +
                    '           <a href="#" class="selectAll">all</a>' +*/
                    '       </div>' +
                    '       <div class="scrollContainer">' +
                    '           <div id="sortable">' +
                    '           </div>' +
                    '       </div>' +
                    '       <div class="pageNavigation">' +
                    '           <button class="removeAll">Remove All Layers</button>' +
                    '           <button class="toggleAll">Toggle All Layers</button>' +
                    '       </div>' +
                    '   </div>' +
                    '</div>';

                this._super(html);
                this.list = $(this).find("#sortable");
                this.removeAll = $(this).find(".removeAll");
                this.toggleAll = $(this).find(".toggleAll");
                this.open = false;
                this.views = {};
                this.layers = [];

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
