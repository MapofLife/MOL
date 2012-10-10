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
            this.gmap_events = [];
            this.addEventHandlers();
        },

        addEventHandlers: function() {
            var self = this;

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
                                    if (mt != undefined && mt.name == layer.id) {
                                        params = {
                                            layer: layer,
                                            opacity: mt.opacity_visible
                                        };
                                        e = new mol.bus.Event('layer-opacity', params);
                                        self.bus.fireEvent(e);
                                        //if(maptype.interaction != undefined) {
                                        //    maptype.interaction.add();
                                        //    maptype.interaction.clickAction="full"
                                        //}
                                        return;
                                    }
                                }
                            );
                            //self.renderTiles([layer]);
                        } else { // Remove layer from map.
                            self.map.overlayMapTypes.forEach(
                                function(mt, index) {
                                    if (mt != undefined && mt.name == layer.id) {
                                        mt.opacity_visible = mt.opacity;
                                        params = {
                                            layer: layer,
                                            opacity: 0
                                        };
                                        e = new mol.bus.Event(
                                            'layer-opacity', 
                                            params
                                        );
                                        self.bus.fireEvent(e);
                                        if(mt.interaction != undefined) {
                                            mt.interaction.remove();
                                            mt.interaction.clickAction="";
                                        }
                                        //self.map.overlayMapTypes.removeAt(index);
                                    }
                                }
                            );
                        }
                    }
                );

                /**
                 * Handler for zoom to extent events. The event has a layer
                 * object {id, name, source, type}.
                 */
                this.bus.addHandler(
                    'layer-zoom-extent',
                    function(event) {
                        var layer = event.layer;
                        self.zoomToExtent(layer);
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
                            opacity = event.opacity;

                        if (opacity === undefined) {
                            return;
                        }

                        self.map.overlayMapTypes.forEach(
                            function(maptype, index) {
                                if (maptype.name === layer.id) {
                                    maptype.setOpacity(opacity);
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
                                            if(mt.interaction != undefined) {
                                                mt.interaction.remove();
                                            }
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
             * Closure around the layer that returns the ImageMapType for the 
             * tile.
             */
            getTile: function(layer) {
                var name = layer.name,
                    type = layer.type,
                    self = this,
                    maptype = new mol.map.tiles.CartoDbTile(
                                layer, 
                                layer.style_table, 
                                this.map
                            );
                           
                
                maptype.layer.params.layer.onbeforeload = function (){
                    self.bus.fireEvent(
                        new mol.bus.Event(
                            "show-loading-indicator",
                            {source : layer.id}
                        )
                    )
                };
                maptype.layer.params.layer.onafterload = function (){
                    self.bus.fireEvent(
                        new mol.bus.Event(
                            "hide-loading-indicator",
                            {source : layer.id}
                        )
                    )
                };
            },

            /**
             * Zooms and pans the map to the full extent of the layer. The layer is an
             * object {id, name, source, type}.
             */
             zoomToExtent: function(layer) {
                var self = this,
                    points_sql = "SELECT ST_Extent(the_geom) FROM {0} WHERE lower(scientificname)='{1}'",
                    polygons_sql = "SELECT ST_Extent(the_geom) FROM {0} WHERE scientificname='{1}'",
                    table = layer.type === 'points' ? 'gbif_import' : 'polygons',
                    params = {
                        sql: table === 'gbif_import' ? points_sql.format(table, layer.name.toLowerCase()) : polygons_sql.format(table, layer.name),
                        key: 'extent-{0}-{1}-{2}'.format(layer.source, layer.type, layer.name)
                    },
                    action = new mol.services.Action('cartodb-sql-query', params),
                    success = function(action, response) {
                        if (response.rows[0].st_extent === null) {
                            console.log("No extent for {0}".format(layer.name));
                            self.bus.fireEvent(new mol.bus.Event("hide-loading-indicator", {source : "extentquery"}));
                            return;
                        }
                        var extent = response.rows[0].st_extent,
                            c = extent.replace('BOX(','').replace(')','').split(','),
                            coor1 = c[0].split(' '),
                            coor2 = c[1].split(' '),
                            sw = null,
                            ne = null,
                            bounds = null;

                        sw = new google.maps.LatLng(coor1[1],coor1[0]);
                        ne = new google.maps.LatLng(coor2[1],coor2[0]);
                        bounds = new google.maps.LatLngBounds(sw, ne);
                          self.map.fitBounds(bounds);
                          self.map.panToBounds(bounds);
                      },
                      failure = function(action, response) {
                        console.log('Error: {0}'.format(response));
                    };
                this.proxy.execute(
                    action, 
                    new mol.services.Callback(
                        success, 
                        failure
                    )
                );
              }
        }
     );

    mol.map.tiles.CartoDbTile = Class.extend(
        {
            init: function(layer, table, map) {
                var sql =  "" +
                    "SELECT * FROM " +
                    " get_mol_tile('{0}','{1}','{2}','{3}')".format(
                        layer.source, 
                        layer.type, 
                        layer.name, 
                        layer.dataset_id
                    ),
                    hostname = 'mol.cartodb.com',//window.location.hostname,
                    style_table_name = layer.style_table;
                    info_query = sql; 
                    meta_query = "" +
                        "SELECT * FROM get_feature_metadata(TEXT('{0}'))",
                    tile_style =  null,
                    infowindow = true,
                    hostname = (hostname === 'localhost') ? 
                       '{0}:8080'.format(hostname) : hostname;

                this.layer = new google.maps.CartoDBLayer({
                        tile_name: layer.id,
                        hostname: hostname,
                        map_canvas: 'map_container',
                        map: map,
                        user_name: 'mol',
                        table_name: table,
                        mol_layer: layer,
                        style_table_name: style_table_name,
                        query: sql,
                        info_query: info_query,
                        meta_query: meta_query,
                        tile_style: tile_style,
                        map_style: false,
                        infowindow: infowindow,
                        opacity: 0.5
                });
            }
        }
    );
};