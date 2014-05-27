mol.modules.map.editor = function(mol) {

    mol.map.editor = {};

    mol.map.editor.EditorEngine = mol.mvp.Engine.extend({
        init : function(proxy, bus, map) {
            this.proxy = proxy;
            this.bus = bus;
            this.map = map;
            this.map.editable_layers = []; //array of user defined layers.
        },

        start : function() {
            this.addEditorDisplay();
            this.addEventHandlers();
            //disable all map clicks
            this.toggleMapLayerClicks(false);
        },

        toggleMapLayerClicks : function(boo) {
            //true to disable
            this.bus.fireEvent(
                new mol.bus.Event('layer-click-toggle', {disable: boo}));
        },
        addEditorDisplay : function() {
            var params = {
                display: null,
                slot: mol.map.ControlDisplay.Slot.TOP,
                position: google.maps.ControlPosition.TOP_RIGHT
            };

            this.display = new mol.map.editor.EditorControlDisplay();
            params.display = this.display;
            this.bus.fireEvent(new mol.bus.Event('add-map-control', params));
        },
        autoSimplify: function(json, status, xhr) {
            alert(json);
        },
        addEditableLayer : function (json, status, xhr) {
            var self = this;
            //this.layer = [];
            if(this.editor == undefined) {
                this.editor = new google.maps.drawing.DrawingManager({
                      drawingMode: google.maps.drawing.OverlayType.POLYGON,
                      drawingControl: true,
                      drawingControlOptions: {
                        position: google.maps.ControlPosition.TOP_CENTER,
                        drawingModes: [
                          google.maps.drawing.OverlayType.POLYGON
                        ]
                      },
                      polygonOptions: {
                        editable: true,
                        geodesic:true
                      }
                });
                google.maps.event.addListener(
                    this.editor,
                    'overlaycomplete',
                    this.overlayComplete.bind(self)
                );
            }
            this.editor.setMap(this.map);
            this.editor.polygonOptions.name = this.current_layer.id;
            this.bus.fireEvent(new mol.bus.Event('hide-loading-indicator', {source: this.current_layer.dataset_id }))
            if(json != null) {
                _.each(
                    json.rows,
                    function(row) {
                        var geojson = JSON.parse(row.geom),
                            feature = new GeoJSON(geojson);
                        if(feature.setMap != undefined) {
                            //feature.draggable=true;
                            feature.setOptions({editable:true, geodesic:true,  clickable:true, name: self.current_layer.id});
                            google.maps.event.addListener(
                                feature,
                                'click',
                                self.handleFeatureClick.bind(self, {id: self.current_layer.id, overlay: feature})
                            );
                            google.maps.event.addListener(feature,'rightclick',self.deleteNode);
                            feature.setMap(self.map);
                            self.map.editable_layers.push({id: self.current_layer.id, overlay: feature});
                        } else {

                            _.each(
                                feature,
                                function(f) {
                                    if(f.setMap != undefined) {
                                        //f.draggable=true;
                                        f.setOptions({editable:true, geodesic:true, name: self.current_layer.id});
                                        google.maps.event.addListener(
                                            f,
                                            'click',
                                            self.handleFeatureClick.bind(self, {id: self.current_layer.id, overlay: f})
                                        );
                                        google.maps.event.addListener(f,'rightclick',self.deleteNode);
                                        f.setMap(self.map);
                                    }
                                    self.map.editable_layers.push({id: self.current_layer.id, overlay: f});
                                }
                            );
                        }
                    }
                );
            }
            this.bus.fireEvent(new mol.bus.Event('add-layers',{layers:[this.current_layer]}));
        },
        /*
         * Deletes a node in an editable feature.
         */
        deleteNode: function(mev) {
            var proj = this.map.getProjection(),
                path = this.getPath(),
                vertex = mev.vertex;
                path.removeAt(vertex);
            return false;
        },
        /*
         * Overlay complete event handler
         */
        overlayComplete: function (event) {
            var self = this;
            event.id = this.current_layer.id;
            event.layer = this.current_layer;
            google.maps.event.addListener(
                event.overlay,
                'click',
                self.handleFeatureClick.bind(self, event)
            );
            this.handleFeatureClick(event);
            this.map.editable_layers.push(event);
        },
        /*
         * Shows a dialog on feature click that
         * allows metadata to be edited and the feature to be deleted.
         */
        handleFeatureClick: function(event) {
            var name = event.layer.name,
                display = new mol.map.editor.FeatureOptionsDisplay(name),
                self = this;

            display.cancel.click(
                function(e) {
                    display.dialog('close');
                }
            );
            display.del.click(
                function(e) {
                    event.overlay.setMap(null);
                    display.dialog('close');
                    delete(event);
                }
            );
            display.save.click(
                function(e) {
                    
                    event.description = $(display.description).val();
                    display.dialog('close');
                }
            );
            $(display).dialog({width:650});
        },
        defineRange: function () {
            var display,
                mt = this.map.overlayMapTypes.getAt(0),
                name = "",
                self = this,
                useExisting = false,
                usePoints = false,
                detail = 150000;
            if(mt) {
                name = mt.name.split('--')[1].replace(/_/g, ' ');
                name = '{0}{1}'.format(
                    name[0].toUpperCase(),
                    name.substr(1)
                );
            } else {
                name = '';
            }

            display = new mol.map.editor.NewRangeDialog(name);
            if(name=='') {
                $(display.useExistingContainer).hide();
            }

            display.start.click(
                function(event) {
                    if(name!='') {
                        useExisting = $(display.useExisting).val();
                        usePoints = $(display.usePoints).val();
                        detail = $(display.detail).val();
                    }
                    self.startEditing(
                        $(display.name).val(),
                        $(display.username).val(),
                        useExisting,
                        usePoints,
                        detail
                    );
                    $(display).dialog('close');
                }
            );
            display.cancel.click(
                function(event) {
                    $(display).dialog('close');
                }
            );
            $(display).dialog({width:650});
        },
        storePolygon: function(feature, layer) {
            var q,
                coords  = new Array(),
                path = feature.overlay.getPath(),
                payload = { type: "MultiPolygon", coordinates: new Array()};
            payload.coordinates.push(new Array());
            payload.coordinates[0].push(new Array());

            for (var i = 0; i < path.length; i++) {
              coord = path.getAt(i);
              coords.push( coord.lng() + " " + coord.lat() );
              payload.coordinates[0][0].push([coord.lng(),coord.lat()])
            }

            q = "geojson={0}".format(JSON.stringify(payload)) +
                "&username={0}".format(layer.username) +
                "&scientificname={0}".format(layer.name) +
                "&description={0}".format(feature.description) +
                "&dataset_id={0}".format(layer.dataset_id);

            $.ajax({
              url: "userdata/put",
              type: 'POST',
              dataType: 'jsonp',
                  data: q,
                  success: function() { },
                  error: function() { }
            });
        },
        deleteDataset: function(layer) {
            var q= "dataset_id={0}&name={1}".format(layer.dataset_id,layer.name);

            $.ajax({
              url: "userdata/del",
              type: 'POST',
              dataType: 'jsonp',
                  data: q,
                  success: function() { },
                  error: function() { }
            });
        },
        startEditing: function(name, username, useExisting, usePoints, detail) {
            //TODO: zoom to max layer extent
            //first get a very simplified convex hull of all available maps
            var layers = [], //all current layers
                key = '{0}{1}'.format(name, new Date().getTime()), //unique layer id
                tiles = [],
                gridres = 40075000/(256^this.map.getZoom()),
                tilesql = ''+
                    'SELECT {0} as geom '+
                    'FROM get_tile(\'{1}\',\'{2}\',\'{3}\',\'{4}\') ';
                sql = '' +
                    'SELECT ST_AsGeoJson(' +
                                'ST_Transform(ST_Simplify(ST_Union(' +
                                    'ST_Buffer(g.geom,0)' +
                                '),{1}),4326)' +
                        ') as geom ' +
                    'FROM ({0}) g ',
                count_sql = '' +
                    'SELECT ST_NPoints(ST_Simplify(' +
                                    'ST_Union(' +
                                        'g.geom,0' +
                                    '),10000)' +
                        ') as n ' +
                    'FROM ({0}) g ';
            this.current_layer = {
                    name: name,
                    username: username,
                    type:'custom',
                    type_title: 'User defined layer.',
                    source_title: 'Web user',
                    source_type: 'webuser',
                    source_type_title: 'Web user',
                    source:'webuser',
                    editing: true,
                    dataset_id: key,
                    id: 'layer--{0}--custom--webuser--{1}'
                        .format(name.replace(/ /g, '_'),
                        key),
                    names: '',
                    type_sort_order: 0
            };
            //make an array of layer ids
            this.map.overlayMapTypes.forEach(
                function(mt,i) {
                    if(usePoints) {
                        layers.push(mt.name);
                    }
                }
            );
            tiles = _.map(
                layers,
                function(layer) {
                    var collectsql = (layer.split('--')[2] == 'points') ?
                        'ST_ConcaveHull(ST_Collect(ST_Buffer(the_geom_webmercator,10000)),0.99,true)  ':
                        'ST_SnapToGrid(the_geom_webmercator,10000) ',
                        source = layer.split('--')[3], //source
                        type = layer.split('--')[2], //type
                        name = layer.split('--')[1],
                        dataset_id = layer.split('--')[4];
                    name = '{0}{1}'
                        .format(name[0].toUpperCase(),name.substr(1))
                        .replace('_', ' ');

                    return tilesql.format(
                            collectsql,
                            source,
                            type,
                            name,
                            dataset_id
                    );
                }
            );

            this.bus.fireEvent(new mol.bus.Event('show-loading-indicator', {source: this.current_layer.dataset_id }))
            if(tiles.length>0 && useExisting == "true") {
	            $.getJSON(
	                mol.services.cartodb.sqlApi.jsonp_url.format(
	                    sql.format(
	                        tiles.join(' UNION '),
	                        detail
	                    )
	                ),
	                this.addEditableLayer.bind(this)
	            );
            } else if(false) {//tiles.length>0 && useExisting == "true" && detail == "auto"){
                $.getJSON(
                    mol.services.cartodb.sqlApi.jsonp_url.format(
                        count_sql.format(
                            tiles.join(' UNION ')
                        )
                    ),
                    this.autoSimplify.bind(this)
                );
            } else {
                this.addEditableLayer();
            }
        },
        addEventHandlers : function () {
            var self = this;
            /*
             *  Makes a layer editable by removing it from the map and adding it
             *  back as an editable polygon, simplified to match the zoom level
             */
            this.display.defineRange.click(
                  function(event) {
                      self.defineRange();
                  }
            );
            this.bus.addHandler(
                'remove-layers',
                function(event) {
                    var layers = event.layers;
                    _.each(
                        layers,
                        function(layer_to_remove) {
                            _.each(
                                self.map.editable_layers,
                                function(existing_layer) {
                                    if(existing_layer.id
                                        == layer_to_remove.id) {
                                        if(existing_layer.overlay.editable) {
                                            self.editor.setMap(null);
                                        }
                                        existing_layer.overlay.setMap(null);
                                        self.map.editable_layers = _.without(
                                            self.map.editable_layers,
                                            existing_layer
                                        );
                                    }
                                }
                            );
                        }
                    );
                }
            );
            this.bus.addHandler(
                'delete-layer',
                function(event) {
                    self.deleteDataset(event.layer);
                }
            );
            /*editing of an existinglayer... TODO!*/
            this.bus.addHandler(
                'edit-layer',
                function(event) {
                    var layer = event.layer,
                        gridres = 40075000/(256^self.map.getZoom()),
                        sql = 'SELECT ' +
                            'ST_AsGeoJson('+
                                'ST_Transform(the_geom_webmercator,4326)' +
                            ') as geom ' +
                            'FROM get_tile(\'{1}\',\'{2}\',\'{3}\',\'{4}\')',
                        url = mol.services.cartodb.sqlApi.jsonp_url.format(
                            sql.format(
                                gridres,
                                layer.source,
                                layer.type,
                                layer.name,
                                layer.dataset_id
                            )
                        );
                    self.map.overlayMapTypes.forEach(
                        function(mt,i) {
                            if(mt.name==layer.id) {
                                self.maptype = self.map.overlayMapTypes.removeAt(i);
                                self.maptype_index = i;
                            }
                        }
                    );
                    $.getJSON(
                        url,
                        self.addEditableLayer.bind(self)
                    );
                }
            );
            /*editing of an existing layer... TODO!*/
            this.bus.addHandler(
                'toggle-editing',
                function(event) {
                    var layer = event.layer;
                            _.each(
                                self.map.editable_layers,
                                function(existing_layer) {
                                    if(existing_layer.id
                                        == layer.id) {
                                        existing_layer.overlay.editable =
                                            !existing_layer.overlay.editable;
                                        if(!existing_layer.overlay.editable) {
                                            self.editor.setMap(null);
                                            self.storePolygon(existing_layer, layer);
                                        } else {
                                            self.editor.setMap(self.map);
                                        }
                                        existing_layer.overlay.editable_changed();
                                    }
                                }
                            );

                }
            );
        },
    });

    mol.map.editor.EditorControlDisplay = mol.mvp.View.extend({
        init : function(names) {
            var html = '' +
                    '<div class="mol-Map-EditorDisplay widgetTheme">' +
                        '<button class="edit">' +
                            'Create Map' +
                        '</button>' +
                    '</div>';

            this._super(html);

            this.defineRange=$(this).find('.edit');
        }
    });
    mol.map.editor.FeatureOptionsDisplay = mol.mvp.View.extend({
        init : function(name) {
            var html = '' +
                    '<div class="mol-Map-EditorFeatureOptions">' +
                    'Set Feature Metadata for {0}<br><br> ' +
                    'Description' +
                         '<textarea class="description" height=10 width=200 value=""></textarea>' +
                         '<br>' +
                         '<button class="delete">Delete feature</button>' +
                         '<button class="save">Save Changes</button>' +
                         '<button class="cancel">Cancel</button>' +
                    '</div>';
            this._super(html.format(name));
            this.del = $(this).find('.delete');
            this.cancel = $(this).find('.cancel');
            this.save =$(this).find('.save');
            this.seasonality = $(this).find('.seasonality');
            this.description = $(this).find('.description');
        }
    });
    mol.map.editor.NewRangeDialog = mol.mvp.View.extend({
            init: function(name) {
                var html = '' +
                    '<div id="dialog">' +
                        '<table width="600px"><tbody><tr><td>What species (scientific name) are you mapping?</td><td align="right">' +
                        '<input type="text" class="name" value="{0}"></td></tr></tbody></table>' +
                        '<div class="useExistingContainer"><table  width="600px"><tbody><tr>' +
                            '<td>Would you like to use an outline of the ' +
                            ' currently visible layers?</td>' +
                            '<td  align="right"><select class="useExisting">' +
                                '<option selected value=true>Yes</option>' +
                                '<option value=false>No</option>' +
                            '</select></td></tr>' +
                            '<td>What is your name?</td>' +
                            '<td  align="right">'+
                                '<input type ="text" size=15 class="username">' +
                            '</td></tr>' +
                            '<tr><td>Would you like to include points in the '+
                            'outline?</td>' +
                            '<td  align="right"><select class="usePoints">' +
                                '<option selected value=true>Yes</option>' +
                                '<option value=false>No</option>' +
                            '</select></td></tr>' +
                            '<tr><td>Full resolution polygon editing is not fully  ' +
                            ' supported in the Map of Life. What level of ' +
                            ' simplification should be applied to the outline?</td>'  +
                            '<td  align="right"><select class="detail">' +
                                //'<option value="auto">Auto</option>' +
                                '<option value="0">None</option>' +
                                '<option value="10000">10 KM</option>' +
                                '<option value="50000">50 KM</option>' +
                                '<option selected value="100000">100 KM </option>' +
                                '<option value="250000">250 KM</option>' +
                            '</select></td></tr></tbody></table>' +
                        '</div>' +
                        '<button class="start">Start mapping</button>' +
                        '<button class="cancel">Cancel</button>' +
                    '</div>  ';
                this._super(html.format(name));
                this.name = $(this).find('.name');
                this.start = $(this).find('.start');
                this.cancel = $(this).find('.cancel');
                this.usePoints = $(this).find('.usePoints');
                this.username = $(this).find('.username');
                this.useExistingContainer = $(this).find('.useExistingContainer');
                this.useExisting = $(this).find('.useExisting');
                this.detail = $(this).find('.detail');
        }
    });
};
