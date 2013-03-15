/**
 * This module handles add-layers events and layer-toggle events. tI basically
 * proxies the CartoDB JavaScript API for adding and removing CartoDB layers
 * to and from the map.
 */
mol.modules.map.tiles = function(mol) {

    mol.map.tiles = {};

    /**
     * Based on the CartoDB point density gallery example by Andrew Hill at
     * Vizzuality (andrew@vizzuality.com).
     *
     * @see http://developers.cartodb.com/gallery/maps/densitygrid.html
     */
    mol.map.tiles.TileEngine = mol.mvp.Engine.extend({
        init: function(proxy, bus, map) {
            this.proxy = proxy;
            this.bus = bus;
            this.map = map;
            this.clickAction = 'info';
            this.gmap_events = [];
            this.addEventHandlers();
        },

        addEventHandlers: function() {
            var self = this;
            this.bus.addHandler(
                'layer-click-toggle',
                function(event) {
                    if(event.disable) {
                        self.clickAction = 'list';
                    }
                }
            );
            /**
             * Handler for when the layer-toggle event is fired. This renders
             * the layer on the map if visible, and removes it if not visible.
             * The event.layer is a layer object {id, name, type, source}. event.showing
             * is true if visible, false otherwise.
             */
             this.bus.addHandler(
                'layer-toggle',
                function(event) {
                        var showing = event.showing,
                            layer = event.layer,
                            params = null,
                            e = null;

                        if (showing) {
                            self.map.overlayMapTypes.forEach(
                                function(mt, index) {
                                    if (mt != undefined && 
                                        mt.name == layer.id) {
                                        params = {
                                            layer: layer,
                                            opacity: 1,
                                            style_opacity: layer.style_opacity
                                        };
                                        
                                        layer.opacity = 1;

                                        e = new mol.bus.Event(
                                            'layer-opacity', 
                                            params);
                                        self.bus.fireEvent(e);
                                        return;
                                    }
                                }
                            );
                            //self.renderTiles([layer]);
                        } else { // Remove layer from map.
                            self.map.overlayMapTypes.forEach(
                                function(mt, index) {
                                    if (mt != undefined && 
                                        mt.name == layer.id) {
                                        params = {
                                            layer: layer,
                                            opacity: 0,
                                            style_opacity: layer.style_opacity
                                        };
                                        
                                        layer.opacity = 0;
                                        
                                        e = new mol.bus.Event(
                                            'layer-opacity', 
                                            params
                                        );
                                        self.bus.fireEvent(e);
                                    }
                                }
                            );
                        }
                    }
                );
                /**
                 * Handler for changing layer opacity. The event.opacity is a
                 * number between 0 and 1.0 and the event.layer is an object
                 * {id, name, source, type}.
                 */
                this.bus.addHandler(
                    'layer-opacity',
                    function(event) {
                        var layer = event.layer,
                            opacity = event.opacity,
                            style_opacity = event.style_opacity;
                            
                        if (opacity === undefined) {
                            return;
                        }

                        self.map.overlayMapTypes.forEach(
                            function(maptype, index) {
                                if (maptype.name === layer.id) {
                                    if(opacity == 1) {
                                        maptype.setOpacity(style_opacity);
                                    } else {
                                        maptype.setOpacity(opacity);
                                    }
                                }
                            }
                        );
                    }
                );
                
                /**
                 * Handler for applying cartocss style to a layer.
                 */
                this.bus.addHandler(
                    'apply-layer-style',
                    function(event) {
                        var layer = event.layer,
                            style = event.style;
                            sel = event.isSelected;
 
                        self.map.overlayMapTypes.forEach(
                            function(maptype, index) {
                                //find the overlaymaptype to style
                                if (maptype.name === layer.id) {
                                    //remove it from the map
                                    self.map.overlayMapTypes.removeAt(index);
                                    //add the style
                                    layer.tile_style = style;
                                    //make the layer
                                    self.getTile(layer);
                                    //fix the layer order
                                    self.map.overlayMapTypes.forEach(
                                        function(newmaptype, newindex) {
                                            var mt,
                                                e,
                                                params = {
                                                    layer: layer,
                                                    opacity: layer.opacity,
                                                    style_opacity: 
                                                        layer.style_opacity
                                                };
                                                
                                            if(newmaptype.name === layer.id) {
                                                mt = self.map.overlayMapTypes
                                                        .removeAt(newindex);
                                                self.map.overlayMapTypes
                                                        .insertAt(index, mt);
                                                
                                                e = new mol.bus.Event(
                                                    'layer-opacity', 
                                                    params
                                                );
                                                self.bus.fireEvent(e);
                                                return;
                                            }
                                        }
                                    );
                                }
                            }
                        );
                        
                        
                        
                    }
                );

                /**
                 * Handler for when the add-layers event is fired. This renders
                 * the layers on the map by firing a add-map-layer event. The
                 * event.layers is an array of layer objects {name:, type:}.
                 */
                this.bus.addHandler(
                    'add-layers',
                    function(event) {
                        self.renderTiles(event.layers);
                    }
                );

                /**
                 * Handler for when the remove-layers event is fired. This
                 * functions removes all layers from the Google Map. The
                 * event.layers is an array of layer objects {id}.
                 */
                    this.bus.addHandler(
                    'remove-layers',
                    function(event) {
                        var layers = event.layers,
                            mapTypes = self.map.overlayMapTypes;

                        _.each(
                            layers,
                            function(layer) { // "lid" is short for layer id.
                                var lid = layer.id;
                                mapTypes.forEach(
                                    function(mt, index) { 
                                        if (mt != undefined && mt.name === lid) {
                                            mapTypes.removeAt(index);
                                        }
                                    }
                                );
                            }
                        );
                    }
                );
                /**
                 * Handler for when the reorder-layers event is fired. This 
                 * renders the layers according to the list of layers 
                 * provided
                 */
                this.bus.addHandler(
                     'reorder-layers',
                     function(event) {
                          var layers = event.layers,
                        mapTypes = self.map.overlayMapTypes;

                          _.each(
                               layers,
                               function(lid) { // "lid" is short for layerId.
                                    mapTypes.forEach(
                                         function(mt, index) { 
                                              if ((mt != undefined) && 
                                                  (mt.name === lid)) {
                                                  mapTypes.removeAt(index);
                                                  mapTypes.insertAt(0, mt);
                                              }
                                         }
                                    );
                               }
                          );
                     }
                );
        },

        /**
         * Renders an array a tile layers.
         *
         * @param layers the array of layer objects {name, type}
         */
        renderTiles: function(layers) {
            var overlays = this.map.overlayMapTypes.getArray(),
                newLayers = this.filterLayers(layers, overlays),
                self = this;

            _.each(
                newLayers,
                function(layer) {
                    var maptype = self.getTile(layer);
                },
                self
            );
        },
        /**
         * Returns an array of layer objects that are not already on the 
         * map.
         *
         * @param layers an array of layer object {id, name, type, source}.
         * @params overlays an array of wax connectors.
         */
        filterLayers: function(layers, overlays) {
            var layerIds = _.map(
                    layers,
                    function(layer) {
                        return layer.id;
                    }
                ),
                overlayIds = _.map(
                    overlays,
                    function(overlay) {
                        return overlay.name;
                    }
                ),
                ids = _.without(layerIds, overlayIds);

            return _.filter(
                layers,
                function(layer) {
                    return (_.indexOf(ids, layer.id) != -1);
                },
                this
            );
        },

        /**
         * Closure around the layer that returns the ImageMapType for the tile.
         */
        getTile: function(layer) {
            var self = this,
            maptype = new mol.map.tiles.CartoDbTile(
                        layer, 
                        this.map
                    );
            maptype.onbeforeload = function (){
                self.bus.fireEvent(
                    new mol.bus.Event(
                        "show-loading-indicator",
                        {source : layer.id}
                    )
                )
            };
            
            maptype.onafterload = function (){
                self.bus.fireEvent(
                    new mol.bus.Event(
                        "hide-loading-indicator",
                        {source : layer.id}
                    )
                )
            };
            this.map.overlayMapTypes.insertAt(0,maptype.layer);
        }
    });

    mol.map.tiles.CartoDbTile = Class.extend({
        init: function(layer, map) {
            var sql =  "" + //c is in case cache key starts with a number
                "SELECT c{4}.* FROM get_tile('{0}','{1}','{2}','{3}') c{4}"
                .format(
                    layer.source, 
                    layer.type, 
                    layer.name, 
                    layer.dataset_id,
                    mol.services.cartodb.tileApi.tile_cache_key
                ),
                urlPattern = '' +
                    'http://{HOST}/tiles/{DATASET_ID}/{Z}/{X}/{Y}.png?'+ 
                    'sql={SQL}'+
                    '&style={TILE_STYLE}',
                style_table_name = layer.style_table,
                pendingurls = [],
                options,
                self = this;
            
            if(layer.tile_style == undefined) {
                layer.tile_style = "#{0}{1}"
                    .format(layer.dataset_id,layer.css);
                layer.style = layer.tile_style;
                layer.orig_style = layer.tile_style;
                layer.orig_opacity = layer.opacity;
                layer.style_opacity = layer.opacity;
                layer.opacity = 1;
            }

            options = {
                // Makes a cartoDb Tile URL and keeps track of it for 
                // layer load/unload events
                getTileUrl: function(tile, zoom) {
                    var y = tile.y,
                        x = tile.x,
                        tileRange = 1 << zoom,
                        url;
                    if (y < 0 || y >= tileRange) {
                        return null;
                    }
                    if (x < 0 || x >= tileRange) {
                        x = (x % tileRange + tileRange) % tileRange;
                    }
                    if(self.onbeforeload != undefined) {
                        self.onbeforeload();
                    }
                    url = urlPattern
                        .replace("{HOST}",mol.services.cartodb.tileApi.host)
                        .replace("{DATASET_ID}",layer.dataset_id)
                        .replace("{SQL}",sql)
                        .replace("{X}",x)
                        .replace("{Y}",y)
                        .replace("{Z}",zoom)
                        .replace("{TILE_STYLE}",
                                 encodeURIComponent(layer.tile_style));
                    
                    pendingurls.push(url);
                    return(url);
                },
                tileSize: new google.maps.Size(256, 256),
                maxZoom: 9,
                minZoom: 0,
                opacity: layer.orig_opacity
            };
            
            this.layer = new google.maps.ImageMapType(options);
            this.layer.layer = layer;
            this.layer.name = layer.id;
            
            //Wrap the stock getTile to add in before/after load events.
            this.baseGetTile = this.layer.getTile;
            this.layer.getTile = function(tileCoord, zoom, ownerDocument) {
                var node = self.baseGetTile(tileCoord, zoom, ownerDocument);
                
                $("img", node).one("load", function() {
                   var index = $.inArray(this.__src__, pendingurls);
                    pendingurls.splice(index, 1);
                    if (pendingurls.length === 0 && 
                        self.onafterload != undefined) {
                            self.onafterload();
                    }
                }).one("error", function() {
                    var index = $.inArray(this.__src__, pendingurls);
                    pendingurls.splice(index, 1);
                    if (pendingurls.length === 0) {
                        self.onafterload();
                    }
                });
                return node;
            };
        }
    });
};