mol.modules.map.query = function(mol) {
    
    mol.map.query = {};

    mol.map.query.QueryEngine = mol.mvp.Engine.extend(
    {
        init : function(proxy, bus, map) {
                this.proxy = proxy;
                this.bus = bus;
                this.map = map;
                this.sql = "" +
                        "SET STATEMENT_TIMEOUT TO 0;" +
                        "SELECT DISTINCT scientificname " +
                        "FROM polygons_new " +
                        "WHERE ST_DWithin(the_geom_webmercator,ST_Transform(ST_PointFromText('POINT({0})',4326),3857),{1}) " +
                        //"WHERE ST_DWithin(the_geom,ST_PointFromText('POINT({0})',4326),0.1) " +
                        "AND provider = 'Jetz' AND polygonres = '1000' ORDER BY scientificname";

        },
        start : function() {
            this.addQueryDisplay();
            this.addEventHandlers();
        },
        /*
         *  Build the loading display and add it as a control to the top center of the map display.
         */
        addQueryDisplay : function() {
                var params = {
                    display: null,
                    slot: mol.map.ControlDisplay.Slot.LAST,
                    position: google.maps.ControlPosition.RIGHT_BOTTOM
                 };
                this.bus.fireEvent(new mol.bus.Event('register-list-click'));
                this.enabled=true;
                this.features={};
                this.display = new mol.map.QueryDisplay();
                params.display = this.display;
                this.bus.fireEvent( new mol.bus.Event('add-map-control', params));
        },
        getList: function(lat, lng, listradius) {
                var self = this,
                    sql = this.sql.format((lng+' '+lat), listradius.radius),
                    params = {sql:sql, key: '{0}'.format((lat+'-'+lng+'-'+listradius.radius))},
                    action = new mol.services.Action('cartodb-sql-query', params),
                    success = function(action, response) {
                        var results = {listradius:listradius, response:response},
                        event = new mol.bus.Event('species-list-query-results', results);
                        self.bus.fireEvent(event);
                    },
                    failure = function(action, response) {

                    };

                this.proxy.execute(action, new mol.services.Callback(success, failure));

        },
        addEventHandlers : function () {
            var self = this;
            /*
             * Handler in case other modules want to switch the query tool
             */
            this.bus.addHandler(
                'query-type-toggle',
                function (params) {
                    var e = {
                        params : params
                    };
                    self.changeTool(e);
                }
            );
            this.bus.addHandler(
                'species-list-query-click',
                function (event) {
                    var listradius;
                    if(self.enabled) {
                        listradius =  new google.maps.Circle({
                            map: event.map,
                            radius: parseInt(self.display.radiusInput.val())*1000, // 50 km
                            center: event.gmaps_event.latLng
                        });
                        self.bus.fireEvent( new mol.bus.Event('show-loading-indicator', {source : 'listradius'}));
                        self.getList(event.gmaps_event.latLng.lat(),event.gmaps_event.latLng.lng(),listradius);
                    }
                 }
            );
             this.bus.addHandler(
                'species-list-query-results',
                function (event) {
                    var content,
                        scientificnames = [],
                        infoWindow;
                    //self.bus.fireEvent(new mol.bus.Event('hide-loading-indicator', {source : 'listradius'}));
                    if(!event.response.error) {
                        var listradius = event.listradius;
                        //fill in the results
                        //$(self.display.resultslist).html('');
                        content= event.response.total_rows +
                                ' species found within ' +
                                listradius.radius/1000 + ' km of ' +
                                Math.round(listradius.center.lat()*1000)/1000 + '&deg; Latitude ' +
                                Math.round(listradius.center.lng()*1000)/1000 + '&deg; Longitude<br>';
                        _.each(
                            event.response.rows,
                            function(name) {
                                //var result = new mol.map.QueryResultDisplay(name.scientificname);
                                //content.append(result);
                                scientificnames.push(name.scientificname);
                            }
                        );

                        infoWindow= new google.maps.InfoWindow( {
                            content: content+scientificnames.join(', '),
                            position: listradius.center
                        });

                        google.maps.event.addListener(
                            infoWindow,
                            "closeclick",
                            function (event) {
                                listradius.setMap(null);
                            }
                         );
                         self.features[listradius.center.toString()+listradius.radius] = {
                             listradius : listradius,
                             infoWindow : infoWindow
                         };

                        //var marker = new google.maps.Marker({
                        //             position: self.listradius.center,
                        //             map: self.map
                        //});
                        infoWindow.open(self.map);
                        //$(self.resultsdisplay).show();
                    } else {
                        //TODO -- What if nothing comes back?
                    }
                    self.bus.fireEvent( new mol.bus.Event('hide-loading-indicator', {source : 'listradius'}));

                }
             );

            this.bus.addHandler(
                'species-list-tool-toggle',
                function(event) {
                    self.enabled = !self.enabled;
                    if (self.listradius) {
                            self.listradius.setMap(null);
                        }
                    if(self.enabled == true) {
                        $(self.display).show();
                        _.each(
                            self.features,
                            function(feature) {
                                feature.listradius.setMap(self.map);
                                feature.infoWindow.setMap(self.map);
                            }
                        );
                        //self.bus.fireEvent( new mol.bus.Event('layer-display-toggle',{visible: false}));
                        //self.bus.fireEvent( new mol.bus.Event('search-display-toggle',{visible: true}));
                    } else {
                        $(self.display).hide();
                        _.each(
                            self.features,
                            function(feature) {
                                feature.listradius.setMap(null);
                                feature.infoWindow.setMap(null);
                            }
                        );
                      //  self.bus.fireEvent( new mol.bus.Event('layer-display-toggle',{visible: true}));
                        //self.bus.fireEvent( new mol.bus.Event('search-display-toggle',{visible: false}));
                    }
                }
            );
            this.display.radiusInput.keyup(
                function(event) {
                    if(this.value>1000) {
                        this.value=1000;
                    }
                }
            );
        }
    }
    );

    mol.map.QueryDisplay = mol.mvp.View.extend(
    {
        init : function(names) {
            var className = 'mol-Map-QueryDisplay',
                html = '' +
                        '<div class="' + className + ' widgetTheme">' +
                        '   <div class="controls">' +
                        '     Search Radius (km) <input type="text" class="radius" size="5" value="50">' +
                        '     Class <select class="class" value="Birds">' +
                        '       <option value="aves">All</option>' +
                        '       <option selected value="aves">Birds</option>' +
                        '       <option disabled value="osteichthyes">Fish</option>' +
                        '       <option disabled value="reptilia">Reptiles</option>' +
                        '       <option disabled value="amphibia">Amphibians</option>' +
                        '       <option disabled value="mammalia">Mammals</option>' +
                        '     </select>' +
                        '   </div>' +
                        //'   <div class="resultslist">Click on the map to find bird species within 50km of that point.</div>' +
                        '</div>';

            this._super(html);
            this.resultslist=$(this.find('.resultslist'));
            this.radiusInput=$(this.find('.radius'));
            $(this.radiusInput).numeric({negative : false, decimal : false});
            this.classInput=$(this.find('.class'));
        }
    }
    );
    mol.map.QueryResultDisplay = mol.mvp.View.extend(
    {
        init : function(scientificname) {
            var className = 'mol-Map-QueryResultDisplay',
                //html = '<class="' + className + '">{0}</div>';
                html = '{0}';
            this._super(html.format(scientificname));

        }
    }
    );
};
