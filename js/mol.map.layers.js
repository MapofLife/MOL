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

                    self.map.overlayMapTypes.clear();
                    $(self.display.styleAll).prop('disabled', false);
                    $(self.display.styleAll).qtip('destroy');

                    $(self.display).find(".close").trigger("click");
                    self.bus.fireEvent(
                                    new mol.bus.Event(
                                        'hide-layer-display-toggle'));

                    $(self.display.styleAll)
                        .prop('disabled', false);
                    $(self.display.styleAll).qtip('destroy');

                    self.display.toggle(false);
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
                            var l;

                            l = self.display.getLayer(layer);

                            self.bus.fireEvent(
                                new mol.bus.Event(
                                    'reset-layer-style',
                                    {params : {
                                        target: this,
                                        layer: layer,
                                        l: l
                                    }}
                                )
                            );
                        }
                    );
                }
            );

            this.display.styleAll.click (
                function(event) {
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

                    self.bus.fireEvent(
                        new mol.bus.Event(
                            'style-all-layers',
                            {params : {
                                target: this,
                                layers: self.display.layers,
                                display: self.display
                            }}
                        )
                    );
                }
            );

            /*
             * Toggle Click Handler for Layer Clicking
             */
            $(this.display.layerClickButton).qtip({
                content: {
                    text: 'Toggle this button to make map features clickable.',
                    title: {
                        text: 'Map Feature Clicks',
                        button: true
                    }

                },
                position: {
                    my: 'top right',
                    at: 'bottom left'
                },
                show: {
                    event: true,
                    ready: true,
                    solo: true,
                    delay: 0
                },
                hide: {
                    fixed: false,
                    event: 'mouseenter'
                }
            });

            this.display.layerClickButton.click(
                function(event) {
                    var params = {};

                    if($(self.display.layerClickButton).hasClass('selected')) {
                        params.action = '';
                        $(self.display.layerClickButton).removeClass('selected');
                        $(self.display.layerClickButton).html("OFF");
                    } else {
                        params.action = 'info';
                        $(self.display.layerClickButton).addClass('selected');
                        $(self.display.layerClickButton).html("ON");
                    }

                    self.bus.fireEvent(
                        new mol.bus.Event('layer-click-action', params));
                }
            );

            this.display.layersToggle.click(
                function(event) {
                    self.layersToggle(event);
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

                    //if false, unselect layer query
                    if(self.clickDisabled) {
                        $(self.display.layerClickButton).removeClass('selected');
                        $(self.display.layerClickButton).html("OFF");
                    }


                }
            );
            this.bus.addHandler(
                'layer-click-action',
                function(event) {

                    if(event.action != 'info') {
                        $(self.display.layerClickButton).removeClass('selected');
                        $(self.display.layerClickButton).html("OFF");
                        self.clickDisabled = true;
                    } else {
                        self.clickDisabled = false;
                        $(self.display.layerClickButton).addClass('selected');
                        $(self.display.layerClickButton).html("ON");
                    }
                }
            )
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

                    //Hack so that at the end
                    //we can fire opacity event with all layers
                    all.push({layer:layer, l:l, opacity:opacity});

                    //style legends initially
                    self.bus.fireEvent(
                        new mol.bus.Event(
                            'initial-legend-style',
                            {params : {
                                layer: layer,
                                l: l
                            }}
                        )
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

                            //if(!$(l.layer).hasClass('selected')){
                            //    l.layer.click();
                            //}
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

                            self.bus.fireEvent(
                                new mol.bus.Event(
                                    'show-styler',
                                    {params : {
                                        target: this,
                                        layer: layer
                                    }}
                                )
                            );

                            event.stopPropagation();
                            event.cancelBubble = true;
                        }
                    );

// Click handler for style toggle
                    l.habitat.click(
                        function(event) {
                            _.each(
                                self.display.layers,
                                function(layer) {
                                    var l,
                                        b;

                                    l = self.display.getLayer(layer);
                                    b = $(l).find('.habitat');
                                    $(b).prop('disabled', false);
                                    $(b).qtip('destroy');
                                }
                            );

                            self.bus.fireEvent(
                                new mol.bus.Event(
                                    'show-refine',
                                    {params : {
                                        target: this,
                                        layer: layer
                                    }}
                                )
                            );

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
                                        .find('.layer.selected').length > 0) {

                                    //toggle layer highlight
                                    self.bus.fireEvent(
                                        new mol.bus.Event(
                                            'toggle-layer-highlight',
                                            {params : {
                                                layer: self.display
                                                         .getLayerById(
                                                           $(self.display)
                                                             .find('.layer.selected')
                                                               .parent()
                                                                 .attr('id')),
                                                visible: false,
                                                selected: false
                                            }}
                                        )
                                    );
                                }

                                $(self.display).find('.layer.selected')
                                    .removeClass('selected');

                                $(this).addClass('selected');

                                //style selected layer
                                boo = true;
                                isSelected = true;
                            }

                            if(self.clickDisabled) {
                                isSelected = false;
                            }

                            //toggle layer highlight
                            self.bus.fireEvent(
                                new mol.bus.Event(
                                    'toggle-layer-highlight',
                                    {params : {
                                        layer: layer,
                                        visible: boo,
                                        selected: isSelected
                                    }}
                                )
                            );

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
            }

            //done making widgets, toggle on if we have layers.
            if(layerIds.length>0) {
                this.layersToggle({visible:true});
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
                    '<div class="layer">' +
                        '<button title="Click to edit layer style." ' +
                            'class="styler">' +
                            '<div class="legend-point"></div>' +
                            '<div class="legend-polygon"></div>' +
                            '<div class="legend-seasonal">' +
                                '<div class="seasonal s1"></div>' +
                                '<div class="seasonal s2"></div>' +
                                '<div class="seasonal s3"></div>' +
                                '<div class="seasonal s4"></div>' +
                            '</div>' +
                        '</button>' +
                        '<button class="source" title="Layer Source: {5}">' +
                            '<img src="/static/maps/search/{0}.png">' +
                        '</button>' +
                        '<button class="type" title="Layer Type: {6}">' +
                                '<img src="/static/maps/search/{1}.png">' +
                        '</button>' +
                        '<div class="layerName">' +
                            '<div class="layerRecords">{4}</div>' +
                            '<div title="{2}" class="layerNomial">{2}</div>' +
                            '<div title="{3}" class="layerEnglishName">' +
                                '{3}' +
                            '</div>' +
                         '</div>' +
                        '<button title="Remove layer." class="close">' +
                            'x' +
                        '</button>' +
                        '<button title="Zoom to layer extent." class="zoom">' +
                            'z' +
                        '</button>' +
                        '<button title="Refine range map using habitat filters." ' +
                            'class="habitat buttons">' +
                            '<img src="/static/maps/layers/habitat.png">' +
                        '</button>' +
                        '<label class="buttonContainer">' +
                            '<input class="toggle" type="checkbox">' +
                                '<span title="Toggle layer visibility." ' +
                                    'class="customCheck"></span>' +
                        '</label>' +
                    '</div>' +
                    '<div class="break"></div>' +
                '</div>',
                self = this;

            this._super(
                html.format(
                    layer.source_type,
                    layer.type,
                    layer.name,
                    layer.names,
                    (layer.feature_count != null) ?
                        '{0}'.format(layer.feature_count) : '',
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
            this.habitat = $(this).find('.habitat');
            this.layerObj = layer;

            //legend items
            this.pointLegend = $(this).find('.legend-point');
            this.polygonLegend = $(this).find('.legend-polygon');
            this.seasonalLegend = $(this).find('.legend-seasonal');
            this.s4 = $(this).find('.s4');

            if(layer.ee_id == null) {
                this.habitat.hide();
            }

            if(layer.style_table == "points_style") {
                this.polygonLegend.hide();
                this.seasonalLegend.hide();
            } else {
                this.pointLegend.hide();

                //TODO issue #175 replace iucn ref
                if(layer.type == "range") {
                    if(layer.source == "jetz" || layer.source == "iucn") {
                       this.polygonLegend.hide();

                       if(layer.source == 'jetz') {
                            this.s4.hide();
                       }
                    } else {
                        this.seasonalLegend.hide();
                    }
                } else {
                    this.seasonalLegend.hide();
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
                            '<button id="layerClickButton" ' +
                                     'class="toggleBtn selected" ' +
                                     'title="Click to activate map layer' +
                                         ' querying.">' +
                                     'ON' +
                            '</button>' +
                            '<span class="title">Identify Layers</span>' +
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
            this.layerClickButton = $(this).find('#layerClickButton');
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
