function mol() {
    var args = Array.prototype.slice.call(arguments),
        callback = args.pop(),
        modules = (args[0] && typeof args[0] === "string") ? args : args[0],        
        i,
        m,
        mod,
        submod;

    if (!(this instanceof mol)) {
        return new mol(modules, callback);
    }
   
    if (!modules || modules === '*') {
        modules = [];
        for (i in mol.modules) {
            if (mol.modules.hasOwnProperty(i)) {
                modules.push(i);
            }
        }
    }

    for (i = 0; i < modules.length; i += 1) {
        m = modules[i];
        mol.modules[m](this);            
        if (this[m].hasOwnProperty('submodules')) {
             for (submod in this[m].submodules) {
                 mol.modules[m][this[m]['submodules'][submod]](this);
             }
         }
    }

    callback(this);
    return this;
};

mol.modules = {};

mol.modules.common = function(mol) {

    mol.common = {};
    
    mol.common.assert = function(pred, msg) {
        if (!pred) {
            throw("Assertion failed: {0}".format(msg));
        }
    };
};

/**
 * https://gist.github.com/1049426
 * 
 * Usage: 
 * 
 *   "{0} is a {1}".format("Tim", "programmer");
 * 
 */
String.prototype.format = function(i, safe, arg) {
  function format() {
      var str = this, 
          len = arguments.length+1;
      
      for (i=0; i < len; arg = arguments[i++]) {
          safe = typeof arg === 'object' ? JSON.stringify(arg) : arg;
          str = str.replace(RegExp('\\{'+(i-1)+'\\}', 'g'), safe);
      }
      return str;
  }
  format.native = String.prototype.format;
  return format;
}();
/**
 * This module provides core functions.
 */
mol.modules.core = function(mol) {

    mol.core = {};

    /**
     * Returns a layer id string given a layer {name, type, source, englishname}.
     */
    mol.core.getLayerId = function(layer) {
        var //name = $.trim(layer.name.toLowerCase()).replace(/ /g, "_").replace(/(.)/),
            name = this.encode(layer.name),
            type = this.encode(layer.type),
            source = this.encode(layer.source),
            source_type = this.encode(layer.source_type),
            dataset_id = this.encode(layer.dataset_id);

        return 'layer--{0}--{1}--{2}--{3}--{4}'.format(name, type, source, dataset_id, source_type);
    };
    /*
     * Makes a string safe for use as a DOM id or class name.
     */
    mol.core.encode = function(string) {
        return (escape(string)).replace(/%/g,'222').replace(/\./g,'333').replace(/\//g, '444');
    };
    /*
     * Decodes string encoded with mol.core.encode. 
     */
    mol.core.decode = function(string) {
        return (unescape(string.replace(/222/g,'%').replace(/333/g,'.').replace(/444/g, '/')));
    };
    
}
mol.modules.bus = function(mol) {

    mol.bus = {};
    
    mol.bus.Event = Class.extend(
        {
            init: function(type, params) {
                mol.common.assert(type);
                this.type = type;
                if (params) {
                    _.extend(this, params);   
                }
            }
        }
    );

    mol.bus.Bus = function() {

        if (!(this instanceof mol.bus.Bus)) {
            return new mol.bus.Bus();
        }
        _.extend(this, Backbone.Events);

        this.fireEvent = function(event) {
            this.trigger(event.type, event);
        };

        this.addHandler = function(type, handler) {
            this.bind(
                type, 
                function(event) {
                    handler(event);
                }
            );
        };
        return this;
    };
};
mol.modules.mvp = function(mol) {
    
    mol.mvp = {};

    mol.mvp.Model = Class.extend(
        {           
            init: function(props) {
                this.props = props;
            },

            get: function(name) {
                return this.props[name];
            },

            json: function() {
                return JSON.stringify(this.props);
            }
        }
    );
    
    mol.mvp.Engine = Class.extend(
        {
            start: function(container) {
            },
            
            go: function(place) {
            },
            
            state: function() {
            }
        }
    );

    mol.mvp.View = Class.extend(
        {
            init: function(element, parent) {
                if (!element) {
                    element = '<div>';
                }
                _.extend(this, $(element));
                this.element = this[0];
                if (parent) {
                    $(parent).append(this.element);
                }
            }
        }
    );

    mol.mvp.Display = mol.mvp.View.extend(
        {
            init: function(element, parent) {
                this._super(element, parent);
            },

            engine: function(engine) {
                this.engine = engine;
            }
        }
    );
};mol.modules.services = function(mol) {
  
    mol.services = {};

    mol.services.submodules = ['cartodb'];

    mol.services.Action = Class.extend(
        {
            init: function(type, params) {
                mol.common.assert(type);
                this.type = type;
                if (params) {
                    _.extend(this, params);   
                }
            }
        }
    );

    mol.services.Callback = Class.extend(
        {
            /**
             * The success callback function takes as parameters the result
             * object and the action.
             * 
             * The failure callback function takes as parameters the error
             * result object and the action.
             *
             * @param success a callback function handling success
             * @param failure a callback function handling failure
             */
            init: function(success, failure) {
                this.success = success;
                this.failure = failure;
            }
        }
    );

    mol.services.Proxy = Class.extend(
        {
            /**
             * @param bus mol.bus.Bus
             */
            init: function(bus) {
                this.bus = bus;
            },
            
            /**
             * The callback here takes the action and the response as parameters.
             * 
             * @param action the mol.services.Action
             * @param callback the mol.services.Callback
             */
            execute: function(action, callback) {
                var cartodb = mol.services.cartodb;

                switch (action.type) {
                    case 'cartodb-sql-query':
                    cartodb.query(action.key, action.sql, this.callback(action, callback));
                    break;
                }
            },

            /**
             * Returns a proxy callback clousure around the clients action and 
             * the clients callback. This gets executed by the service. The 
             * services are expected to pass the service response to the callback 
             * as a single parameter.
             * 
             * @param action the client mol.services.Action
             * @param callback the client mol.services.Callback
             */
            callback: function(action, callback) {
                var self = this;

                return new mol.services.Callback(
                    function(response) { // Success.
                        callback.success(action, response);
                        self.fireEvents(action, response);
                    },
                    function (response) { // Failure.
                        callback.failure(action, response);
                        self.fireEvents(action, response, true);
                    }
                );
            },

            fireEvents: function(action, response, error) {
                var params = {
                        action: action, 
                        response:response, 
                        error:  error ? true : false
                    },
                    event = new mol.bus.Event(action.type, params);
                                  
                this.bus.fireEvent(event);
            }                
        }
    );
};
mol.modules.services.cartodb = function(mol) {
    mol.services.cartodb = {};
    mol.services.cartodb.SqlApi = Class.extend(
        {
            init: function() {
                this.jsonp_url = '' +
                    'http://d3dvrpov25vfw0.cloudfront.net/' +
//                    'http://mol.cartodb.com/' +
                    'api/v2/sql?mol_cache=070520131644&callback=?&q={0}';
                this.json_url = '' +
                    'http://d3dvrpov25vfw0.cloudfront.net/' +
//                    'http://mol.cartodb.com/' +
                    'api/v2/sql?mol_cache=070520131644&q={0}';
                //cache key is mmddyyyyhhmm
                this.sql_cache_key = '0670520131644';
            }
        }
    );
    mol.services.cartodb.TileApi = Class.extend(
        {
            init: function() {
                this.host = '' +
//                    'mol.cartodb.com';
                    'd3dvrpov25vfw0.cloudfront.net';
                //cache key is mmddyyyyhhmm of cache start
                this.tile_cache_key = '072420131233';
            }
        }
    );
    mol.services.cartodb.sqlApi = new mol.services.cartodb.SqlApi();
    mol.services.cartodb.tileApi = new mol.services.cartodb.TileApi();
};
mol.modules.map = function(mol) {

    mol.map = {};

    mol.map.submodules = [
            'search',
            'results',
            'layers',
            'tiles',
            'menu',
            'loading',
            'dashboard',
            'feature',
            'query',
            'basemap',
            'metadata',
            'splash',
            'styler',
            'help',
            'status',
            'images',
            'boot'
    ];

    mol.map.MapEngine = mol.mvp.Engine.extend(
        {
            init: function(api, bus) {
                this.api = api;
                this.bus = bus;
            },

            start: function(container) {
                this.display = new mol.map.MapDisplay('.map_container');
                this.addControls();
                this.addEventHandlers();
            },

            go: function(place) {
            },

            place: function() {
            },
            addControls: function() {
                var map = this.display.map,
                    controls = map.controls,
                    c = null,
                    ControlPosition = google.maps.ControlPosition,
                    ControlDisplay = mol.map.ControlDisplay;

                // Add top right map control.
                this.ctlRight = new ControlDisplay('RightControl');
                controls[ControlPosition.TOP_RIGHT].clear();
                controls[ControlPosition.TOP_RIGHT].push(this.ctlRight.element);

                // Add top center map control.
                this.ctlTop = new ControlDisplay('CenterTopControl');
                controls[ControlPosition.TOP_CENTER].clear();
                controls[ControlPosition.TOP_CENTER].push(this.ctlTop.element);

                // Add top left map control.
                this.ctlLeft = new ControlDisplay('TopLeftControl');
                controls[ControlPosition.TOP_LEFT].clear();
                controls[ControlPosition.TOP_LEFT].push(this.ctlLeft.element);

                // Add left center map control.
                this.ctlLeftCenter = new ControlDisplay('LeftCenterControl');
                controls[ControlPosition.LEFT_CENTER].clear();
                controls[ControlPosition.LEFT_CENTER].push(this.ctlLeftCenter.element);


                // Add bottom left map control.
                this.ctlLeftBottom = new ControlDisplay('LeftBottomControl');
                controls[ControlPosition.BOTTOM_LEFT].clear();
                controls[ControlPosition.BOTTOM_LEFT].push(this.ctlLeftBottom.element);

                // Add bottom center map control.
                this.ctlBottomCenter = new ControlDisplay('BottomCenterControl');
                controls[ControlPosition.BOTTOM_CENTER].clear();
                controls[ControlPosition.BOTTOM_CENTER].push(this.ctlBottomCenter.element);

                // Add bottom right map control.
                this.ctlRightBottom = new ControlDisplay('RightBottomControl');
                controls[ControlPosition.RIGHT_BOTTOM].clear();
                controls[ControlPosition.RIGHT_BOTTOM].push(this.ctlRightBottom.element);

            },
            /**
             * Gets the control display at a Google Map control position.
             *
             * @param position google.maps.ControlPosition
             * @return mol.map.ControlDisplay
             */
            getControl: function(position) {
                var ControlPosition = google.maps.ControlPosition,
                    control = null;

                switch (position) {
                case ControlPosition.TOP_RIGHT:
                    control = this.ctlRight;
                    break;
                case ControlPosition.TOP_CENTER:
                    control = this.ctlTop;
                    break;
                case ControlPosition.TOP_LEFT:
                    control = this.ctlLeft;
                    break;
                case ControlPosition.LEFT_CENTER:
                    control = this.ctlLeftCenter;
                    break;
                case ControlPosition.LEFT_BOTTOM:
                    control = this.ctlLeftBottom;
                    break;
                case ControlPosition.RIGHT_BOTTOM:
                    control = this.ctlRightBottom;
                    break;
                case ControlPosition.BOTTOM_CENTER:
                    control = this.ctlBottomCenter;
                    break;
                }

                return control;
            },
            mousestop: function(event) {
                console.log('Mouse stopped!');
            },
            addEventHandlers: function() {
                var self = this;

                google.maps.event.addListener(
                    self.display.map,
                    "zoom_changed",
                    function() {
                        self.bus.fireEvent(new mol.bus.Event('map-zoom-changed'));
                    }
                );
                google.maps.event.addListener(
                    self.display.map,
                    "center_changed",
                    function() {
                        self.bus.fireEvent(new mol.bus.Event('map-center-changed'));
                    }
                );
                google.maps.event.addListener(
                    self.display.map,
                    "idle",
                    function () {
                        self.bus.fireEvent(new mol.bus.Event('map-idle'));
                    }
                );
                /*
                 * A poor man's mousestop event.
                 */
                google.maps.event.addListener(
                    self.display.map,
                    "mousemove",
                    function (event) {
                        self.then = (new Date()).getTime();
                        if(self.mousetimer) {
                            clearTimeout(self.mouseTimer)
                        }
                        self.mousetimer = setTimeout(
                            function() {
                                var now = (new Date()).getTime();
                                if(now-self.then > 100) {
                                    self.then = now;
                                    self.bus.fireEvent(
                                        new mol.bus.Event(
                                            'map-mouse-stop',
                                            event
                                        )
                                    );
                                };
                            },
                            150
                        )
                    }
                );
                /**
                 * The event.overlays contains an array of overlays for the map.
                 */
                this.bus.addHandler(
                    'add-map-overlays',
                    function(event) {
                        _.each(
                            event.overlays,
                            function(overlay) {
                                self.display.map.overlayMapTypes.push(overlay);
                             },
                            self
                        );
                    }
                );

                /*
                 *  Turn on the loading indicator display when zooming
                 */
                this.bus.addHandler(
                        'map-zoom-changed',
                        function() {
                           self.bus.fireEvent(new mol.bus.Event('show-loading-indicator',{source : "map"}));
                        }
                );
                 /*
                 *  Turn on the loading indicator display when moving the map
                 */
                this.bus.addHandler(
                        'map-center-changed',
                        function() {
                           self.bus.fireEvent(new mol.bus.Event('show-loading-indicator',{source : "map"}));
                        }
                );
                /*
                 *  Turn off the loading indicator display if there are no overlays, otherwise tie handlers to map tile img elements.
                 */
                this.bus.addHandler(
                        'map-idle',
                        function() {
                            self.bus.fireEvent(new mol.bus.Event('hide-loading-indicator',{source : "map"}));
                            if (self.display.map.overlayMapTypes.length > 0) {
                                //self.bus.fireEvent(new mol.bus.Event('show-loading-indicator',{source : "overlays"}));
                                /*$("img",self.display.map.overlayMapTypes).imagesLoaded (
                                    function(images, proper, broken) {
                                        self.bus.fireEvent( new mol.bus.Event('hide-loading-indicator',{source : "overlays"}));
                                    }
                                 );*/
                            }
                        }
                );

                this.bus.addHandler(
                    'add-map-control',

                    /**
                     * Callback that adds a map control display in a specified
                     * slot. The event is expected to have the following
                     * properties:
                     *
                     *   event.display - mol.map.ControlDisplay
                     *   event.slot - mol.map.ControlDisplay.Slot
                     *   event.position - google.maps.ControlPosition
                     *
                     * @param event mol.bus.Event
                     */
                    function(event) {
                        var display = event.display,
                            slot = event.slot,
                            position = event.position,
                            control = self.getControl(position);

                        control.slot(display, slot);
                    }
                );
            }
        }
    );

    mol.map.MapDisplay = mol.mvp.View.extend(
        {
            init: function(element) {
                var mapOptions = null;

                this._super(element);

                mapOptions = {
                    zoom: 3,
                    center: new google.maps.LatLng(0, -50),
                    maxZoom: 10,
                    minZoom: 2,
                    minLat: -85,
                    maxLat: 85,
                    mapTypeControl: false,
                    panControl: true,
                    zoomControl: true,
                    streetViewControl: false,
                    useStaticMap:false,
                    mapTypeId: google.maps.MapTypeId.ROADMAP,
                    styles:[
                        {
                            "stylers" : [{
                                "saturation" : -65
                            }, {
                                "gamma" : 1.52
                            }]
                        }, {
                            "featureType" : "administrative",
                            "stylers" : [{
                                "saturation" : -95
                            }, {
                                "gamma" : 2.26
                            }]
                        }, {
                            "featureType" : "water",
                            "elementType" : "labels",
                            "stylers" : [{
                                "visibility" : "off"
                            }]
                        }, {
                                "featureType" : "administrative",
                            "stylers" : [{
                                "visibility" : "off"
                            }]
                        }, {
                            "featureType" : "administrative.country",
                            "stylers" : [{
                                "visibility" : "on"
                            }]
                        }, {
                            "featureType" : "administrative.province",
                            "stylers" : [{
                                "visibility" : "on"
                            }]
                        }, {
                            "featureType" : "road",
                            "stylers" : [{
                                "visibility" : "simplified"
                            }, {
                                "saturation" : -99
                            }, {
                                "gamma" : 2.22
                            }]
                        }, {
                            "featureType" : "poi",
                            "elementType" : "labels",
                            "stylers" : [{
                                "visibility" : "off"
                            }]
                        }, {
                            "featureType" : "road.arterial",
                            "stylers" : [{
                                "visibility" : "off"
                            }]
                        }, {
                            "featureType" : "road.local",
                            "elementType" : "labels",
                            "stylers" : [{
                                "visibility" : "off"
                            }]
                        }, {
                            "featureType" : "transit",
                            "stylers" : [{
                                "visibility" : "off"
                            }]
                        }, {
                            "featureType" : "road",
                            "elementType" : "labels",
                            "stylers" : [{
                                "visibility" : "off"
                            }]
                        }, {
                            "featureType" : "poi",
                            "stylers" : [{
                                "saturation" : -55
                            }]
                        }
                    ]
                };

                this.map = new google.maps.Map(this.element, mapOptions);
            }
        }
    );

    /**
     * This display is a container with support for adding composite displays in
     * a top, middle, and bottom slot. It gets attached to a map control positions.
     *
     */
    mol.map.ControlDisplay = mol.mvp.View.extend(
        {
            /**
             * @param name css class name for the display
             */
            init: function(name) {
                var Slot = mol.map.ControlDisplay.Slot,
                    className = 'mol-Map-' + name,
                    html = '' +
                    '<div class="' + className + '">' +
                        '<div class="TOP"></div>' +
                        '<div class="MIDDLE"></div>' +
                        '<div class="BOTTOM"></div>' +
                    '</div>';

                this._super(html);

                $(this).find(Slot.TOP).removeClass('ui-selectee');
                $(this).find(Slot.MIDDLE).removeClass('ui-selectee');
                $(this).find(Slot.BOTTOM).removeClass('ui-selectee');

            },

            /**
             * Puts a display in a slot.
             *
             * @param dislay mol.map.ControlDisplay
             * @param slot mol.map.ControlDisplay.Slot
             */
            slot: function(display, slot) {
                var Slot = mol.map.ControlDisplay.Slot,
                    slotDisplay = $(this).find(slot);

                switch (slot) {
                case Slot.FIRST :
                    this.prepend(display);
                    break;
                case Slot.LAST:
                    this.append(display);
                    break;
                default:
                    slotDisplay.append(display);
                }
            }
        }
    );

    mol.map.ControlDisplay.Slot = {
        FIRST: '.FIRST',
        TOP: '.TOP',
        MIDDLE: '.MIDDLE',
        BOTTOM: '.BOTTOM',
        LAST: '.LAST'
    };
};
mol.modules.map.loading = function(mol) {

    mol.map.loading = {};

    mol.map.loading.LoadingEngine = mol.mvp.Engine.extend(
    {
        init : function(proxy, bus) {
                this.proxy = proxy;
                this.bus = bus;
        },
        start : function() {
            this.addLoadingDisplay();
            this.addEventHandlers();
            this.cache = {};
        },
        /*
         *  Build the loading display and add it as a control to the top center of the map display.
         */
        addLoadingDisplay : function() {
            var event,
                params = {
                    display: null, // The loader gif display
                    slot: mol.map.ControlDisplay.Slot.TOP,
                    position: google.maps.ControlPosition.TOP_CENTER
                };
            
            this.loading = new mol.map.LoadingDisplay();
            params.display = this.loading;
            event = new mol.bus.Event('add-map-control', params);
            this.bus.fireEvent(event);
        },
        addEventHandlers : function () {
            var self = this;
           /*
            *  Turn off the loading indicator display
            */
            this.bus.addHandler(
                'hide-loading-indicator',
                function(event) {
                    var done = true;
                    self.cache[event.source] = "done";
                    _.each(
                        self.cache,
                        function(source) {
                             if(source === "loading") {
                                 done = false;
                             }
                        }
                    );
                    if (done === true) {
                        self.loading.hide();
                    }
                }
            );
           /*
            *  Turn on the loading indicator display
            */
            this.bus.addHandler(
                'show-loading-indicator',
                function(event) {
                    self.loading.show();
                    self.cache[event.source] = "loading";
                }
            );
        }
    }
    );

    /*
     *  Display for a loading indicator.
     *  Use jQuery hide() and show() to turn it off and on.
     */
    mol.map.LoadingDisplay = mol.mvp.View.extend(
    {
        init : function() {
            var className = 'mol-Map-LoadingWidget',
                html = '' +
                        '<div class="' + className + '">' +
                        '   <img src="static/loading.gif">' +
                        '</div>';
            this._super(html);
        }
    });
};
mol.modules.map.layers = function(mol) {

    mol.map.layers = {};

    mol.map.layers.LayerEngine = mol.mvp.Engine.extend({
        init: function(proxy, bus, map) {
            this.proxy = proxy;
            this.bus = bus;
            this.map = map;
            this.clickDisabled = false;
            this.layer_sql = '' +
                'SELECT DISTINCT l.scientificname as name,'+
                    't.type as type,'+
                    't.cartocss as css,' +
                    't.sort_order as type_sort_order, ' +
                    't.title as type_title, '+
                    't.opacity as opacity, ' +
                    'CONCAT(l.provider,\'\') as source, '+
                    'CONCAT(p.title,\'\') as source_title,'+
                    's.source_type as source_type, ' +
                    's.title as source_type_title, ' +   
                    "CASE WHEN l.feature_count is not null THEN CASE WHEN d.type = 'taxogeooccchecklist' " +
                        'THEN ' +
                            "CONCAT("+
                                "to_char(l.occ_count,'999,999,999'),"+
                                "' records<br>'," +
                                "to_char(l.feature_count, '999,999,999'),"+
                                "' locations'"+
                            ") " +
                        'ELSE ' +
                            "CONCAT(to_char(l.feature_count,'999,999,999'),' features') "+
                    'END ELSE \'\' END as feature_count, '+
                    'CONCAT(n.v,\'\') as names, ' +
                    'CASE WHEN l.extent is null THEN null ELSE ' +
                    'CONCAT(\'{' +
                        '"sw":{' +
                            '"lng":\',ST_XMin(box2d(ST_Transform(ST_SetSRID(l.extent,3857),4326))),\', '+
                            '"lat":\',ST_YMin(box2d(ST_Transform(ST_SetSRID(l.extent,3857),4326))),\' '+
                        '}, '+
                        '"ne":{' +
                        '"lng":\',ST_XMax(box2d(ST_Transform(ST_SetSRID(l.extent,3857),4326))),\', ' +
                        '"lat":\',ST_YMax(box2d(ST_Transform(ST_SetSRID(l.extent,3857),4326))),\' ' +
                        '}}\') ' +
                    'END as extent, ' +
                    'l.dataset_id as dataset_id, ' +
                    'd.dataset_title as dataset_title, ' + 
                    'd.style_table as style_table ' +
                    
                'FROM layer_metadata l ' +
                'LEFT JOIN data_registry d ON ' +
                    'l.dataset_id = d.dataset_id ' +
                'LEFT JOIN types t ON ' +
                    'l.type = t.type ' +
                'LEFT JOIN providers p ON ' +
                    'l.provider = p.provider ' +
                'LEFT JOIN source_types s ON ' +
                    'p.source_type = s.source_type ' +
                'LEFT JOIN ac n ON ' +
                    'l.scientificname = n.n ' +
                'WHERE ' +
                     "{0}" +
                'ORDER BY name, type_sort_order';
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
                'remove-all-layers',
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
            this.bus.addHandler(
                'map-single-layer',
                function(event) {
                    var name  = event.name,
                        dataset_id = event.dataset_id;
                    
                    $.getJSON(
                       mol.services.cartodb.sqlApi.json_url.format(
                        self.layer_sql.format(
                            "l.scientificname='{0}' and l.dataset_id='{1}"
                            .format(name, dataset_id))),
                        function(response) {
                            var layer = response.rows[0];

                            layer.id =  mol.core.getLayerId(layer);
                            
                            self.bus.fireEvent(
                                new mol.bus.Event(
                                    'add-layers', 
                                    {layers: [layer]}
                                )
                            );
                            self.getBounds(layer);
                        },
                        'json'
                    );
                    
                }
            );
            this.bus.addHandler(
                'map-single-species',
                function(event) {
                    var name  = event.name,
                        dataset_id = event.dataset_id;
                    
                    $.getJSON(
                       mol.services.cartodb.sqlApi.json_url.format(
                        self.layer_sql.format(
                            "l.scientificname='{0}'"
                            .format(name, dataset_id))),
                        function(response) {
                            var layers = response.rows;

                            layers =  _.map(
                                layers,
                                function(layer) {
                                    layer.id = mol.core.getLayerId(layer);
                                    return layer;
                                }
                            );
                            
                            self.bus.fireEvent(
                                new mol.bus.Event(
                                    'add-layers', 
                                    {layers: layers}
                                )
                            );
                            //self.getBounds(layer);
                        },
                        'json'
                    );
                    
                }
            )

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
                    );
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
        getBounds: function (layer) {
            var self = this;
            $.getJSON(
                 mol.services.cartodb.sqlApi.json_url.format(
                     "SELECT * FROM get_extent('{0}', '{1}','{2}','{3}')".format(
                         layer.source,
                         layer.type,
                         layer.name,
                         layer.dataset_id
                     )
                 ),
                 function(result) {
                     
                        var extent = result.rows[0],
                        bounds = new google.maps.LatLngBounds(
                                            new google.maps.LatLng(
                                                extent.miny,
                                                extent.minx),
                                            new google.maps.LatLng(
                                                extent.maxy,
                                                extent.maxx));
                        self.map.fitBounds(bounds);
                 }
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
                                extent = (layer.extent != null) ? eval('({0})'.format(layer.extent)) : null,
                                bounds = (extent != null) ? new google.maps.LatLngBounds(
                                            new google.maps.LatLng(
                                                extent.sw.lat,
                                                extent.sw.lng),
                                            new google.maps.LatLng(
                                                extent.ne.lat,
                                                extent.ne.lng)) : null;

                            if(extent == null || bounds == null ){
                                self.getBounds(layer);
                            } else {
                                self.map.fitBounds(bounds);
                            }
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
                            var showing = $(event.currentTarget).hasClass('checked'),
                                params = {
                                    layer: layer,
                                    showing: !showing
                                },
                                e = new mol.bus.Event('layer-toggle', params);
                            
                            if(showing) {
                                $(this).removeClass('checked');
                                $(this).removeClass('fa-eye');
                                $(this).addClass('fa-eye-slash');
                            } else {
                                $(this).addClass('checked');
                                $(this).removeClass('fa-eye-slash');
                                $(this).addClass('fa-eye');
                            }
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

            /*if(sortedLayers.length == 1) {
                //if only one new layer is being added
                //select it
                this.display.list.find('.layer')
                    [this.display.list.find('.layer').length-1].click();
            }*/

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
                    '<i class="fa fa-trash-o"></i>' +
                '    </button>' +
                '    <button title="Zoom to layer extent." class="zoom">' +
                       '<i class="fa fa-search-plus"></i>' +
                '    </button>' +
                '    <button class="toggleContainer">' +
                '       <i class="fa toggle fa-eye checked"></i>' +
                '    </button>' +
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
                        '{0}'.format(layer.feature_count) : '',
                    layer.source_title,
                    layer.type_title
                )
            );

            this.attr('id', layer.id);
            this.toggle = $(this).find('.toggle');
            this.styler = $(this).find('.styler');
            this.zoom = $(this).find('.zoom');
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
            this.s4 = $(this).find('.s4');

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
mol.modules.map.menu = function(mol) {

    mol.map.menu = {};

    mol.map.menu.MenuEngine = mol.mvp.Engine.extend({
        init: function(proxy, bus) {
            this.proxy = proxy;
            this.bus = bus;
            this.seenHint = false;
        },

        /**
         * Starts the MenuEngine. Note that the container parameter is
         * ignored.
         */
        start: function() {

            this.display = new mol.map.menu.BottomMenuDisplay();
            this.display.toggle(true);

            this.addEventHandlers();
            this.fireEvents();
        },

        /**
         * Adds a handler for the 'search-display-toggle' event which
         * controls display visibility. Also adds UI event handlers for the
         * display.
         */
        addEventHandlers: function() {
            var self = this;

            this.display.start.click(
                function(Event) {
                   self.bus.fireEvent(
                        new mol.bus.Event('toggle-splash')
                    );
                     self.bus.fireEvent(
                        new mol.bus.Event('taxonomy-dashboard-toggle',{state:"close"})
                    );
                    self.bus.fireEvent(
                        new mol.bus.Event('remove-all-layers')
                    );
                    self.bus.fireEvent(
                        new mol.bus.Event('clear-lists')
                    );
                    self.bus.fireEvent(
                        new mol.bus.Event(
                        	'species-list-tool-toggle',
                        	{visible: false}
                    	)
                    );
                }
            );
            this.display.about.click(
                function(Event) {
                    window.open('/about/');
                }
            );

            this.display.help.click(
                function(Event) {
                    self.bus.fireEvent(
                        new mol.bus.Event('help-display-dialog')
                    );
                }
            );

            this.display.status.click(
                function(Event) {
                    self.bus.fireEvent(
                        new mol.bus.Event('status-display-dialog')
                    );
                }
            );

            this.display.feedback.click(
                function(Event) {
                    self.bus.fireEvent(
                        new mol.bus.Event('feedback-display-toggle')
                    );
                }
            );
            this.display.click(
                function(event) {
                    $(this).qtip("hide");
                }
            );
            this.display.dashboard.click(
                function(event) {
                    self.bus.fireEvent(
                        new mol.bus.Event('taxonomy-dashboard-toggle'));
                }
            );
               

            this.bus.addHandler(
                'menu-display-toggle',
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
                'show-menu-hint',
                function(event) {
                    
                    if(!self.seenHint) {
                        $(self.display).qtip({
                            content: {
                                    text: '<div class="mol-hint">Click here to start over.</div>'
                            },
                            position: {
                                my: 'bottom right',
                                at: 'top left'
                            },
                            show: {
                                event: false,
                                ready: true
                            },
                            hide: {
                                fixed: false,
                                event: 'unfocus'
                            }
                        })
                    }
                    self.seenHint = true
                        
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
                    position: google.maps.ControlPosition.RIGHT_BOTTOM
            };
            this.bus.fireEvent(new mol.bus.Event('add-map-control', params));
        }
    });


    mol.map.menu.BottomMenuDisplay = mol.mvp.View.extend({
        init: function() {
            var html = '' +
                '<div class="mol-BottomRightMenu">' +
                    '<div title="Start over." ' +
                    ' class="widgetTheme button start">Start Over</div>' +
                    '<div ' +
                    ' class="widgetTheme button dashboard">Dashboard</div>' +
                    '<div title="Current known issues." ' +
                    ' class="widgetTheme button status">Status</div>' +
                    '<div title="About the Map of Life Project." ' +
                        'class="widgetTheme button  about">About' +
                '    </div>' +
                    '<div title="Submit feedback." ' +
                        'class="widgetTheme button feedback">Feedback</div>' +
                    '<div title="Get help." ' +
                        'class="widgetTheme button help">Help</div>' +
                '</div>';

            this._super(html);
            this.start = $(this).find('.start');
            this.dashboard = $(this).find('.dashboard');
            this.about = $(this).find('.about');
            this.help = $(this).find('.help');
            this.feedback = $(this).find('.feedback');
            this.status = $(this).find('.status');
        }
    });
};

/**
 * This module provides support for rendering search results.
 */
mol.modules.map.results = function(mol) {

    mol.map.results = {};

    mol.map.results.ResultsEngine = mol.mvp.Engine.extend({
        /**
         * @param bus mol.bus.Bus
         */
        init: function(proxy, bus, map) {
            this.proxy = proxy;
            this.bus = bus;
            this.map = map;
            this.maxLayers = ($.browser.chrome) ? 6 : 100;

            /**
             * this.synonym_search_timeout = 7000
             *
             * Number of milliseconds to wait before
             * giving up on a synonym search. Note
             * that both CartoDB and TaxRefine searches
             * will wait this long; so a worse case is
             * actually twice this timeout.
             */
            this.synonym_search_timeout = 7000;

            /** 
             * this.current_results = []
             *
             * Stores the currently displayed results.
             */
            this.current_results = [];

            /**
             * this.flag_synonym_bar_displayed = (0|1)
             *
             * The synonym bar displays "Synonyms" between direct and synonym 
             * search results. This flag is turned on once the bar has been 
             * displayed, preventing it from being displayed multiple times,
             * where multiple synonym searches return separate results, for
             * instance.
             */
            this.flag_synonym_bar_displayed = 0; 

            /**
             * this.synonym_search_counter = 0, 1, ...
             *
             * The number of ongoing asynchronous synonym searches. When zero,
             * no synonym searches are ongoing, so if rows are being added,
             * it must be from a direct search. If > 0, then rows are being
             * added by a synonym search. As the results from synonym searches
             * return to this module, this counter in decremented, and once
             * it returns to zero, any "Please wait, synonym search in 
             * progress  ..." messages are hidden.
             */
            this.synonym_search_counter = 0; 

            /**
             * this.search_synonym_sql
             *
             * An SQL query searching for names in the 'synonym' table.
             */
            this.search_synonym_sql = '' +
                'SELECT DISTINCT mol_scientificname FROM synonyms WHERE ' +
                    "LOWER(scientificname)='{0}'";

            this.filters = { 
                'name': {
                    title: 'Name', 
                    hasIcon: false, 
                    title_field : 'name', 
                    values: {}
                },
                'source_type':{ 
                    title: 'Source', 
                    hasIcon: true, 
                    title_field : 'source_type_title', 
                    values: {}
                },
                'type': {
                    title: 'Type',
                    hasIcon: true,
                    title_field : 'type_title',
                    values: {}
                }
            }
        },

        /**
         * Starts the SearchEngine. Note that the container parameter is
         * ignored.
         */
        start: function(container) {
            this.display = new mol.map.results.ResultsDisplay();
            this.display.toggle(false);
            this.addEventHandlers();
            this.fireEvents();
        },
        clearResults: function() {
            this.display.toggle(false);
            this.display.clearResults();
            this.display.clearFilters();
            delete(this.results);
        },
        /**
         * Adds a handler for the 'search-display-toggle' event which
         * controls display visibility. Also adds UI event handlers for the
         * display.
         */
        addEventHandlers: function() {
            var self = this;

            /**
             * Clicking the "select all" link checks all results.
             */
            this.display.selectAllLink.click(
                function(event) {
                    self.display.toggleSelections(true);
                }
            );
            this.bus.addHandler(
                'results-select-all',
                function(event) {
                    self.display.selectAllLink.click();
                }
            );
            this.bus.addHandler(
                'clear-results',
                function(event) {
                    self.clearResults();
                }
            );
            this.bus.addHandler(
                'results-map-selected',
                function(event) {
                    self.display.addAllButton.click();
                }
            );
            this.display.clearResultsButton.click(
                function(event) {
                    self.clearResults();
                }
            );
            /**
             * Clicking the 'map selected layers' button fires an 'add-layers'
             * event on the bus.
             */
            this.display.addAllButton.click(
                function(event) {
                    var layers = self.display.getChecked(), clearResults = false;
                    if(self.display.find('.result').filter(':visible').length == layers.length) {
                        clearResults = true;
                    } 
                    //remove layers that are already mapped
                    self.map.overlayMapTypes.forEach(
                          function(layer) {
                              _.each(
                                  layers,
                                  function(newLayer) {
                                      if(newLayer.id==layer.name) {
                                          layers = _.without(layers, newLayer);
                                      }
                                  }
                              )
                          }
                    );
                    if(self.map.overlayMapTypes.length + layers.length > self.maxLayers) {
                        if(!$.browser.chrome) {
                            alert(
                                'The map is currently limited to {0}'.format(self.maxLayers) +
                                ' layers at a time. Please remove some layers ' +
                                ' before adding more.'
                            );
                            
                        } else {
                            alert(
                                'An issue with Google Chrome currently limits the number '+
                                ' of active layers in Map of Life to {0}'.format(self.maxLayers) +
                                ' layers at a time. Other browsers may display up to 100 layers.'
                            )
                        }
                    } else {
                        self.bus.fireEvent(
                            new mol.bus.Event(
                                'add-layers',
                                {
                                    layers: layers
                                }
                            )
                        );
                        if(clearResults) {
                            self.clearResults();
                            
                        }
                    }
                }
            );
            /**
             * Clicking the "select none" link unchecks all results.
             */
            this.display.selectNoneLink.click(
                function(event) {
                    self.display.toggleSelections(false);
                }
            );

            /**
             * Callback that toggles the search display visibility. The
             * event is expected to have the following properties:
             *
             *   event.visible - true to show the display, false to hide it,
             *                   undefined to toggle.
             *
             * @param event mol.bus.Event
             */
            this.bus.addHandler(
                'results-display-toggle',
                function(event) {
                    if(self.current_results.length == 0) {
                        self.display.toggle(false);
                    } else {
                        if (event.visible === undefined) {
                            self.display.toggle(
                                "slide",
                                {direction: "left"},
                                1000
                            );
                        } else if (event.visible && self.display.not(':visible')) {
                            self.display.show(
                                "slide",
                                {direction: "left"},
                                1000
                            );
                        } else if (self.display.is(':visible')){
                            self.display.hide(
                                "slide",
                                {direction: "left"},
                                1000
                            );
                        }
                    }
                }
            );

            /**
             * Callback that displays search results. If synonym searches
             * are in progress, these will be added to the search results
             * instead of overwriting them.
             */
            this.bus.addHandler(
                'search-results',
                function(event) {
                    var response = event.response;
                    var search_type = 'direct';

                    // A list of layer identifiers which are currently
                    // in use.
                    var ids_currently_in_use;
                    
                    // Rows to be added in this event (after duplicate rows
                    // are removed).
                    var rows_to_add; 
 
                    // Turn off autocomplete.
                    self.bus.fireEvent(new mol.bus.Event('close-autocomplete'));

                    console.log("*** search results for: " + event.term + ".");
                    console.log("synonym_search_counter = " + this.synonym_search_counter);

                    // Are we in a synonym search or a direct search?
                    if(this.synonym_search_counter > 0) {
                        // We are in a synonym search!
                        this.synonym_search_counter--;

                        if(this.synonym_search_counter == 0) {
                            // All synonyms are done. Turn off the 
                            // 'please wait ...' display.
                            self.display.synonymSearchInProgress.hide();
                            self.display.synonymSearchEnded.show();
                        }

                        // Change the search type to 'synonym'.
                        search_type = 'synonym';

                    } else {
                        // No ongoing synonym searches in progress.
                        // So this is a new direct search result!

                        // Turn off the previous synonym display.
                        self.display.synonymDisplay.hide();
                        self.display.synonymDisplay.synonymList.html("");

                        // Clear synonym flags and counters.
                        self.flag_synonym_bar_displayed = 0;
                        this.synonym_search_counter = 0;

                        // Clear synonym UI.
                        self.display.synonymSearchInProgress.hide();
                        self.display.synonymSearchEnded.show();

                        // Clear current results.
                        self.current_results = [];
                        self.display.clearResults();
                    }

                    // Find all the rows we need to add in this operation.
                    // Uniqueness is determined by concatenating the source_type,
                    // dataset_id and name.
                    ids_currently_in_use = _.map(self.current_results,
                        function(row) {
                            return (row.source_type + "-" + row.dataset_id + 
                                "-" + row.name);
                        }
                    );
                    rows_to_add = _.filter(response.rows,
                        function(row) {
                            var id = (row.source_type + "-" + row.dataset_id
                                + "-" + row.name);
                            return(ids_currently_in_use.indexOf(id) == -1);
                        }
                    );

                    // Display the synonym bar if appropriate.
                    if(
                        rows_to_add.length > 0 && 
                        search_type == 'synonym' && 
                        self.flag_synonym_bar_displayed == 0
                    ) {
                        self.flag_synonym_bar_displayed = 1;
                        self.display.resultList.append(self.display.synonymBar.clone());
                    }

                    // Add the new search results back to current_results. 
                    // Since we've already eliminated duplicates, this will 
                    // only add non-duplicates.
                    if(rows_to_add.length > 0)
                        self.current_results = self.current_results.concat(rows_to_add);

                    // Now,this.current_results is all current results,
                    // and rows_to_add are the new rows to add because
                    // of these search results.

                    // console.log("search_type: " + search_type);
                    // console.log("current_results: " + self.current_results.join(', ') + " (" + self.current_results.length + ")");
                    // console.log("rows_to_add: " + rows_to_add.join(', ') + " (" + rows_to_add.length + ")");

                    if (self.current_results.length > 0) {
                        self.showFilters(self.current_results);

                        // We only want to add the new rows.
                        self.showLayers(rows_to_add);

                        // Synonym matches shouldn't trigger further
                        // synonym searching.
                        if(search_type != 'synonym')
                            self.searchForSynonyms(event.term);
                    } else {
                        self.showNoResults();

                        // Synonym matches shouldn't trigger further
                        // synonym searching.
                        if(search_type != 'synonym')
                            self.searchForSynonyms(event.term);
                    }
                }
            );
        },

        /**
         * Searches for synonyms on the 'synonyms' table in CartoDB.
         * 
         * Parameters:
         *  name: the name to search for.
         *  fn_synonyms: function(array_of_synonyms)
         *      Called with an array of synonym objects to add to the
         *      search. Each object can have a number of properties,
         *      including:
         *          name: The synonym. Required.
         *          url: A URL to the name or the synonymy statement.
         *          type: accepted|related
         *          score: a number between 0 and infinity. Higher scores is
         *              better.
         *      This function will only be called once.
         *  fn_error: function(errorString)
         *      Called after the search completes.
         */
        searchForSynonymsOnCartoDB: function(name, fn_synonyms, fn_error) {
            var self = this;
            console.log("CartoDB synonym search for " + name + " started.");

            // Query mol.cartodb.com for local synonymy information.
            $.ajax({
                url: 'http://mol.cartodb.com/api/v1/sql?q={0}'.format(
                    this.search_synonym_sql.format(
                        $.trim(name)
                        .replace(/ /g, ' ')
                        .toLowerCase()
                    )), 
                dataType: "json",
                timeout: this.synonym_search_timeout,
                complete: function() {
                    // Log the completion of the JSON request.
                    console.log("CartoDB synonym search for " + name + 
                        " completed."); 
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    // Log the error.
                    console.log("CartoDB synonym search failed w/ error: " 
                        + textStatus + "/" + errorThrown);
                    fn_error(textStatus + "/" + errorThrown);
                },
                success: function(result) {
                    // Rows to process.
                    var rows = result['rows'];

                    // Synonyms to add.
                    var synonyms;
                    
                    // Success! Prepare list of synonyms and send them to
                    // fn_synonyms.
                    if(rows) {
                        if(rows.length == 0) {
                            // No matches? Check with TaxRefine.
                            self.searchForSynonymsOnTaxRefine(
                                name,
                                fn_synonyms,
                                fn_error
                            );
                        } else {
                            // Matches found!
                            synonyms = [];
                            rows.forEach(function(row) {
                                var syn_name = row.mol_scientificname;
                                if(syn_name.toLowerCase() == name.toLowerCase()) {
                                    console.log("CartoDB synonym ignored: " + syn_name);
                                } else {
                                    console.log("CartoDB synonym found: " + syn_name);
                                    synonyms.push({'name': syn_name});
                                }
                            }); 
                            if(fn_synonyms(synonyms) == 0) {
                                fn_error("no synonyms found");
                            }
                        }
                    } else {
                        // No 'rows' present. Mysterious.
                        console.log("Unexpected response from CartoDB synonym search: "
                            + Object.keys(result).join(', '));
                        fn_error("Invalid JSON returned.");
                    }
                }
            }); 
        },

        /**
         * Searches for synonyms on TaxRefine in CartoDB.
         *
         * Parameters:
         *  name: the name to search for.
         *  fn_synonyms: function(array_of_synonyms)
         *      Called with an array of synonym objects to add to the
         *      search. Each object can have a number of properties,
         *      including:
         *          name: The synonym. Required.
         *          url: A URL to the name or the synonymy statement.
         *          type: accepted|related
         *          score: a number between 0 and infinity. Higher scores is
         *              better.
         *      This function will only be called once.
         *  fn_error: function(errorString)
         *      Called after the search completes.
         */ 
        searchForSynonymsOnTaxRefine: function(name, fn_synonyms, fn_error) {
            // Store the URL.
            var refine_url = 
                "http://refine.taxonomics.org/gbifchecklists/reconcile?callback=?&query=" 
                + encodeURIComponent(name);

            // Log that we're doing this.
            console.log("TaxRefine synonym search for " + name + " started.");

            // For testing reasons, if the URL contains 'test-break-taxrefine'
            // change the refine_url so we can see what happens if TaxRefine
            // is down.
            if(window.location.href.indexOf("test-break-taxrefine") != -1) {
                refine_url = refine_url.replace("//refine.", "//refine-b.");
            }

            // Query TaxRefine.
            $.ajax({
                url: refine_url,
                dataType: "json",
                timeout: this.synonym_search_timeout,
                complete: function() {
                    // Log the completion of the JSON request.
                    console.log("TaxRefine request complete for " + name + ".");
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    // Log the error.
                    console.log("Error in JSONP request: " + textStatus 
                        + "/" + errorThrown);

                    fn_error(textStatus + "/" + errorThrown);
                },
                success: function(result) {
                    // Names resulting from the JSON query.
                    var names;

                    // duplicate name check: make sure all names are unique.
                    var duplicateNameCheck = {};

                    // Synonyms to add.
                    var synonyms;

                    // Make sure we have some results.
                    if(!result.result)
                        return;
                    names = result.result;

                    // console.log("Names found: " + names.length);

                    // We use this hash to make sure we don't repeat a name.
                    //
                    // Add the actual name to this: we don't want to say that
                    // 'Panthera tigris' is a synonym of 'Panthera tigris'.
                    duplicateNameCheck[name.toLowerCase()] = 1;
                     
                    // Make a list of all non-duplicate synonyms, whether
                    // they are junior synonyms ("related") or senior synonyms
                    // ("accepted").
                    // 
                    // This is particularly importance for TaxRefine which
                    // differentiates between identical names in, say,
                    // different kingdoms.
                    synonyms = [];

                    // Go through all the names that TaxRefine matched.
                    names.forEach(function(name_usage) {
                        // This might be a canonical name.
                        var canonicalName;

                        // It might also be an accepted name.
                        var acceptedName;

                        // match object used to store results of regular
                        // expressions.
                        var match;

                        // If there is a canonical name, store it.
                        if(name_usage.summary && name_usage.summary.canonicalName) {
                            canonicalName = name_usage.summary.canonicalName;

                            // Make a list of canonical name as long as they
                            // haven't been duplicated.
                            if(!duplicateNameCheck[canonicalName.toLowerCase()]) {
                                synonyms.push({
                                    'name': canonicalName,
                                    'url': name_usage.type[0] + name_usage.id,
                                    'type': 'related',
                                    'score': name_usage.score
                                });
                                duplicateNameCheck[canonicalName.toLowerCase()] = 1;
                            }
                        }

                        // If there is an accepted name, store it.
                        if(name_usage.summary && name_usage.summary.accepted) {
                            acceptedName = name_usage.summary.accepted;

                            // The accepted name usually has authority 
                            // information. So let's find a leading 
                            // monomial/binomial/trinomial.
                            match = acceptedName.match(
                                /^\s*([A-Z][a-z\.]+(?:\s+[a-z\.]+(?:\s+[a-z]+)?)?)/
                            );
                            if(match) {
                                // console.log("Matched '" + acceptedName 
                                //      + "' as '" + match[1] + "'");
                                acceptedName = match[1];
                            } else {
                                // console.log("Unable to match '" 
                                //      + acceptedName + "'.");
                            }

                            // If we found an accepted name, and it's not on 
                            // the duplicate name check.
                            if(!duplicateNameCheck[acceptedName.toLowerCase()]) {
                                synonyms.push({
                                    'name': acceptedName,
                                    'url': name_usage.type[0] + name_usage.id,
                                    'type': 'accepted',
                                    'score': name_usage.score
                                });
                                duplicateNameCheck[acceptedName.toLowerCase()] = 1;
                            }
                        }
                    });

                    // Send synonym list to the success callback; if no
                    // synonyms were found, that counts as an error.
                    if(fn_synonyms(synonyms) == 0) {
                        fn_error("no synonyms found");
                    }
                }
            });

        },

        /**
         * Check with TaxRefine for known synonyms of this name,
         * pick the most likely accepted name, add it to the search
         * display, and search for it to extend the current search.
         *
         * TaxRefine uses the GBIF APIs to try to pick the best
         * supported interpretation of a particular taxonomic name.
         * Find out more at 
         * https://github.com/gaurav/taxrefine/#taxrefine
         *
         * Parameters:
         *  name: the name to search for.
         *                  
         */
        searchForSynonyms: function(name) {
            // Store display for easy access.
            var display = this.display;

            // We'll define some function to handle
            // errors and display synonyms.
            var fn_error, fn_synonyms;

            // Display the 'processing ...' message.
            display.synonymSearchEnded.hide();
            display.synonymSearchInProgress.show();
            console.log("searchForSynonyms: " + name
                + " (" + this.synonym_search_counter + ")");

            // If there's an error, turn the synonym search UI off.
            fn_error = function(errorString) { 
                // Turn off the UI.
                display.synonymSearchInProgress.hide();
                display.synonymSearchEnded.show();
            };

            // If we have a set of synonyms, send out search results.
            fn_synonyms = function(synonyms) {
                // Index of the currently processed synonym.
                var index = 0;

                // Log what we're up to.
                console.log("Processing synonym: " + synonyms.length);

                // No synonyms? Then we're done.
                if(synonyms.length == 0)
                    return 0;

                // Sort the synonyms first by the 'type' ('accepted' sorted 
                // above 'related') and then by the score.
                synonyms.sort(function(a,b) {
                    if(b.type == a.type)
                        return b.score - a.score;
                    else {
                        if(b.type > a.type) {
                            return 1;
                        } else {
                            return -1;
                        }
                    }
                });

                // Render all the synonyms into HTML and display them.
                index = 0;
                synonyms.forEach(function(synonym) {
                    index++;

                    // Get the variables we stored.
                    // Bear in mind that only 'name' is required.
                    var name = synonym.name;
                    var url = synonym.url;
                    var type = synonym.type;
                    var score = synonym.score;
                    var source = synonym.source;

                    // Set the name and details in the synonymListItem.
                    var synonymItem = display.synonymDisplay.synonymListItem.clone();
                    $("#name", synonymItem).text(name);
                    
                    // Figure out where to place commas and 'and's.
                    if(index == 1) {
                        // Don't display anything before the first item.
                    } else if(index == synonyms.length) {
                        display.synonymDisplay.synonymList.append(" and ");
                    } else {
                        display.synonymDisplay.synonymList.append(", ");
                    }

                    // Add this to the synonym list.
                    display.synonymDisplay.synonymList.append(synonymItem);

                    // Search for this synonym by expanding the current 
                    // search. Increment the synonym_search_counter so we
                    // know that we are doing synonym searches.
                    self.synonym_search_counter++;
                    self.bus.fireEvent(
                        new mol.bus.Event(
                            'search',
                            {
                                'term': name
                            }
                        )
                    );
                });

                // Set the searched name and GO!
                display.synonymDisplay.searchedName.text(name);
                display.synonymDisplay.show();

                // Return the number of synonyms.
                return index;
            };

            // Search on CartoDB. If CartoDB fails, it will automatically
            // search on TaxRefine.
            this.searchForSynonymsOnCartoDB(name, fn_synonyms, fn_error);
        },

        /**
         * Fires the 'add-map-control' event. The mol.map.MapEngine handles
         * this event and adds the display to the map.
         */
        fireEvents: function() {
            var params = {
                display: this.display,
                slot: mol.map.ControlDisplay.Slot.BOTTOM,
                position: google.maps.ControlPosition.TOP_LEFT
            },
            event = new mol.bus.Event('add-map-control', params);

            this.bus.fireEvent(event);
        },

        /**
         * Handles layers (results) to display by updating the result list
         * and filters.
         *
         * layers:
         *    0:
         *      name: "Coturnix delegorguei"
         *      source: "eafr"
         *      type: "points"
         *
         * @param layers an array of layers
         */
        showLayers: function(layers) {
            var display = this.display;

            // Set layer results in display.
             _.each(
                this.display.setResults(this.getLayersWithIds(layers)), 
                function(result) {
                    result.source.click(
                        function(event) {
                            self.bus.fireEvent(
                                new mol.bus.Event(
                                    'metadata-toggle',
                                    {params : { 
                                        dataset_id: $.data(result[0],'layer')
                                            .dataset_id,
                                        title: $.data(result[0],'layer')
                                            .dataset_title 
                                    }}
                                    
                                )
                            );
                            event.stopPropagation();
                            event.cancelBubble = true;
                        }
                    );
                    result.type.click(
                        function(event) {
                            self.bus.fireEvent(
                                new mol.bus.Event(
                                    'metadata-toggle', 
                                    {
                                        params : { 
                                            type: $.data(result[0],'layer')
                                                .type,
                                            title: $.data(result[0],'layer')
                                                .type_title,
                                        }
                                    }
                                )
                            );
                            event.stopPropagation();
                            event.cancelBubble = true;
                        }
                    );
                },
                this
              );
            this.display.noResults.hide();
            this.display.results.show();
            this.display.toggle(true);
        },
        /*
         * Displays a message when no results are returned 
         * from the search query.
         */
        showNoResults: function() {
            this.display.clearFilters();
            this.display.results.hide();
            this.display.noResults.show();
            this.display.toggle(true);
        },
        /**
         * Returns an array of layer objects {id, name, type, source}
         * with their id set given an array of layer objects
         * {name, type, source}.
         */
        getLayersWithIds: function(layers) {
            return  _.map(
                layers,
                function(layer) {
                    return _.extend(layer, {id: mol.core.getLayerId(layer)});
                }
            );
        },

        showFilters: function(results) {
            var display = this.display,
                filters = this.filters,
                self = this;
            
            
            
            //parse result to fill in the filter values
            _.each(
                _.keys(filters),
                //each filter runs on a layer property
                function(filter) {
                    //first clear out any old filter content
                    filters[filter].values ={};
                    _.each(
                        results,
                        //for each property, set a filter with a title
                        function(row) {    
                            if(row[filter]) {                 
                                filters[filter]
                                    .values[row[filter].replace(/ /g, '_')] 
                                    =  row[filters[filter].title_field];
                            }
                        }
                    );
                }     
            );
            
            display.clearFilters();

            // Set options in each filter.
            _.each(
                _.keys(filters),
                function(filter) {
                    _.each(
                        display.setOptions(
                            filters[filter].title, 
                            filter, 
                            filters[filter].values, 
                            filters[filter].hasIcon
                        ),
                        function(option) {
                            if(option.click) {
                                option.click(
                                    self.optionClickCallback(
                                        option, 
                                        filter
                                    )
                                );
                            }
                        }
                    );
                }
            );
        },

        /**
         * Returns a function that styles the option as selected and removes
         * the selected styles from all other items. This is what gets fired
         * when a filter option is clicked.
         *
         * @param filter mol.map.results.FilterDisplay
         * @param option the filter option display
         */
        optionClickCallback: function(option, filterName) {
            var self = this;

            return function(event) {
                self.updateFilters(option, filterName)
                self.updateResults();
            };
        },
        /*
         *  Creates an array of strings that define the current filter state.
         *  ['type-range,',]
         */
        getSelectedFilters: function() {
            var filters = [];
            _.each(
                $(this.display.filters).find('.filter'),
                function(group) {
                    var options= [];
                    _.each(
                        $(group).find('.selected'),
                        function(filter) {
                            _.each(
                                _.keys($(filter).data()),
                                function(key) {
                                    options.push(
                                        '.{0}-{1}'.format(
                                            key, 
                                            $(filter).data(key)
                                        )
                                    );
                                }
                            );
                        }
                    );
                    if(options.length>0) {
                        filters.push(options.join(', '));
                    }
                }
            );
            return filters;
        },
        /*
         *  Updates the result list based on the selected filters.
         */
        updateResults: function() {
            var filters = this.getSelectedFilters(),
                results = $(this.display).find('.resultContainer'),
                newResults = []; 
            
            if(filters.length > 0) {
                //hide it all
                results.hide()
                //apply the filters
                _.each(
                    filters,
                    function(filter) {
                        results = results.filter(filter);
                    }
                )
                results.show();
             } else {
                results.show();
            }
            
        },
        /*
         *  Keeps the 'All' filter toggle states current.
         */
        updateFilters: function(option, filterName) {
            if(option.hasClass('selected')&&$.trim(option.text())!='All') {
                option.removeClass('selected');
                if(this.display
                       .find('.filter .options .{0}'.format(filterName))
                       .not('.all')
                       .filter('.selected')
                       .length == 0
                  ) {
                        this.display
                            .find('.filter .options .{0}'.format(filterName))
                            .filter('.all')
                            .addClass('selected');
                }
            } else {
                if($.trim(option.text())=='All') {
                    $(this.display.filters)
                        .find('.{0}'.format(filterName))
                        .removeClass('selected'); 
                } else {
                    $(this.display.filters)
                        .find('.{0} .all'.format(filterName))
                        .removeClass('selected');
                }
                option.addClass('selected');
            }
        }
    });

    /**
     * The main display for search results. Contains a search box, a search
     * results list, and search result filters. This is the thing that gets
     * added to the map as a control.
     */
    mol.map.results.ResultsDisplay = mol.mvp.View.extend({
        init: function() {
            var html = '' +
                '<div class="mol-LayerControl-Results">' +
                    '<div class="filters"></div>' +
                    '<div class="searchResults widgetTheme">' +
                        '<div class="results">' +
                            '<div class="resultHeader">' +
                                'Results' +
                                '<a href="#" class="selectNone">none</a>' +
                                '<a href="#" class="selectAll">all</a>' +
                                '<div class="synonymDisplay" style="display: none; padding-top: 5px; padding-bottom: 5px; border-bottom: 1px solid rgba(11, 11, 11, 0.298)">' +
                                    'Search<span class="synonymSearchInProgress">ing</span><span class="synonymSearchEnded">ed</span> for <span class="searchedName" style="font-style: italic">The name you searched for</span> and these known alternative names: <span class="synonymList"></span>.' +
                                '</div>' +
                            '</div>' +
                            '<ol class="resultList"></ol>' +
                            '<div class="pageNavigation">' +
                                '<button class="addAll">' +
                                    'Map Selected Layers' +
                                '</button>' +
                                '<button class="clearResults">' +
                                    'Clear Results' +
                                '</button>' +
                            '</div>' +
                        '</div>' +
                        '<div class="noresults">' +
                            '<h3>No results found.</h3>' +
                            '<div class="synonymSearchInProgress" style="display: none">' +
                                'Searching for synonyms and associated data ...' +
                            '</div>' +
                            '<div class="synonymDisplay" style="display: none">' +
                                '<div class="break" style="clear:both"></div>' + 
                                '<span class="searchedName" style="font-style: italic">The name you searched for</span> is also known as <span class="synonymList"></span>.' +
                            '</div>' +
                            '<div class="synonymSearchEnded" style="display:none">No synonymous data found.</div>'
                        '</div>' +
                    '</div>' +
                '</div>';

            // HTML for a single synonym list entry (i.e. one synonym/accepted name).
            var synonymListItem = "<em><span id='name'></span></em>";

            // Separates direct search results from synonym search results.
            var synonymBar = "<div><center>Synonyms</center></div><div class='break'></div>"

            // Store some HTML elements in the display object so we can refer
            // to them directly.
            this._super(html);
            this.resultList = $(this).find('.resultList');
            this.filters = $(this).find('.filters');
            this.selectAllLink = $(this).find('.selectAll');
            this.selectNoneLink = $(this).find('.selectNone');
            this.addAllButton = $(this).find('.addAll');
            this.clearResultsButton = $(this).find('.clearResults');
            this.results = $(this).find('.results');
            this.noResults = $(this).find('.noresults');

            this.synonymSearchInProgress = $(this).find('.synonymSearchInProgress');
            this.synonymSearchEnded = $(this).find('.synonymSearchEnded');
            this.synonymBar = $(synonymBar);
            this.synonymDisplay = $(this).find('.synonymDisplay');
            this.synonymDisplay.searchedName = $(this.synonymDisplay).find('.searchedName');
            this.synonymDisplay.synonymList = $(this.synonymDisplay).find('.synonymList');
            this.synonymDisplay.synonymListItem = $(synonymListItem);
        },

        clearResults: function() {
            this.resultList.html('');
        },

        clearFilters: function() {
            this.filters.html('');
        },

        toggleSelections: function(showOrHide) {
            $(this).find('.checkbox').each(
                function() {
                    $(this).attr('checked', showOrHide);
                }
            );
        },

        /**
         * Returns an array of layer objects from results that are checked.
         */
        getChecked: function() {
            var checked = [];
            _.each(
                this.find('.resultContainer').filter(':visible'),
                function(result) {
                    if ($(result).find('.checkbox').attr('checked')) {
                        checked.push($(result).data('layer'));
                    } 
                }
            );
            return checked;
        },

        /**
         * Sets the results and returns them as an array of JQuery objects.
         *
         * @param layers An array of layer objects {id, name, type, source}
         */
        setResults: function(layers) {
            return _.map(
                layers,
                function(layer) {
                    var result = new mol.map.results.ResultDisplay(layer);
                    this.resultList.append(result);
                    return result;
                },
                this
            );
        },

        /**
         * Sets the options for a filter and returns an array of jQuery objects.
         */
        setOptions: function(filterName, filterType, optionNames, hasIcon) {
            var self = this,
                filter = new mol.map.results.FilterDisplay(
                    filterType, 
                    filterName
                ),
                options = [filter.find('.all')];
           
            _.each(
                _.keys(optionNames),
                function(name) {
                    var option = new mol.map.results.OptionDisplay(
                        name, filterType, optionNames[name], hasIcon);
                    filter.options.append(option);
                    options.push(option);
                }
            );
            
            filter.attr('id', filterName);
            this.filters.append(filter);
            return(options);
        },

 
    });
    /**
     * The display for a single search result that lives in the result list.
     *
     * @param parent the .resultList element in search display
     */
    mol.map.results.ResultDisplay = mol.mvp.View.extend(
        {
            init: function(layer) {
                var self=this, html = '' +
                     //add filtertype-value as a class for filtering
                    '<div class="' +
                    '   resultContainer name-{1} source_type-{3} type-{4}">' +
                    '   <ul id="{0}" class="result">' +
                    '       <div class="resultSource">' +
                    '          <button>' +
                    '              <img class="source" ' +
                    '                  title="Layer Source: {8}" ' +
                    '                  src="/static/maps/search/{3}.png">' +
                    '          </button>' +
                    '       </div>' +
                    '       <div class="resultType">' +
                    '           <button>'+
                    '               <img class="type" ' +
                    '               title="Layer Type: {7}" ' +
                    '               src="/static/maps/search/{4}.png">' +
                    '           </button>' +
                    '       </div>' +
                    '       <div class="resultName">' +
                    '           <div class="resultRecords">{6}</div>' +
                    '           <div class="resultNomial">{2}</div>' +
                    '           <div class="resultEnglishName" title="{5}">' +
                    '               {5}' +
                    '           </div>' +
                    '           <div class="resultAuthor"></div>' +
                    '       </div>' +
                    '       <label class="buttonContainer">' +
                    '           <input type="checkbox" checked="checked" class="checkbox" />' +
                    '           <span class="customCheck"></span>' +
                    '       </label> ' +
                    '       </ul>' +
                    '   <div class="break"></div>' +
                    '</div>';

                
                this._super(
                    html.format(
                        layer.id,
                        layer.name.replace(/ /g, '_'),
                        layer.name, 
                        layer.source_type, 
                        layer.type, 
                        layer.names, 
                        (layer.feature_count != null) ? 
                            '{0}'.format(layer.feature_count) : '', 
                        layer.type_title, 
                        layer.source_title
                    )
                );
                $.data(this[0],'layer',layer);
                this.infoLink = $(this).find('.info');
                this.nameBox = $(this).find('.resultName');
                this.source = $(this).find('.source');
                this.type = $(this).find('.type');
                this.checkbox = $(this).find('.checkbox');
            }
        }
    );

    /**
     * The display for a single search result filter. Allows you to select
     * a name, source, or type and see only matching search results.
     */
    mol.map.results.FilterDisplay = mol.mvp.View.extend(
        {
            init: function(type, title) {
                var html = '' +
                    '<div class="filter widgetTheme {0}">' +
                    '    <div class="filterName">{1}</div>' +
                    '    <div class="options"></div>' +
                    '</div>';

                this._super(html.format(type, title));
                this.name = $(this).find('.filterName');
                this.options = $(this).find('.options');
                this.allOption = new mol.map.results.OptionDisplay(
                    'all',
                     type,
                    'All', 
                    false
                );
                this.allOption.addClass('selected');
                this.options.append(this.allOption);
            }
        }
    );


    mol.map.results.OptionDisplay = mol.mvp.View.extend({
        init: function(name, type, value, hasIcon) {
            var base_html = '' +
                '<div class="option {0}"></div>',
                button_html = '' +
                '<button>' +
                '   <img src="/static/maps/search/{0}.png">'+
                '</button>',
                label_html = '' +
                '   <span class="option_text">{0}</span>';
                
            if(name != undefined && value != undefined) {    
                this._super(base_html.format(type));
                if(name != 'all') {
                    this.data(type, name); 
                } else {
                    this.addClass('all')
                }
                if(hasIcon) {
                    this.append($(button_html.format(name)));
                }
                this.append($(label_html.format(value)));
            }
            
        }
    });
}
mol.modules.map.search = function(mol) {

    mol.map.search = {};

    mol.map.search.SearchEngine = mol.mvp.Engine.extend({
        /**
         * @param bus mol.bus.Bus
         */
        init: function(proxy, bus) {
            this.proxy = proxy;
            this.bus = bus;
            this.searching = {};
            this.names = [];
            this.seenHint = false;
            this.ac_label_html = ''+
                '<div class="ac-item">' +
                    '<span class="sci">{0}</span>' +
                    '<span class="eng">{1}</span>' +
                '</div>';
            this.ac_sql = "" +
                "SELECT n,v FROM ac WHERE n~*'\\m{0}' OR v~*'\\m{0}'";
            this.search_sql = '' +
                'SELECT DISTINCT l.scientificname as name,'+
                    't.type as type,'+
                    't.cartocss as css,' +
                    't.sort_order as type_sort_order, ' +
                    't.title as type_title, '+
                    't.opacity as opacity, ' +
                    'CONCAT(l.provider,\'\') as source, '+
                    'CONCAT(p.title,\'\') as source_title,'+
                    's.source_type as source_type, ' +
                    's.title as source_type_title, ' +   
                    "CASE WHEN l.feature_count is not null THEN CASE WHEN d.type = 'taxogeooccchecklist' " +
                        'THEN ' +
                            "CONCAT("+
                                "to_char(l.occ_count,'999,999,999'),"+
                                "' records<br>'," +
                                "to_char(l.feature_count, '999,999,999'),"+
                                "' locations'"+
			    ") " +
                        'ELSE ' +
                            "CONCAT(to_char(l.feature_count,'999,999,999'),' features') "+
                    'END ELSE \'\' END as feature_count, '+
                    'CONCAT(n.v,\'\') as names, ' +
                    'CASE WHEN l.extent is null THEN null ELSE ' +
                    'CONCAT(\'{' +
                        '"sw":{' +
                            '"lng":\',ST_XMin(box2d(ST_Transform(ST_SetSRID(l.extent,3857),4326))),\', '+
                            '"lat":\',ST_YMin(box2d(ST_Transform(ST_SetSRID(l.extent,3857),4326))),\' '+
                        '}, '+
                        '"ne":{' +
                        '"lng":\',ST_XMax(box2d(ST_Transform(ST_SetSRID(l.extent,3857),4326))),\', ' +
                        '"lat":\',ST_YMax(box2d(ST_Transform(ST_SetSRID(l.extent,3857),4326))),\' ' +
                        '}}\') ' +
                    'END as extent, ' +
                    'l.dataset_id as dataset_id, ' +
                    'd.dataset_title as dataset_title, ' + 
                    'd.style_table as style_table ' +
                    
                'FROM layer_metadata l ' +
                'LEFT JOIN data_registry d ON ' +
                    'l.dataset_id = d.dataset_id ' +
                'LEFT JOIN types t ON ' +
                    'l.type = t.type ' +
                'LEFT JOIN providers p ON ' +
                    'l.provider = p.provider ' +
                'LEFT JOIN source_types s ON ' +
                    'p.source_type = s.source_type ' +
                'LEFT JOIN ac n ON ' +
                    'l.scientificname = n.n ' +
                'WHERE ' +
                     "n.n~*'^\\m{0}' OR n.v~*'\\m{0}' " +
                'ORDER BY name, type_sort_order';
        },

        /**
         * Starts the SearchEngine. Note that the container parameter is
         * ignored.
         */
        start: function() {
            this.display = new mol.map.search.SearchDisplay();
            this.display.toggle(true);
            this.initAutocomplete();
            this.addEventHandlers();
            this.fireEvents();
        },
        /*
         * Initialize autocomplate functionality
         */
        initAutocomplete: function() {
            this.populateAutocomplete(null, null);

            //http://stackoverflow.com/questions/2435964/jqueryui-how-can-i-custom-format-the-autocomplete-plug-in-results
            $.ui.autocomplete.prototype._renderItem = function (ul, item) {

                item.label = item.label.replace(
                    new RegExp("(?![^&;]+;)(?!<[^<>]*)(" +
                       $.ui.autocomplete.escapeRegex(this.term) +
                       ")(?![^<>]*>)(?![^&;]+;)", "gi"), 
                    "<strong>$1</strong>"
                );
                return $("<li></li>")
                    .data("item.autocomplete", item)
                    .append("<a>" + item.label + "</a>")
                    .appendTo(ul);
            };
        },

        /*
         * Populate autocomplete results list
         */
        populateAutocomplete : function(action, response) {
            var self = this;
            $(this.display.searchBox).autocomplete(
                {
                    minLength: 3, 
                    source: function(request, response) {
                        $.getJSON(
                            mol.services.cartodb.sqlApi.jsonp_url.format(
                                    self.ac_sql.format(
                                        $.trim(request.term)
                                            .replace(/ /g, ' ')
                                    )
                            ),
                            function (json) {
                                var names = [],scinames=[];
                                _.each (
                                    json.rows,
                                    function(row) {
                                        var sci, eng;
                                        if(row.n != undefined){
                                            sci = row.n;
                                            eng = (row.v == null || 
                                                row.v == '') ? 
                                                    '' :
                                                    ', {0}'.format(
                                                        row.v.replace(
                                                            /'S/g, "'s"
                                                        )
                                                    );
                                            names.push({
                                                label:self.ac_label_html
                                                    .format(sci, eng), 
                                                value:sci
                                            });
                                            scinames.push(sci);
                                       }
                                   }
                                );
                                if(scinames.length>0) {
                                    self.names=scinames;
                                }
                                response(names);
                                self.bus.fireEvent(
                                    new mol.bus.Event(
                                        'hide-loading-indicator', 
                                        {source : "autocomplete"}
                                    )
                                );
                             },
                             'json'
                        );
                    },
                    select: function(event, ui) {
                        self.searching[ui.item.value] = false;
                        self.names = [ui.item.value];
                        self.search(ui.item.value);
                    },
                    close: function(event,ui) {

                    },
                    search: function(event, ui) {
                        self.searching[$(this).val()] = true;
                        self.names=[];
                        self.bus.fireEvent(
                            new mol.bus.Event(
                                'show-loading-indicator', 
                                {source : "autocomplete"}
                            )
                        );
                    },
                    open: function(event, ui) {
                        self.searching[$(this).val()] = false;
                        self.bus.fireEvent(
                             new mol.bus.Event(
                                'hide-loading-indicator', 
                                {source : "autocomplete"}
                            )
                        );
                    }
              });
        },

        addEventHandlers: function() {
            var self = this;

            /**
             * Callback that toggles the search display visibility. The
             * event is expected to have the following properties:
             *
             *   event.visible - true to show the display, false to hide it.
             *
             * @param event mol.bus.Event
             */
            this.bus.addHandler(
                'search-display-toggle',
                function(event) {
                    if(event.visible != true ) {
                        self.display.searchDisplay.hide();
                        self.display.find('.toggle').text('▶');
                    } else {
                        
                        self.display.searchDisplay.show();
                        self.display.find('.toggle').text('◀');
                    }
                    self.bus.fireEvent(
                        new mol.bus.Event('results-display-toggle', {})
                    );
                  
                }
            );
            this.bus.addHandler(
                'show-search-hint',
                function(event) {
                    if(!self.seenHint) {
                        self.display.qtip({
                            content: {
                                text: '' +
                                    '<div class="mol-hint">' +
                                        'Type a species name here and select.' +
                                    '</div>'
                            },
                            style: { width: {min: 400, max:500}},
                            position: {
                                my: 'top left',
                                at: 'bottom right'
                            },
                            show: {
                                event: false,
                                ready: true
                            },
                            hide: {
                                fixed: false,
                                event: 'unfocus'
                            }
                        });
                        self.seenHint=true;
                    }
                }
            );
            this.bus.addHandler(
                'close-autocomplete',
                function(event) {
                    $(self.display.searchBox).autocomplete("close");
                }
            );
            this.bus.addHandler(
                'hide-search',
                function(event) {
                    $(self.display).hide();
                }
            );
            this.bus.addHandler(
                'show-search',
                function(event) {
                    $(self.display).show();
                }
            );
            this.bus.addHandler(
                'search',
                function(event) {
                    if (event.term != undefined) {
                        if (!self.display.is(':visible')) {
                            self.bus.fireEvent(
                                new mol.bus.Event(
                                    'search-display-toggle',
                                    {visible : true}
                                )
                            );
                        }

                        self.search(event.term);

                        if (self.display.searchBox.val()=='') {
                            self.display.searchBox.val(event.term);
                        }
                    }
               }
            );

            /**
             * Clicking the go button executes a search.
             */
            
            this.display.click(
                function(event) {
                    $(this).qtip("hide");  
                    
                    
                }
            )
            
            this.display.goButton.click(
                function(event) {
                    self.userEnteredSearch(self.display.searchBox.val());
                }
            );

            /**
             * Clicking the cancel button hides the search display and fires
             * a cancel-search event on the bus.
             */
            this.display.toggleButton.click(
                function(event) {
                    var params = {
                        visible: false
                    }, that = this;
                    
                    if(self.display.searchDisplay.is(':visible')) {
                        self.display.searchDisplay.hide();
                        $(this).text('▶');
                        params.visible = false;
                    } else {
                        
                        self.display.searchDisplay.show();
                        $(this).text('◀');
                        params.visible = true;
                    }
                    
                    self.bus.fireEvent(
                        new mol.bus.Event('results-display-toggle', params));
                }
            );

            /**
             * Pressing the return button clicks the go button.
             */
            this.display.searchBox.keyup(
                function(event) {
                    if (event.keyCode === 13) {
                        $(this).autocomplete("close");
                        self.bus.fireEvent(
                            new mol.bus.Event(
                                'hide-loading-indicator', 
                                {source : "autocomplete"}
                            )
                        );
                        self.userEnteredSearch($(this).val());
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
                    slot: mol.map.ControlDisplay.Slot.TOP,
                    position: google.maps.ControlPosition.TOP_LEFT
                },
                event = new mol.bus.Event('add-map-control', params);

            this.bus.fireEvent(event);
        },

        /** 
         * Searches CartoDB using a term from the search box.
         * This checks the user-entered search term before
         * passing it on to search().
         */
        userEnteredSearch: function(term) {
            var self = this;

            // Trim the term. Since we later overwrite the search string,
            // this trims that as well.
            term = $.trim(term);

            // Turn off autocomplete.
            $(self.display.searchBox).autocomplete('disable');    
            $(self.display.searchBox).autocomplete('close');    

            // Produce an error if it's too short.
            if(term.length < 3) {
                if (term.length == 0) {
                    self.bus.fireEvent(new mol.bus.Event('clear-results'));
                } else {
                    alert('' +
                        'Please enter at least 3 characters ' +
                        'in the search box.'
                     );
                }
                return;
            }

            // Clear results, otherwise the box just stays on the screen
            // and looks ugly.
            self.bus.fireEvent(new mol.bus.Event('clear-results'));

            // Now that the term is cleaned, go through the normal search
            // procedure.
            self.search(term);
        },

        /**
         * Searches CartoDB using a term from the search box.
         *
         * @param term the search term (scientific name)
         */
        search: function(term) {
            var self = this;

            // Show loading indicator.
            self.bus.fireEvent(
                new mol.bus.Event(
                    'show-loading-indicator', 
                    {source : "search-{0}".format(term)}
                )
            );

            $.ajax({
                url: 'http://mol.cartodb.com/api/v1/sql?q={0}'.format(
                    this.search_sql.format(
                        $.trim(term)
                        .replace(/ /g, ' ')
                    )
                ),
                dataType: "json",
                timeout: this.search_query_timeout,
                error: function(jqXHR, textStatus, errorThrown) {
                    console.log("Error searching for layers with term '" +
                        term + "': " + textStatus + "/" + errorThrown);

                    // Fire a 'search-results' so the synonym count is
                    // managed correctly.
                    self.bus.fireEvent(
                        new mol.bus.Event(
                            'search-results',
                            {
                                term: term,
                                response: {
                                    rows: []
                                }
                            }
                        )
                    );

                    // Reset the UI.
                    self.bus.fireEvent(
                        new mol.bus.Event(
                            'hide-loading-indicator', 
                            {source : "search-{0}".format(term)}
                        )
                    );

                    $(self.display.searchBox).autocomplete('enable');
                },
                success: function (response) {
                    var results = {term:term, response:response};

                    self.bus.fireEvent(
                        new mol.bus.Event(
                            'hide-loading-indicator', 
                            {source : "search-{0}".format(term)}
                        )
                    );
                    self.bus.fireEvent(
                        new mol.bus.Event(
                            'search-results', 
                            results
                        )
                    );
                    $(self.display.searchBox).autocomplete('enable');
                }
            });

        }
    });

    mol.map.search.SearchDisplay = mol.mvp.View.extend({
        init: function() {
            var html = '' +
                '<div class="mol-LayerControl-Search widgetTheme" style="display: inline-block">' +
                '    <div class="title">Search</div>' +
                '    <div class="searchDisplay">' +
                '       <input class="value ui-autocomplete-input" type="text" ' +
                            'placeholder="Search by species name">' +
                '       <button class="execute">Go</button>' +
                '   </div>'+
                '   <button class="toggle">▶</button>' +
                '</div>';

            this._super(html);
            this.goButton = $(this).find('.execute');
            this.toggleButton = $(this).find('.toggle');
            this.searchDisplay = $(this).find('.searchDisplay');
            this.searchBox = $(this).find('.value');
        },

        clear: function() {
            this.searchBox.html('');
        }
    });
};
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
                'layer-click-action',
                function(event) {
                    self.clickAction = event.action;
                    if (self.clickAction == 'info'){
                        self.updateGrid(true);
                    } else {
                        self.updateGrid(false);
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
                            gridmt;
                            style = event.style;
                            sel = event.isSelected;

                        self.bus.fireEvent(new mol.bus.Event('clear-map'));

                        self.map.overlayMapTypes.forEach(
                            function(maptype, index) {
                                //find the overlaymaptype to style
                                if(maptype.name == 'grid') {
                                    gridmt = maptype;
                                    self.map.overlayMapTypes.removeAt(index);
                                }

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
                        if(self.clickAction == 'info') {
                            self.updateGrid(true);
                        }



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
                        if(self.clickAction == 'info') {
                            self.updateGrid(true);
                        } else {
                            self.updateGrid(false);
                        }
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
                this.bus.addHandler(
                     'update-grid',
                     function(event) {
                         if(event.toggle == true) {
                             self.updateGrid(true);
                         } else {
                             self.updateGrid(false);
                         }
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
            if(this.clickAction == 'info') {
                this.updateGrid(true);
            } else {
                this.updateGrid(false);
            }
        },
        updateGrid: function(toggle) {
             var gridmt,
                self = this;

             this.map.overlayMapTypes.forEach(
                 function (mt, i) {
                     if(mt) {
                         if(mt.name=='grid') {
                            self.map.overlayMapTypes.removeAt(i);
                         }
                     }
                  }
             );

             if(toggle==true && this.map.overlayMapTypes.length>0) {
                gridmt = new mol.map.tiles.GridTile(this.map);
                this.map.overlayMapTypes.push(gridmt.layer);
             }
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
                        ),
                gridmt;
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

            this.map.overlayMapTypes.forEach(
                function(mt, i) {
                    if(mt.name == 'grid') {
                        self.map.overlayMapTypes.removeAt(i);
                    }
                }
            );

            this.map.overlayMapTypes.insertAt(0,maptype.layer);

            if(this.clickAction == 'info') {
                this.updateGrid(true);
            } else {
                this.updateGrid(false);
            }

        }
    });

    mol.map.tiles.CartoDbTile = Class.extend({
        init: function(layer, map) {
            var sql =  "" + //c is in case cache key starts with a number
                "SELECT * FROM get_tile('{0}','{1}','{2}','{3}')"
                .format(
                    layer.source,
                    layer.type,
                    layer.name,
                    layer.dataset_id,
                    mol.services.cartodb.tileApi.tile_cache_key
                ),
                urlPattern = '' +
                    'http://{HOST}/tiles/mol_style/{Z}/{X}/{Y}.png?'+
                    'sql={SQL}'+
                    '&style={TILE_STYLE}' +
                    '&cache_key={CACHE_KEY}',
                style_table_name = layer.style_table,
                pendingurls = [],
                options,
                self = this;

            if(layer == null || layer == undefined) {
                return;
            }

            if(layer.tile_style == undefined) {
                if(layer.css != null && layer.css != '') {
                    layer.tile_style = "#mol_style {0}"
                        .format(layer.css);
                } else {
                    layer.tile_style = "";
                }
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
                        .replace("{SQL}",sql)
                        .replace("{X}",x)
                        .replace("{Y}",y)
                        .replace("{Z}",zoom)
                        .replace("{TILE_STYLE}",
                             encodeURIComponent(layer.tile_style))
                        .replace("{CACHE_KEY}",
                            mol.services.cartodb.tileApi.tile_cache_key);

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
                }).error(function() {
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

    mol.map.tiles.GridTile = Class.extend({
        init: function(map) {
            var options = {
                    // Just a blank image
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


                        return ('/static/blank_tile.png?z={0}&x={1}&y={2}&'
                            .format(
                                 zoom, x, y
                            ));
                    },
                    tileSize: new google.maps.Size(256, 256),
                    maxZoom: 9,
                    minZoom: 0,
                    opacity: 0
            },
                sql =  "" + //wrap unioned tile requests
                    "SELECT g.*, 1 as cartodb_id " +
                    "FROM ({0}) g",
                layersql = '' +
                    "SELECT " +
                        "the_geom_webmercator as the_geom_webmercator, " +
                        "seasonality, '{1}' as  type, " +
                        "'{0}' as provider, " +
                        "'{3}' as dataset_id, " +
                        "'{2}' as scientificname " +
                    "FROM " +
                        "get_tile('{0}','{1}','{2}','{3}')",
                gridUrlPattern = '' +
                    'http://{0}/' +
                    'tiles/generic_style/{z}/{x}/{y}.grid.json?'+
                    'interactivity=cartodb_id&sql={1}',
                gridUrl = gridUrlPattern.format(
                    mol.services.cartodb.tileApi.host,
                    sql.format(
                        $.map(
                            map.overlayMapTypes.getArray(),
                            function(mt) {
                                if(mt.name != 'grid' && mt.name != undefined) {
                                    return layersql.format(
                                        mt.layer.source,
                                        mt.layer.type,
                                        unescape(mt.layer.name.replace(/percent/g,'%')),
                                        mt.layer.dataset_id
                                    );
                                }
                            }
                        ).join(' UNION ')
                    )
                ),
                self = this;

            this.layer = new google.maps.ImageMapType(options);
            this.layer.name = 'grid';
            this.layer.layer = {};
            this.layer.layer.name = 'grid';
            //Wrap the stock getTile to add grid events.
            this.baseGetTile = this.layer.getTile;
            this.layer.getTile = function(tileCoord, zoom, ownerDocument) {
                var node = self.baseGetTile(tileCoord, zoom, ownerDocument),
                    y = tileCoord.y,
                    x = tileCoord.x,
                    tileRange = 1 << zoom,
                    url;

                    if (y < 0 || y >= tileRange) {
                        return null;
                    }
                    if (x < 0 || x >= tileRange) {
                        x = (x % tileRange + tileRange) % tileRange;
                    }

                    url = gridUrl
                        .replace('{x}',x)
                        .replace('{y}',y)
                        .replace('{z}',zoom);


                $.getJSON(
                    url,
                    function(result) {
                        result.url = url;
                        if(!result.error) {
                            $('img',node).data('grid',result);
                        }
                    }
                ).error(
                    function(result) {
                        //oh well
                });

                $("img", node).mousemove(
                    function(event) {
                        var x = Math.round(event.offsetX*(64/256)),
                            y = Math.round(event.offsetY*(64/256)),
                            grid = $(this).data('grid');

                        if(grid) {
                            if(grid.grid[y]!=undefined) {
                                if(grid.grid[y][x] != undefined) {
                                    if(grid.grid[y][x] == ' ') {
                                        map.setOptions({
                                            draggableCursor: 'auto'
                                        });
                                    } else {
                                        map.setOptions({
                                            draggableCursor: 'pointer'
                                        });
                                    }
                                }
                             }
                        }
                    }
                );
                return node;
            }
        }
    });
}
mol.modules.map.dashboard = function(mol) {

    mol.map.dashboard = {};

    mol.map.dashboard.DashboardEngine = mol.mvp.Engine.extend(
        {
            init: function(proxy, bus) {
                this.proxy = proxy;
                this.bus = bus;
                this.summary_sql = '' +
                    'SELECT DISTINCT * ' +
                    'FROM get_dashboard_summary_beta()';
                this.dashboard_sql = '' +
                    'SELECT DISTINCT * ' +
                    'FROM dashboard_metadata_mar_8_2013 ' +
                    'ORDER BY dataset_title asc';
                this.summary = null;
                this.types = {};
                this.sources = {};

            },

            start: function() {
                this.initDialog();
            },
            addEventHandlers: function() {
                var self = this;

                /**
                 * Callback that toggles the dashboard display visibility.
                 *
                 * @param event mol.bus.Event
                 */
                this.bus.addHandler(
                    'taxonomy-dashboard-toggle',
                    function(event) {
                        var params = null,
                            e = null;
                        if (event.state === undefined) {
                            if(self.display.dialog('isOpen')) {
                                self.display.dialog('close');
                            } else {
                                self.display.dialog('open');
                            }
                        } else {
                            self.display.dialog(event.state);
                        }
                    }
                );

                _.each(
                    this.display.datasets,
                    function(dataset) {
                        var provider = $(dataset).data('provider'),
                            type = $(dataset).data('type_id'),
                            dataset_id = $(dataset).data('dataset_id'),
                            dataset_title = $(dataset).data('dataset_title'),
                            type_title = $(dataset).data('type');

                        $(dataset).find('.table').click (
                            function(event) {
                                self.bus.fireEvent(
                                    new mol.bus.Event(
                                        'metadata-toggle',
                                        {params:
                                            {dataset_id: dataset_id,
                                             title: dataset_title}}
                                     )
                                 );
                            }
                        );
                        $(dataset).find('.type').click (
                                function(event) {
                                    self.bus.fireEvent(
                                        new mol.bus.Event(
                                            'metadata-toggle',
                                            {params:{type: type, title: type_title}}));
                                }
                         );
                    }
                );
            },

            /**
             * Fires the 'add-map-control' event. The mol.map.MapEngine handles
             * this event and adds the display to the map.
             */
            initDialog: function() {
                var self = this;
				
                $.getJSON(
                    'http://mol.cartodb.com/api/v1/sql?callback=?&q={0}'.format(this.dashboard_sql),
                    function(response) {
                        self.display = new mol.map.dashboard.DashboardDisplay(
                            response.rows, self.summary
                        );
                        self.addEventHandlers();
                        self.display.dialog(
                            {
                                autoOpen: false,
                                width: 946,
                                height: 600,
                                minHeight: 300,
                                stack: true,
                                dialogClass: "mol-Dashboard",
                                title: 'Dashboard - ' +
                                'Statistics for Data Served by the Map of Life',
                                open: function(event, ui) {
                                     $(".mol-Dashboard-TableWindow")
                                        .height(
                                            $(".mol-Dashboard").height()-95);

                                     //need this to force zebra on the table
                                     self.display.dashtable
                                        .trigger("update", true);
                                }
                            }
                        );

                        $(".mol-Dashboard").parent().bind("resize", function() {
                            $(".mol-Dashboard-TableWindow")
                                .height($(".mol-Dashboard").height()-95);
                        });
                       
                    }
                );

                $.getJSON(
                    'http://mol.cartodb.com/api/v1/sql?q={0}'.format(this.summary_sql),
                    function(response) {
                        self.summary = response.rows[0];
                        if(self.display) {
                            self.display.fillSummary(self.summary);
                        }
                    }
                );
            }
        }
    );

    mol.map.dashboard.DashboardDisplay = mol.mvp.View.extend(
        {
            init: function(rows, summary) {
                var html = '' +
                    '<div id="dialog">' +
                    '  <div >' +
                    '    <div class="summary">' +
                    '      <span class="label">' +
                             'Data sources:' +
                    '      </span>' +
                    '      <span class="providers">' +
                    '      </span>' +
                    '      <span class="label">' +
                             'Datasets:' +
                    '      </span>' +
                    '      <span class="datasets">' +
                    '      </span>' +
                    '      <span class="label">' +
                             'Species names in source data:' +
                    '      </span>' +
                    '      <span class="names">' +
                    '      </span>' +
                    '      <span class="label">' +
                             'Accepted species names:' +
                    '      </span>' +
                    '      <span class="all_matches">' +
                    '      </span>' +
                    '      <span class="label">' +
                             'Total records:' +
                    '      </span>' +
                    '      <span class="records_total">' +
                    '      </span>' +
                    '    </div>' +
                    '    <div class="mol-Dashboard-TableWindow">' +
                    '      <table class="dashtable">' +
                    '       <thead>' +
                    '        <tr>' +
                    '          <th><b>Dataset</b></th>' +
                    '          <th><b>Type</b></th>' +
                    '          <th><b>Source</b></th>' +
                    '          <th><b>Taxon</b></th>' +
                    '          <th><b>Species Names</b></th>' +
                    '          <th><b>Records</b></th>' +
                    '          <th><b>% Match</b></th>' +
                    '        </tr>' +
                    '       </thead>' +
                    '       <tbody class="tablebody"></tbody>' +
                    '      </table>' +
                    '    </div>' +
                    '  <div>' +
                    '</div>  ',
                    self = this;


                this._super(html);
                _.each(
                    rows,
                    function(row) {
                        self.fillRow(row);
                    }
                )

                this.dashtable = $(this).find('.dashtable');
                this.dashtable.tablesorter({
                    sortList: [[0,0]],
                    widthFixed: true,
                    theme: "blue",
                    widgets: ["filter","zebra","scroller"],
                    widgetOptions : {
                      scroller_height : 500,
                      scroller_barWidth : 17,
                      scroller_jumpToHeader: true,
                      scroller_idPrefix : 's_'
                    }
                });
                this.datasets = $(this).find('.dataset');

                this.dashtable.find("tr.master")
                    .click(function() {
                        $(this).parent().find('tr').each(
                            function(index, elem) {
                                $(elem).find('td').each(
                                    function(index, el) {
                                        if($(el).hasClass('selectedDashRow')) {
                                            $(el).removeClass('selectedDashRow');
                                        }
                                    }
                                )
                            }
                        )

                        $(this).find('td').each(
                            function(index, elem) {
                                $(elem).addClass('selectedDashRow');
                            }
                        )
                    }
                );

                if(summary!=null) {
                    self.fillSummary(summary);
                }
            },

            fillRow:  function(row) {
                var self = this;

                $(this).find('.tablebody').append(
                    new mol.map.dashboard.DashboardRowDisplay(row));
            },

            fillSummary: function(summary) {
                var self = this;
                _.each(
                    _.keys(summary),
                    function(stat){
                        $(self).find('.{0}'.format(stat)).text(summary[stat]);
                    }
                )
            }
        }
    );

    mol.map.dashboard.DashboardRowDisplay = mol.mvp.View.extend(
        {
            init: function(row) {
                var html = '' +
                    '<tr class="master dataset">' +
                        '<td class="table {8}">{8}</td>' +
                        '<td class="type {0}">{1}</td>' +
                        '<td class="provider {2}">{3}</td>' +
                        '<td class="class {4}">{5}</td>' +
                        '<td class="spnames">{6}</td>' +
                        '<td class="records">{7}</td>' +
                        '<td class="pctmatch">{9}</td>' +
                    '</tr>',
                    self = this;

                self._super(
                    html.format(
                        row.type_id,
                        row.type,
                        row.dataset_id,
                        row.provider,
                        row.classes.split(',').join(' '),
                        row.classes.split(',').join(', '),
                        this.format(row.species_count),
                        this.format(row.feature_count),
                        row.dataset_title,
                        row.pct_in_tax
                    )
                );
                //store some data in each dataset/row
                 _.each(
                     _.keys(row),
                     function(key) {
                        $(self).data(key, row[key]);
                     }
                );
            },

            format: function(number, comma, period) {
                var reg = /(\d+)(\d{3})/;
                var split = number.toString().split('.');
                var numeric = split[0];
                var decimal;

                comma = comma || ',';
                period = period || '.';
                decimal = split.length > 1 ? period + split[1] : '';

                while (reg.test(numeric)) {
                  numeric = numeric.replace(reg, '$1' + comma + '$2');
                }

                return numeric + decimal;
            }
         }
    );



};
mol.modules.map.feature = function(mol) {

    mol.map.feature = {};

    mol.map.feature.FeatureEngine = mol.mvp.Engine.extend({
        init : function(proxy, bus, map) {
            this.proxy = proxy;
            this.bus = bus;
            this.map = map;
            //TODO add
            this.url = 'http://mol.cartodb.com/api/v2/sql?callback=?&q={0}';
            //TODO add
            this.sql = "SELECT * FROM " +
                       "get_map_feature_metadata({0},{1},{2},{3},'{4}')";
            
            this.clickDisabled = false;
            this.makingRequest = false;
            this.mapMarker;
            this.activeLayers = [];

            this.lastRequestTime;
            google.maps.event.clearListeners(this.map,'click');
                this.map.setOptions({
                draggableCursor: 'auto'
            });
            google.maps.event.addListener(
                this.map,
                "click",
                this.featureclick.bind(this)
            );
        },

        start : function() {
            this.addEventHandlers();
        },

        addEventHandlers : function () {
            var self = this;

            this.bus.addHandler(
                'add-layers',
                function(event) {
                    var newLays = _.map(event.layers,
                                        function(l) {
                                          var o = {id:l.id, op:l.opacity};

                                          return o });

                    self.activeLayers = _.compact(
                                            _.union(
                                                newLays,
                                                self.activeLayers));
                }
            );

            this.bus.addHandler(
                'remove-layers',
                function(event) {
                    var oldLays = _.map(event.layers,
                                        function(l) {
                                            var o = {id:l.id, op:l.opacity};
                                            return o;
                                        });

                    _.each(oldLays, function(e) {
                        self.activeLayers = _.reject(
                                                self.activeLayers,
                                                function(ol) {
                                                    return ol.id == e.id;
                                                });
                    });
                }
            );

            this.bus.addHandler(
                'layer-toggle',
                function(event) {
                    _.each(self.activeLayers, function(al) {
                        if(al.id == event.layer.id) {
                            al.op = event.showing ? 1 : 0;
                        }
                    });
                }
            );
            this.bus.addHandler(
                'clear-map',
                function(event) {
                    if (self.mapMarker) {
                        self.mapMarker.remove();
                    }
                    self.map.setOptions({scrollwheel:true});
                }
            );

            this.bus.addHandler(
                'layer-click-action',
                function(event) {
                    var action = event.action;

                    self.clickDisabled = (action == 'info') ? false: true;



                    if(self.clickDisabled == false) {
                        google.maps.event.clearListeners(self.map,'click');
                        self.map.setOptions({
                            draggableCursor: 'auto'
                        });
                        google.maps.event.addListener(
                            self.map,
                            "click",
                            self.featureclick.bind(self)
                        );

                        //self.bus.fireEvent(
                        //    new mol.bus.Event('update-grid',{toggle: true}));
                    }
                }
            );
        },
        featureclick : function (mouseevent) {
            var tolerance = 4,
                sqlLayers,
                sql,
                sym,
                self = this;

            if(!this.clickDisabled && this.activeLayers.length > 0) {
                if(this.display) {
                    this.display.remove();
                }

                sqlLayers =  _.pluck(_.reject(
                                this.activeLayers,
                                function(al) {
                                    return al.op == 0;
                                }), 'id');

                sql = this.sql.format(
                        mouseevent.latLng.lng(),
                        mouseevent.latLng.lat(),
                        tolerance,
                        this.map.getZoom(),
                        sqlLayers.toString()
                );

                this.bus.fireEvent(new mol.bus.Event(
                    'show-loading-indicator',
                    {source : 'feature'}));



                $.getJSON(
                    this.url.format(sql),
                    function(data, textStatus, jqXHR) {
                        var results = {
                                latlng: mouseevent.latLng,
                                response: data
                            },
                            e;

                        if(!data.error && data.rows.length != 0) {
                            self.processResults(data.rows);
                            self.showFeatures(results)
                        }

                        self.makingRequest = false;

                        self.bus.fireEvent(
                            new mol.bus.Event(
                              'hide-loading-indicator',
                              {source : 'feature'}));
                    }
                );
            }
        },
        processResults: function(rows) {
            var self = this,
                o,
                vs,
                all,
                allobj,
                head,
                sp,
                myLength,
                content,
                entry,
                inside;

            self.display = new mol.map.FeatureDisplay();
            self.display.mousemove(
                function(event) {
                    self.map.setOptions({scrollwheel:false})
                }
            );
            self.display.mouseout(
                function(event) {
                    self.map.setOptions({scrollwheel:true})
                }
            );


            self.featurect = 0;
            _.each(rows, function(row) {
                var i,
                    j,
                    k,
                    layerId,
                    icon,
                    contentHtml = '' +
                        '<h3>' +
                            '<a class="{5}" href="javascript:">' +
                                '<table width="100%"><tbody><tr>' +
                                '<td class="name">{0}</td>' +
                                '<td class="icons">' +
                                    '<span class="stylerContainer"></span>' +
                                    '<button ' +
                                        'class="type" ' +
                                        'title="Layer Type: {3}">' +
                                        '<img src="/static/maps/search/{4}.png">' +
                                    '</button>' +
                                    '<button ' +
                                        'class="source" ' +
                                        'title="Layer Source: {1}">' +
                                        '<img src="/static/maps/search/{2}.png">' +
                                    '</button>' +
                                '</td></tr></tbody></table>' +
                            '</a>' +
                        '</h3>';

                o = JSON.parse(row.get_map_feature_metadata);
                all = _.values(o)[0];
                allobj = all[0];
                layerId =  _.keys(o)[0];
                head = layerId.split("--");
                sp = mol.core.decode(head[1]).replace(/_/g, ' ');
                sp = sp.charAt(0).toUpperCase() + sp.slice(1);

                content = contentHtml.format(
                    sp,
                    allobj["Source"],
                    head[5],
                    allobj["Type"],
                    head[2],
                    layerId
                );

                //TODO try a stage content display
                myLength = (all.length > 100) ? 100 : all.length;
                self.featurect+=(all.length);

                if(myLength == 1) {
                    entry = '<div>{0} record found.'.format(all.length);
                } else {
                    entry = '<div>{0} records found.'.format(all.length);
                }

                if(all.length > 100) {
                    entry+=' Displaying first 100 records. Please zoom in '+
                        'before querying again to reduce the number of ' +
                        'records found.</div>';
                } else {
                    entry+='</div>';
                }

                for(j=0;j<myLength;j++) {
                    vs = all[j];
                    inside = '';

                    for(i=0;i < _.keys(vs).length; i++) {
                        k = _.keys(vs)[i];
                        if(k!=null && vs[k] != null && k!='' && vs[k] != '') {
                            inside+='<div class="itemPair">' +
                                '<b>{0}:&nbsp;</b>{1}</div>'
                                    .format(k,vs[k]);
                        }
                    }

                    if(j!=0) {
                        entry+="<div>&nbsp</div>";
                    }

                    entry+=inside;
                }

                content+='<div>{0}</div>'.format(entry);

                $(self.display).find('.accordion').append(content);
                icon = $('.layers #{0} .styler'.format(
                            mol.core.encode(layerId))).clone()
                $(icon).attr('title','');
                $(self.display).find(
                    '.{0} .stylerContainer'.format(mol.core.encode(layerId))
                ).append(icon);
                $(self.display).find('.source').click(
                    function(event) {
                          self.bus.fireEvent(
                              new mol.bus.Event(
                                  'metadata-toggle',
                                  {params : {
                                      dataset_id: head[4],
                                      title: allobj["Source"]
                                  }}
                              )
                          );
                          event.stopPropagation();
                          event.cancelBubble = true;
                      }
                );

                $(self.display).find('.type').click(
                    function(event) {
                          self.bus.fireEvent(
                              new mol.bus.Event(
                                  'metadata-toggle',
                                  {params : {
                                      type: head[2],
                                      title: allobj["Type"]
                                  }}
                              )
                          );
                          event.stopPropagation();
                          event.cancelBubble = true;
                      }
                );
            });
        },

        showFeatures: function(params) {
            var self = this,
                latHem = (params.latlng.lat() > 0) ? 'N' : 'S',
                lngHem = (params.latlng.lng() > 0) ? 'E' : 'W',
                options = {
                    autoHeight: false,
                    collapsible: (params.response.total_rows > 1) ? true: false,
                    change: function (event, ui) {
                        self.mapMarker.draw();
                    },
                    animated: false
                },
                zoom = parseInt(self.map.getZoom()),
                tolerance = 3,
                radius = Math.round(
                    tolerance*40075000/(256*1000*Math.pow(2,zoom))
                ),
                infoHtml = '' +
                    '<span>' +
                        '{0} feature{1} from {2} layer{3} found within<br>' +
                        '{4} km of {5}&deg;{6}, {7}&deg;{8}' +
                    '</span>';

            if(params.response.total_rows > 1) {
                options.active = false;
            }

            info = $(infoHtml.format(
                        self.featurect,
                        ((self.featurect>1) ? 's' : ''),
                        params.response.total_rows,
                        ((params.response.total_rows>1) ? 's' : ''),
                        radius,
                        Math.round(params.latlng.lat()*1000)/1000,
                        latHem,
                        Math.round(params.latlng.lng()*1000)/1000,
                        lngHem
            ));

            $(self.display).find('.info').append(info);
            $(self.display).find('.accordion').accordion(options);

            self.display.close.click(
                function(event) {
                    event.stopPropagation();
                    self.mapMarker.remove();
                    self.map.setOptions({scrollwheel:true});
                }
            );
            self.mapMarker = new mol.map.FeatureMarker(
                params.latlng,
                self.map,
                self.display[0]
            );
        }
    });

    mol.map.FeatureDisplay = mol.mvp.View.extend({
        init : function(d, lat,NS,lng,EW) {
            var className = 'mol-Map-FeatureDisplay',
                html = '' +
                    '<div class="cartodb-popup">' +
                        '<a class="cartodb-popup-close-button close">x</a>' +
                        '<div class="mol-Map-FeatureDisplay ">' +
                            '<div class="contents">' +
                                '<div class="info"></div>' +
                                '<div class="accordion"></div>' +
                            '</div>'+
                        '</div>' +
                        '<div class="cartodb-popup-tip-container"></div>' +
                    '</div>';
            this._super(html);
            this.close = $(this).find('.close');
        }
    });

    //
    //Classes for a google maps info window overlay.
    //
    mol.map.FeatureMarker = function(latlng, map, div) {
            this.latlng_ = latlng;
            this.init_ = false;
            this.div_ = div;
            this.setMap(map);
    }
    mol.map.FeatureMarker.prototype = new google.maps.OverlayView();
    mol.map.FeatureMarker.prototype.draw = function () {
        var self = this,
            div = this.div_,
            panes,
            point;

        if (!this.init_) {
            // Then add the overlay to the DOM
            panes = this.getPanes();
            panes.overlayImage.appendChild(div);
            this.init_ = true;
            // catch mouse events and stop them propogating to the map
            google.maps.event.addDomListener(
                this.div_,
                'mousedown',
                this.stopPropagation_
            );
            google.maps.event.addDomListener(
                this.div_,
                'dblclick',
                this.stopPropagation_
            );

            google.maps.event.addDomListener(
                this.div_,
                'DOMMouseScroll',
                this.stopPropagation_
            );
            google.maps.event.addDomListener(
                this.div_,
                'click',
                function(e) {
                    google.maps.event.trigger(self, 'click')
                    self.stopPropagation_(e);
            });
        }
        // Position the overlay
        point = this.getProjection().fromLatLngToDivPixel(this.latlng_);
        if (point && div) {

            try {
                $(div).css('left',((point.x -28)+'px'));
                $(div).css('top',(point.y - $(div).height()-5) + 'px');
                if($(div).offset().top<0) {
                    this.map.panBy(0,$(div).offset().top-10);
                }
            } catch (e) {
                console.log(e);
            }
        }
    };
    mol.map.FeatureMarker.prototype.remove = function() {
        if (this.div_) {
          if (this.div_.parentNode) {
            this.div_.parentNode.removeChild(this.div_);
          }
          this.div_ = null;

        }
    };
    mol.map.FeatureMarker.prototype.getPosition = function() {
       return this.latlng_;
    };
    mol.map.FeatureMarker.prototype.getDOMElement = function() {
       return this.div_;
    };
    mol.map.FeatureMarker.prototype.stopPropagation_ = function(e) {
      if(navigator.userAgent.toLowerCase().indexOf('msie') != -1 &&
        document.all) {
        window.event.cancelBubble = true;
        window.event.returnValue = false;
      } else {
        e.stopPropagation();
      }
    }
}

mol.modules.map.query = function(mol) {

    mol.map.query = {};

    mol.map.query.QueryEngine = mol.mvp.Engine.extend({
        init : function(proxy, bus, map) {

            this.proxy = proxy;
            this.bus = bus;
            this.map = map;
            this.seenHint = false;
            this.url = '' +
                'http://mol.cartodb.com/' +
                'api/v2/sql?callback=?&q={0}';
            // TODO: Docs for what this query does.
            this.list_url = 'list?dsid={0}&lon={1}&lat={2}&radius={3}&taxa={4}';
            this.sql = '' +
                "SELECT * FROM get_species_list('{0}',{1},{2},{3},'{4}')";
             // TODO: Docs for what this query does.
            this.csv_sql = '' +
                "SELECT * FROM get_species_list_csv('{0}',{1},{2},{3},'{4}')";
            this.queryct=0;
            this.overlayView = new google.maps.OverlayView();
            this.overlayView.draw = function () {};

            try {
                this.overlayView.setMap(map);
            } catch(e) {}

        },

        start : function() {
            this.addQueryDisplay();
            this.addEventHandlers();
        },

        toggleMapClicks : function(toggle) {
            var action = (toggle==true) ? 'list' : '';
            this.bus.fireEvent(
                new mol.bus.Event(
                    'layer-click-action',
                    {action: action}
                )
            );
        },

        /*
         *  Add the species list tool controls to the map.
         */
        addQueryDisplay : function() {
            var params = {
                    display: null,
                    slot: mol.map.ControlDisplay.Slot.TOP,
                    position: google.maps.ControlPosition.TOP_RIGHT
                },
                self = this;


            this.enabled=true;
            this.features={};
            this.display = new mol.map.QueryDisplay();
            params.display = this.display;
            this.bus.fireEvent(new mol.bus.Event('add-map-control', params));
        },
        registerClick : function () {
            var self = this;

            this.map.setOptions({draggableCursor: 'pointer'});

            google.maps.event.addListener(
                this.map,
                "click",
                function(event) {
                    var params = {
                            gmaps_event : event,
                            map : self.map
                        }
                    self.bus.fireEvent(
                        new mol.bus.Event('species-list-query-click',params)
                    );
                }
            );
        },
        /*
         *  Method to build and submit an AJAX call that retrieves species
         *  at a radius around a lat, long.
         */
        getList: function(lat, lng, listradius, dataset_id, className) {
            var self = this,
                //hardcode class for now
                _class = self.display.dataset_id
                    .find('option:selected').data('class'),
                list_url = this.list_url.format(
                    dataset_id,
                    Math.round(lng*100)/100,
                    Math.round(lat*100)/100,
                    listradius.radius,
                    _class),
                zooms = {
                    "50000": 5,
                    "100000": 4,
                    "300000": 3
                },
                csv_sql = escape(
                    this.csv_sql.format(
                        dataset_id,
                        Math.round(lng*100)/100,
                        Math.round(lat*100)/100,
                        listradius.radius,
                        _class));

		    if ((lng > -16 || lat < 14) && dataset_id == 'iucn_reptiles') {
            	alert('Reptile species lists are currently only available for North America.');
            	listradius.setMap(null);
            	this.bus.fireEvent(new mol.bus.Event(
                            'hide-loading-indicator',
                            {source : 'listradius'}));
            	return;
            }
            if ((lat < 25.5 || lng > -16) && dataset_id == 'na_fish') {
            	alert('Fish species lists are currently only available for North America.');
            	listradius.setMap(null);
            	this.bus.fireEvent(new mol.bus.Event(
                            'hide-loading-indicator',
                            {source : 'listradius'}));
            	return;
            }
            if ((lat < 25.5 || lng > -16) && dataset_id == 'na_trees') {
            	alert('Tree species lists are currently only available for North America.');
            	listradius.setMap(null);
            	this.bus.fireEvent(new mol.bus.Event(
                            'hide-loading-indicator',
                            {source : 'listradius'}));
            	return;
            }
         


            if (self.queryct > 0) {
                alert('Please wait for your last species list request to ' +
                'complete before starting another.');
                listradius.setMap(null);
            } else {
            
            	self.map.panTo(new google.maps.LatLng(lat, lng))
            	if (self.map.getZoom() < zooms[listradius.radius]) {
                	self.map.setZoom(zooms[listradius.radius]);
            	}
            	self.map.panBy($(window).width()/4,0);
                self.queryct++;
                $.getJSON(
                    list_url,
                    function(data, textStatus, jqXHR) {
                        var results = {
                            listradius:listradius,
                            dataset_id: dataset_id,
                            _class: _class,
                            className : className,
                            response:data,
                            sql:csv_sql
                        },
                        e = new mol.bus.Event('species-list-query-results',
                            results);
                        self.queryct--;
                        self.bus.fireEvent(e);
                    }
                );
            }
        },
        clearLists: function() {
            _.each(
                this.features,
                function(feature) {
                    if(feature.listWindow) {
                        feature.listWindow.dialog("close");
                    }
                    if(feature.listradius) {
                        feature.listradius.setMap(null);
                    }
                    
                }
            );
            this.features={};
            this.queryct=0;
        },

        addEventHandlers : function () {
            var self = this;
            /*
             * Attach some rules to the ecoregion /
             * range button-switch in the controls.
             */
            _.each(
                $('button',$(this.display.types)),
                function(button) {
                    $(button).click(
                        function(event) {
                            $('button',$(self.display.types))
                                .removeClass('selected');
                            $(this).addClass('selected');
                            if ($(this).hasClass('range') &&
                                self.display.dataset_id.val().
                                    toLowerCase().indexOf('reptil') > 0) {
                                alert('Available for North America only.');
                            }
                        }
                    );
                }
            );
			this.display.click(
				function(event){
					$(this).qtip('destroy');
				}
					
			);
            /*
             * Toggle Click Handler for Species List Clicking
             */
            this.display.queryButton.click(
                function(event) {
                    var params = {};

                    params.visible = self.display.speciesDisplay
                                        .is(':visible') ? false : true;

                    self.bus.fireEvent(
                        new mol.bus.Event('species-list-tool-toggle', params));
                }
            );
            this.bus.addHandler(
                'clear-lists',
                function(event) {
                    self.clearLists();
                }
            );
            this.bus.addHandler(
                'list-local',
                function(event) {
                    var dataset_id = (event.dataset_id != undefined) ? 
                        event.dataset_id : 'jetz_maps',
                        className = (event.className != undefined) ? 
                        event.className : 'Aves';
                    $(self.display).find('.dataset_id').val(dataset_id);
                    navigator.geolocation.getCurrentPosition(
                        function(loc) {
                            self.bus.fireEvent(
                                new mol.bus.Event(
                                    'species-list-tool-toggle',
                                    {visible: true}
                                )
                            );
                            self.bus.fireEvent(
                                new mol.bus.Event(
                                    'species-list-query-click',
                                    {
                                        gmaps_event: {
                                            latLng: new google.maps.LatLng(
                                                loc.coords.latitude,
                                                loc.coords.longitude
                                            )
                                        },
                                        dataset_id:dataset_id,
                                        class_name: className
                                    }
                                )
                            );
                        
                        },
                        function(noloc) {
                            var lat = prompt(
                                'We could not determine your location.' +
                                'Please click a location on the map.');
                            
                        }
                    );
                }
            );
            this.bus.addHandler(
                'list-random',
                function(event) {
                    var dsid = (event.group != undefined) ? 
                        event.group : 'jetz_maps',
                        group_name = (event.group_name != undefined) ? 
                        event.group_name : 'Birds';
 
                    $.getJSON(
                        'http://mol.cartodb.com/api/v1/sql?q=' +
                        'SELECT ST_X(g) as lon, ST_Y(g) as lat ' +
                        'FROM ' +
                            '(SELECT ST_Centroid(the_geom) as g ' +
                             'FROM randland ' +
                             'LIMIT 1 ' +
                             'OFFSET ' +
                                'round(' +
                                    'random()*(SELECT count(*) FROM randland)' +
                                ')'+
                             ') c',
                         function(result) {
                            self.bus.fireEvent(
                                new mol.bus.Event(
                                    'species-list-tool-toggle',
                                    {visible: true}
                                )
                            );
                            self.bus.fireEvent(
                                new mol.bus.Event(
                                    'species-list-query-click',
                                    {
                                        gmaps_event: {
                                            latLng: new google.maps.LatLng(
                                                result.rows[0].lat,
                                                result.rows[0].lon
                                            )
                                        }
                                    }
                                )
                            );
                        
                        }
                    );
                }
            );
            
            this.bus.addHandler(
                'layer-click-action',
                function(event) {
                    if(event.action == 'list') {
                        self.enabled = true;
                        $(self.display.queryButton).addClass('selected');
                        $(self.display.queryButton).html("ON");
                    } else {
                        self.enabled = false;
                        $(self.display.queryButton).removeClass('selected');
                        $(self.display.queryButton).html("OFF");
                    }

                    if(self.enabled == false) {
                        self.display.speciesDisplay.hide();
                    } else {
                        self.display.speciesDisplay.show();
                    }
                }
            );
            this.bus.addHandler(
                'show-list-hint',
                function(event) {
                    if(!self.seenHint) {
                        $(self.display.queryButton).qtip({
                            content: {
                                text: '' +
                                '<div class="mol-hint">'+
                                	'Click on the map to get a list of species. ' +
                                	'Use this control to change radius or group.' +
                            	'</div>'
                            },
                            position: {
                                my: 'top right',
                                at: 'bottom left'
                            },
                            show: {
                                event: false,
                                ready: true
                            },
                            hide: {
                                fixed: false,
                                event: 'unfocus'
                            }
                        })
                    }
                    self.seenHint = true
                }
            );

            /*
             *  Map click handler that starts a list tool request.
             */
            this.bus.addHandler(
                'species-list-query-click',
                function (event) {
                    var listradius, overlayPane,
                        datasetID = (event.dataset_id == null) ? 
                            $("option:selected",
                                $(self.display.dataset_id)).data(
                                    $('.selected',$(self.display.types)).val()
                                ): event.dataset_id,
                        className = (event.class_name == null)?  $("option:selected",
                            $(self.display.dataset_id)).text(): event.class_name;

                    if($(self.display).data('qtip')) {
                        $(self.display).qtip('destroy');
                    }
                    
                    $(self.display.dataset_id)
                    
                    if (self.enabled
                            &&
                            $(self.display.queryButton).hasClass('selected')) {
                            listradius = new google.maps.Circle(
                            {
                                map: self.map,
                                radius: parseInt(
                                    self.display.radiusInput.val())*1000,
                                    // 50 km
                                center: event.gmaps_event.latLng,
                                strokeWeight: 3,
                                strokeColor: 'darkred',
                                clickable: true,
                                fillOpacity:0,
                                zIndex:0

                            }
                        );
                        try {
                            self.overlayPane = self.overlayView.getPanes().overlayLayer;
                            $(self.overlayPane.firstChild.firstChild).show();
                        } catch(e) {}

                        self.bus.fireEvent(new mol.bus.Event(
                            'show-loading-indicator',
                            {source : 'listradius'}));

                       
                        self.clearLists();
                        
                        self.getList(
                            event.gmaps_event.latLng.lat(),
                            event.gmaps_event.latLng.lng(),
                            listradius,
                            datasetID,
                            className);
                    }
                }
            );

            /*
             *  Assembles HTML for an species list given results from
             *  an AJAX call made in getList.
             */
            this.bus.addHandler(
                'species-list-query-results',
                function (event) {
                    var className,
                        listradius  = event.listradius,
                        latHem,
                        lngHem,
                        listRowsDone;

                    if (!event.response.error) {
                        className = event.className;
                        latHem = (listradius.center.lat() > 0) ? 'N' : 'S';
                        lngHem = (listradius.center.lng() > 0) ? 'E' : 'W';

                        listRowsDone = self.processListRows(
                                            listradius,
                                            className,
                                            latHem,
                                            lngHem,
                                            event.response.rows,
                                            event.sql);

                        self.displayListWindow(
                            listradius,
                            listRowsDone.speciestotal,
                            className,
                            latHem,
                            lngHem,
                            event.response.rows,
                            listRowsDone.content,
                            listRowsDone.dlContent,
                            listRowsDone.iucnContent);
                    } else {
                        listradius.setMap(null);
                        $(self.overlayPane.firstChild.firstChild)
                            .hide();

                        delete(
                            self.features[listradius.center.toString()+
                                          listradius.radius]);
                    }
                    self.bus.fireEvent(
                        new mol.bus.Event(
                            'hide-loading-indicator',
                            {source : 'listradius'}));
                }
            );
            this.bus.addHandler(
                'hide-list',
                function(event, params) {
                    $(self.display).hide();
                }
            );
            this.bus.addHandler(
                'show-list',
                function(event, params) {
                    $(self.display).show();
                }
            );
            this.bus.addHandler(
                'species-list-tool-toggle',
                function(event, params) {
                    if(event.visible == true) {
                        self.enabled = true;
                    } else {
                        self.enabled = false;
                    }

                    if(self.enabled == false) {
                        self.display.speciesDisplay.hide();
                    } else {
                        self.display.speciesDisplay.show();
                        self.bus.fireEvent(new mol.bus.Event('hide-search'));
                    }

                    if (self.listradius) {
                        self.listradius.setMap(null);
                        $(self.overlayPane.firstChild.firstChild).hide();

                    }

                    if (self.enabled == true) {
                        self.registerClick();
                        _.each(
                            self.features,
                            function(feature) {
                                //feature.listradius.setMap(self.map);
                                //feature.listWindow.setMap(self.map);
                            }
                        );

                        $(self.display.queryButton).addClass('selected');
                        $(self.display.queryButton).html("ON");
                        self.toggleMapClicks(true);
                    } else {
                         self.map.setOptions({draggableCursor: 'auto'});

                        _.each(
                            self.features,
                            function(feature) {
                                if(feature.listWindow) {
                                    feature.listWindow.dialog("close");
                                }
                                feature.listradius.setMap(null);
                                $(self.overlayPane.firstChild.firstChild).hide();

                            }
                        );

                        $(self.display.queryButton).removeClass('selected');
                        $(self.display.queryButton).html("OFF");
                        self.toggleMapClicks(false);
                    }
                }
            );

            this.display.radiusInput.blur(
                function(event) {
                    if (this.value > 1000) {
                        this.value = 1000;
                        alert(
                            'Please choose a radius between 50 km and 1000 km.'
                        );
                    }
                    if (this.value < 50) {
                        this.value = 50;
                        alert(
                            'Please choose a radius between 50 km and 1000 km.'
                        );
                    }
                }
            );

            this.display.dataset_id.change(
                function(event) {
                    if ($(this).val().toLowerCase().indexOf('fish') > 0) {
                        $(self.display.types).find('.ecoregion')
                            .toggle(false);
                        $(self.display.types).find('.ecoregion')
                            .removeClass('selected');
                        $(self.display.types).find('.range')
                            .toggle(false);
                        if ($(self.display.types).find('.range')
                            .hasClass('selected')) {
                                alert('Available for North America only.');
                        };
                    } else if ($(this).val().toLowerCase()
                        .indexOf('reptil') > 0) {
                        $(self.display.types).find('.ecoregion')
                            .toggle(true);
                        $(self.display.types).find('.ecoregion')
                            .removeClass('selected');
                        $(self.display.types).find('.range')
                            .toggle(true);
                        if ($(self.display.types).find('.range')
                            .hasClass('selected')) {
                                alert('Available for North America only.');
                        };
                    } else {
                        $(self.display.types).find('.ecoregion')
                            .toggle(false);
                        $(self.display.types).find('.range')
                            .toggle(false);
                        $(self.display.types).find('.range')
                            .addClass('selected');
                    }
                }
            );
        },

        /*
         * Processes response content for List dialog
         */
        processListRows: function(listrad, clnm, latH, lngH, rows, sqlurl) {
            var self = this,
                listradius = listrad,
                className = clnm,
                latHem = latH,
                lngHem = lngH,
                tablerows = [],
                providers = [],
                scientificnames = {},
                years = [],
                redlistCt = {},
                stats,
                speciestotal = 0,
                speciesthreatened = 0,
                speciesdd = 0;

            _.each(
                rows,
                function(row) {
                    var english = (row.english != null) ?
                            _.uniq(row.english.split(',')).join(',') : '',
                        year = (row.year_assessed != null) ?
                            _.uniq(row.year_assessed.split(',')).join(',') : '',
                        redlist = (row.redlist != null) ?
                            _.uniq(row.redlist.split(',')).join(',') : '',
                        tclass = "";

                    //create class for 3 threatened iucn classes
                    switch(redlist) {
                        case "VU":
                            tclass = "iucnvu";
                            break;
                        case "EN":
                            tclass = "iucnen";
                            break;
                        case "CR":
                            tclass = "iucncr";
                            break;
                    }

                    //list row header
                    tablerows.push(""+
                        "<tr class='master " + tclass + "'>" +
                        "   <td class='arrowBox'>" +
                        "       <div class='arrow'></div>" +
                        "   </td>" +
                        "   <td class='wiki sci' value='" +
                                row.thumbsrc + "'>" +
                                row.scientificname +
                        "   </td>" +
                        "   <td class='wiki english' value='" +
                                row.imgsrc + "' eol-page='" +
                                row.eol_page_id + "'>" +
                                ((english != null) ? english : '') +
                        "   </td>" +
                        "   <td class='wiki'>" +
                                ((row.order != null) ?
                                    row.order : '') +
                        "   </td>" +
                        "   <td class='wiki'>" +
                                ((row.family != null) ?
                                    row.family : '') +
                        "   </td>" +
                        "   <td>" + ((row.sequenceid != null) ?
                                        row.sequenceid : '') +
                        "   </td>" +
                        "   <td class='iucn' data-scientificname='" +
                                row.scientificname + "'>" +
                                ((redlist != null) ? redlist : '') +
                        "   </td>" +
                        "</tr>");

                    //list row collapsible content
                    tablerows.push("" +
                        "<tr class='tablesorter-childRow'>" +
                        "   <td colspan='7' value='" +
                                row.scientificname + "'>" +
                        "   </td>" +
                        "</tr>");

                    providers.push(
                        ('<a class="type {0}">{1}</a>, ' +
                         '<a class="provider {2}">{3}</a>')
                            .format(
                                row.type,
                                row.type_title,
                                row.provider,
                                row.provider_title));
                    if (year != null && year != '') {
                        years.push(year);
                    }
                    scientificnames[row.scientificname]=redlist;
                }
            );
            years = _.uniq(years);
            tablerows = _.uniq(tablerows);
            providers = _.uniq(providers);

            years = _.sortBy(_.uniq(years), function(val) {
                    return val;
                }
            );

            years[years.length-1] = (years.length > 1) ?
                ' and ' + years[years.length-1] : years[years.length-1];

            _.each(
                scientificnames,
                function(red_list_status) {
                    speciestotal++;
                    speciesthreatened +=
                        ((red_list_status.indexOf('EN')>=0) ||
                         (red_list_status.indexOf('VU')>=0) ||
                         (red_list_status.indexOf('CR')>=0) ||
                         (red_list_status.indexOf('EX')>=0) ||
                         (red_list_status.indexOf('EW')>=0) )  ?
                            1 : 0;
                    speciesdd +=
                        (red_list_status.indexOf('DD')>0)  ?
                            1 : 0;
                }
            );

            stats = (speciesthreatened > 0) ?
                ('(' + speciesthreatened + ' considered threatened by ' +
                '<a href="http://www.iucnredlist.org" ' +
                'target="_iucn">IUCN</a> '+years.join(',')+')') : '';

            if (speciestotal > 0) {
                content = $('' +
                    '<div class="mol-Map-ListQueryInfo">' +
                    '   <div class="mol-Map-ListQuery">' +
                           'Data type/source:&nbsp;' +
                           providers.join(', ') +
                           '.&nbsp;All&nbsp;seasonalities.<br>' +
                    '   </div> ' +
                    '   <div class="mol-Map-ListQueryInfoWindow"> ' +
                    '       <table class="listtable">' +
                    '           <thead>' +
                    '               <tr>' +
                    '                   <th></th>' +
                    '                   <th>Scientific Name</th>' +
                    '                   <th>English Name</th>' +
                    '                   <th>Order</th>' +
                    '                   <th>Family</th>' +
                    '                   <th>Rank&nbsp;&nbsp;&nbsp;</th>' +
                    '                   <th>IUCN&nbsp;&nbsp;</th>' +
                    '               </tr>' +
                    '           </thead>' +
                    '           <tbody class="tablebody">' +
                                    tablerows.join('') +
                    '           </tbody>' +
                    '       </table>' +
                    '   </div>' +
                    '</div>');

                dlContent = $('' +
                    '<div class="mol-Map-ListQuery">' +
                    '   <div>' +
                    '       <a href="' +
                                this.url.format(sqlurl) + '&format=csv"' +
                    '           class="mol-Map-ListQueryDownload">' +
                    '               download csv</a>' +
                    '   </div> ' +
                    '</div>');

                iucnContent = $('' +
                    '<div class="mol-Map-ListQuery mol-Map-ListQueryInfo">' +
                    '    <div id="iucnChartDiv"></div>'+
                    '    <div class="iucn_stats">' + stats + '</div>' +
                    '</div>');
            } else {
                content = $(''+
                    '<div class="mol-Map-ListQueryEmptyInfoWindow">' +
                    '   <b>No ' + className.replace(/All/g, '') +
                            ' species found within ' +
                            listradius.radius/1000 + ' km of ' +
                            Math.abs(
                                Math.round(
                                    listradius.center.lat()*1000)/1000) +
                                    '&deg;&nbsp;' + latHem + '&nbsp;' +
                            Math.abs(
                                Math.round(
                                    listradius.center.lng()*1000)/1000) +
                                    '&deg;&nbsp;' + lngHem +
                    '   </b>' +
                    '</div>');

                dlContent = $('' +
                    '<div class="mol-Map-ListQueryEmptyInfoWindow">' +
                    '    <b>No list to download.</b>' +
                    '</div>');

                iucnContent = $('' +
                    '<div class="mol-Map-ListQueryEmptyInfoWindow">' +
                    '    <b>No species found.</b>' +
                    '</div>');
            }

            return {speciestotal: speciestotal,
                    content: content,
                    dlContent: dlContent,
                    iucnContent: iucnContent}
        },

        /*
         * Displays and Manages the List dialog
         */

        displayListWindow: function(listrad, sptot, clname, latH, lngH,
                                    rows, con, dlCon, iuCon) {
            var self = this,
                listradius = listrad,
                listWindow,
                listTabs,
                speciestotal = sptot,
                className = clname,
                latHem = latH,
                lngHem = lngH,
                content = con;
                dlContent = dlCon,
                iucnContent = iuCon;

            listWindow = new mol.map.query.listDisplay();

            self.features[listradius.center.toString()+listradius.radius] = {
                listradius : listradius,
                listWindow : listWindow
            };

            listWindow.dialog({
                autoOpen: true,
                position: "center",
                width: 680,
                height: 415,
                dialogClass: 'mol-Map-ListDialog',
                modal: false,
                title: speciestotal + ' species of ' + className +
                       ' within ' + listradius.radius/1000 + ' km of ' +
                       Math.abs(Math.round(
                           listradius.center.lat()*1000)/1000) +
                           '&deg;&nbsp;' + latHem + '&nbsp;' +
                       Math.abs(Math.round(
                           listradius.center.lng()*1000)/1000) +
                           '&deg;&nbsp;' + lngHem
            });

            $(".mol-Map-ListDialog").parent().bind("resize", function() {
                $(".mol-Map-ListQueryInfoWindow")
                    .height($(".mol-Map-ListDialog").height()-125);

                $("#gallery")
                    .height($(".mol-Map-ListDialog").height()-125);
            });
            $(".mol-Map-ListDialog").animate({
                    left: '{0}px'.format($(window).width() / (7 / 4) - 200)
                }, 'slow');

            //tabs() function needs document ready to
            //have been called on the dialog content
            $(function() {
                var mmlHeight;

                //initialize tabs and set height
                listTabs = $("#tabs").tabs();

                $("#tabs > #listTab").html(content[0]);
                $("#tabs > #dlTab").html(dlContent[0]);
                $("#tabs > #iucnTab").html(iucnContent[0]);

                $(".mol-Map-ListQueryDownload").button();
                mmlHeight = $(".mol-Map-ListDialog").height();
                $(".mol-Map-ListQueryInfoWindow").height(mmlHeight-125);
                $("#gallery").height(mmlHeight-125);

                //list table creation
                self.createSpeciesListTable(listWindow);

                //chart creation
                if(speciestotal > 0 ) {
                    self.createIucnChart(rows, mmlHeight);
                }

                //image gallery creation
                self.createImageGallery(rows, speciestotal);

                listTabs.tabs("select", 0);
            });

            self.features[listradius.center.toString()+listradius.radius] = {
                listradius : listradius,
                listWindow : listWindow
            };

            $(listWindow).dialog({
               beforeClose: function(evt, ui) {
                   listTabs.tabs("destroy");
                   $(".mol-Map-ListDialogContent").remove();
                   listradius.setMap(null);
                   $(self.overlayPane.firstChild.firstChild).hide();

                   delete (
                       self.features[listradius.center.toString() +
                                     listradius.radius]);
               }
            });
        },

        /*
         * Bins the IUCN species for a list query request into categories
         * and returns an associate array with totals
         */
        getRedListCounts: function(rows) {

            var iucnListArray = [
                    ['IUCN Status', 'Count'],
                    ['LC',0],
                    ['NT',0],
                    ['VU',0],
                    ['EN',0],
                    ['CR',0],
                    ['EW',0],
                    ['EX',0]
                ], redlist;

            _.each(rows, function(row) {
                redlist = (row.redlist != null) ?
                    _.uniq(row.redlist.split(',')).join(',') : '';

                switch(redlist) {
                    case "LC":
                        iucnListArray[1][1]++;
                        break;
                    case "NT":
                        iucnListArray[2][1]++;
                        break;
                    case "VU":
                        iucnListArray[3][1]++;
                        break;
                    case "EN":
                        iucnListArray[4][1]++;
                        break;
                    case "CR":
                        iucnListArray[5][1]++;
                        break;
                    case "EW":
                        iucnListArray[6][1]++;
                        break;
                    case "EX":
                        iucnListArray[7][1]++;
                        break;
                }
            });

            return iucnListArray;
        },

        /*
         * Creates List Table
         */
        createSpeciesListTable: function(lw) {
            var self = this;

            //$("table.listtable tr:odd").addClass("master");
            $("table.listtable tr:not(.master)").hide();
            $("table.listtable tr:first-child").show();
            $("table.listtable tr.master td.arrowBox").click(
                function() {
                    $(this).parent().next("tr").toggle();
                    $(this).parent().find(".arrow").toggleClass("up");

                    if(!$(this).parent().hasClass('hasWiki')) {
                        $(this).parent().addClass('hasWiki');
                        self.callWiki($(this).parent());
                    }
                }
            );
            $(".listtable", $(lw)).tablesorter({
                sortList: [[5,0]]
            });

            _.each(
                $('.wiki',$(lw)),
                function(wiki) {
                    $(wiki).click(
                        function(event) {
                            var win = window.open(
                                'http://en.wikipedia.com/wiki/'+
                                $(this).text().split(',')[0]
                                    .replace(/ /g, '_')
                            );
                            win.focus();
                        }
                    );
                }
            );

            _.each(
                $('.iucn',$(lw)),
                function(iucn) {
                    if ($(iucn).data('scientificname') != '') {
                        $(iucn).click(
                            function(event) {
                                var win = window.open(
                                    'http://www.iucnredlist.org/' +
                                    'apps/redlist/search/external?text='
                                    +$(this).data('scientificname')
                                );
                                win.focus();
                            }
                        );
                    }
                }
            );
        },

        /*
         * Creates IUCN pie chart
         */
        createIucnChart: function(rows, mHeight) {
            var self = this,
                iucnlist,
                iucndata,
                options,
                chart;

            $("#iucnChartDiv").height(mHeight-140);

            iucnlist = self.getRedListCounts(rows);
            iucndata = google.visualization.arrayToDataTable(iucnlist);

            options = {
                width: 605,
                height: $("#iucnChartDiv").height(),
                backgroundColor: 'transparent',
                title: 'Species by IUCN Status',
                colors: ['#006666',
                         '#88c193',
                         '#cc9900',
                         '#cc6633',
                         '#cc3333',
                         '#FFFFFF',
                         '#000000'],
                pieSliceText: 'none',
                chartArea: {left:125, top:25, width:"100%", height:"85%"}
            };

            chart = new google.visualization.PieChart(
                document.getElementById('iucnChartDiv'));
            chart.draw(iucndata, options);
        },

        /*
         * Creates and populates image gallery tab
         */
        createImageGallery: function (rows, sptotal) {
            var hasImg = 0,
                english
                self = this;

            _.each(
               rows,
                function(row) {
                    english = (row.english != null) ?
                        _.uniq(row.english.split(',')).join(',') : '';

                    if(row.thumbsrc != null) {
                        $("#gallery").append('' +
                            '<li><a class="eol_img" href="http://eol.org/pages/' +
                            row.eol_page_id +
                            '" target="_blank"><img src="' +
                            row.thumbsrc +
                            '" title="' +
                            english +
                            '" sci-name="' +
                            row.scientificname + '"/></a></li>');

                        hasImg++;
                    } else {
                        $("#gallery").append('' +
                            '<li><div style="width:91px; height:68px"' +
                            'title="' + english +
                            '" sci-name="' + row.scientificname +
                            '">No image for ' +
                            english + '.</div></li>');
                    }
                }
            );

            $('#gallery').ppGallery({thumbWidth: 91, maxWidth: 635});
            $('#imgTotals').html('' +
                                'Images are available for ' +
                                hasImg + ' of ' + sptotal +
                                ' species. ');

            $('#gallery li a img').qtip({
                content: {
                    text: function(api) {
                        return '<div>' + $(this).attr('oldtitle') +
                            '<br/><button class="mapButton" value="' +
                            $(this).attr('sci-name') +
                            '">Map</button>' +
                            '<button class="eolButton" value="' +
                            $(this).parent().attr('href') +
                            '">EOL</button></div>';
                    }
                },
                hide: {
                    fixed: true,
                    delay: 500
                },
                events: {
                    visible: function(event, api) {
                        $("button.mapButton").click(
                            function(event) {
                                self.bus.fireEvent(
                                    new mol.bus.Event(
                                        'search',
                                        {term : $.trim(event.target.value)}
                                    )
                                );
                            }
                        );

                        $('button.eolButton').click(
                            function(event) {
                                var win = window.open(
                                    $.trim(event.target.value)
                                );
                                win.focus();
                            }
                        );
                    }
                }
            });
            $('.eol_img').mouseup(
                function(event) {
                    if(event.ctrlKey) {
                      //
                    }
                }
            )

            $('#gallery li div').qtip({
                content: {
                    text: function(api) {
                        return '<div>' + $(this).attr('title') +
                            '<br/><button class="mapButton" value="' +
                            $(this).attr('sci-name') +
                            '">Map</button></div>';
                    }
                },
                hide: {
                    fixed: true,
                    delay: 500
                },
                events: {
                    visible: function(event, api) {
                        $("button.mapButton").click(function(event) {
                            self.bus.fireEvent(new mol.bus.Event('search', {
                                term : $.trim(event.target.value)
                            }));
                        });
                    }
                }
            });
        },

        /*
         * Callback for Wikipedia Json-P request
         */
        wikiCallback: function(data, row,q,qs,eolimg,eolpage) {

            var wikidata,
                wikiimg,
                prop,
                a,
                imgtitle,
                req,
                reqs,
                i,
                e,
                self = this;


            for(e in data.query.pages) {
                if(e != -1) {
                    prop = data.query.pages[e];
                    wikidata = prop.extract
                        .replace('...','')
                        .replace('<b>','<strong>')
                        .replace('<i>','<em>')
                        .replace('</b>','</strong>')
                        .replace('</i>','</em>')
                        .replace('<br />',"")
                        .replace(/<p>/g,'<div>')
                        .replace(/<\/p>/g,'</div>')
                        .replace(/<h2>/g,'<strong>')
                        .replace(/<\/h2>/g,'</strong>')
                        .replace(/<h3>/g,'<strong>')
                        .replace(/<\/h3>/g,'</strong>')
                        .replace(/\n/g,"")
                        .replace('</div>\n<div>'," ")
                        .replace('</div><div>'," ")
                        .replace('</div><strong>'," <strong> ")
                        .replace('</strong><div>'," </strong> ");

                    $(row).next().find('td').html(wikidata);
                    $(row).next().find('td div br').remove();

                    a = prop.images;

                    for(i=0;i < a.length;i++) {
                        imgtitle = a[i].title;

                        req = new RegExp(q, "i");
                        reqs = new RegExp(qs, "i");

                        if(imgtitle.search(req) != -1 ||
                           imgtitle.search(reqs) != -1) {
                            wikiimg = imgtitle;
                            break;
                        }
                    }
                }

                if(eolimg != "null") {
                    $('<a href="http://eol.org/pages/' +
                        eolpage +
                        '" target="_blank"><img src="' +
                        eolimg +
                        '" style="float:left; margin:0 4px 0 0;"/>' +
                        '</a>').prependTo($(row).next().find('td'));
                    $(row).next().find('td div:last').append('' +
                        '... (Text Source:' +
                        '<a href="http://en.wikipedia.com/wiki/' +
                        qs.replace(/ /g, '_') +
                        '" target="_blank">Wikipedia</a>;' +
                        ' Image Source:<a href="http://eol.org/pages/' +
                        eolpage +
                        '" target="_blank">EOL</a>)' +
                        '<p><button class="mapButton" value="' +
                        qs + '">Map</button></p>');
                } else if(wikiimg != null) {
                    //get a wikipedia image if we have to
                    $.getJSON(
                        'http://en.wikipedia.org/w/api.php?' +
                        'action=query' +
                        '&prop=imageinfo' +
                        '&format=json' +
                        '&iiprop=url' +
                        '&iilimit=10' +
                        '&iiurlwidth=91' +
                        '&iiurlheight=68' +
                        '&titles={0}'.format(wikiimg) +
                        '&callback=?'
                    ).success(
                        function(data) {
                            self.wikiImgCallback(data, qs, wikiimg)
                        }
                    );
                }

                //check for link to eol, if true, add button
                if(eolpage != "null") {
                    $(row).next().find('td p:last').append('' +
                    '<button class="eolButton" ' +
                    'value="http://eol.org/pages/' +
                    eolpage + '">Encyclopedia of Life</button>');

                    $('button.eolButton[value="http://eol.org/pages/' +
                        eolpage + '"]').click(function(event) {
                        var win = window.open($.trim(event.target.value));
                        win.focus();
                    });
                }

                $(row).find('td.arrowBox').html("<div class='arrow up'></div>");
            }


            $("button.mapButton").click(
                function(event) {
                    self.bus.fireEvent(
                        new mol.bus.Event(
                            'search',
                            {term : $.trim(event.target.value)}
                        )
                    );
                }
            );
        },

        /*
         *  Callback for Wikipedia image json-p request.
         */
        wikiImgCallback: function(data, qs, wikiimg) {

            var imgurl,
                x,
                z;

            for(x in data.query.pages) {
                z = data.query.pages[x];
                imgurl = z.imageinfo[0].thumburl;

                $('<a href="http://en.wikipedia.com/wiki/' +
                    qs.replace(/ /g, '_') +
                    '" target="_blank"><img src="' +
                    imgurl +
                    '" style="float:left; margin:0 4px 0 0;"/>')
                   .prependTo($(row).next().find('td'));
                $(row).next().find('td div:last')
                    .append('' +
                    '... (Text Source:' +
                    '<a href="http://en.wikipedia.com/wiki/' +
                    qs.replace(/ /g, '_') +
                    '" target="_blank">Wikipedia</a>;' +
                    ' Image Source:' +
                    '<a href="http://en.wikipedia.com/wiki/' +
                    wikiimg +
                    '" target="_blank">Wikipedia</a>)' +
                    '<p><button class="mapButton" value="' +
                    qs +
                    '">Map</button></p>');
            }
        },

        /*
         *  Put html in saying information unavailable...
         */
        wikiError: function(row) {
            $(row).find('td.arrowBox').html("<div class='arrow up'></div>");
            $(row).next().find('td').html('<p>Description unavailable.</p>');
        },

        /*
         * Function to call Wikipedia and EOL image
         */
        callWiki: function(row) {
            var q,
                qs,
                eolimg,
                eolpage,
                self = this;

            $(row).find('td.arrowBox').html('' +
                '<img src="/static/loading-small.gif" width="' +
                $(row).find('td.arrowBox').height() +'" height="' +
                $(row).find('td.arrowBox').width() + '" />');

            q = $(row).find('td.english').html();
            qs = $(row).find('td.sci').html();
            eolimg = $(row).find('td.sci').attr('value');
            eolpage = $(row).find('td.english').attr('eol-page');

            $.getJSON(
                "http://en.wikipedia.org/w/api.php?" +
                "action=query" +
                "&format=json" +
                "&callback=test" +
                "&prop=extracts|images" +
                "&imlimit=10" +
                "&exlimit=1" +
                "&redirects=" +
                "exintro=" +
                "&iwurl=" +
                "&titles=" + qs +
                "&exchars=275" +
                '&callback=?'
            ).success (
                function(data) {
                    self.wikiCallback(data, row,q,qs,eolimg,eolpage)
                }
            ).error(
                function(data) {
                    self.wikiError(row);
                }
            );
        }
    });

    mol.map.QueryDisplay = mol.mvp.View.extend({
        init : function(names) {
            var className = 'mol-Map-QueryDisplay',
                html = '' +
                    '<div title=' +
                    '  "Use this control to select species group and radius."' +
                    ' class="' + className +
                    '  widgetTheme">' +
                    '  <span class="title">Species Lists</span>' +
                    '  <button id="speciesListButton" ' +
                             'class="toggleBtn" ' +
                             'title="Click to activate species' +
                                 ' list querying.">' +
                             'OFF' +
                    '  </button>' +
                    '  <div class="speciesDisplay" >' +
                         'Radius </span>' +
                    '    <select class="radius">' +
                    '      <option selected value="50">50 km</option>' +
                    '      <option value="100">100 km</option>' +
                    '      <option value="300">300 km</option>' +
                    '    </select>' +
                         'Group ' +
                    '    <select class="dataset_id" value="">' +
                    '      <option selected value="jetz_maps" data-range="jetz_maps" ' +
                    '        data-class="Aves" >' +
                    '        Birds</option>' +
                    '      <option value="na_fish" data-range="na_fish"' +
                    '        data-class="Fishes" >' +
                    '        NA Freshwater Fishes</option>' +
                    '      <option value="iucn_reptiles" data-range="iucn_reptiles" ' +
                    '        data-regionalchecklist="ecoregion_species" ' +
                    '        data-class="Reptilia" >' +
                    '        NA Reptiles</option>' +
                    '      <option value="iucn_amphibians" data-range="iucn_amphibians"' +
                    '        data-class="Amphibia" >' +
                    '        Amphibians</option>' +
                    '      <option value="iucn_mammals" data-range="iucn_mammals" ' +
                    '        data-class="Mammalia" >' +
                    '        Mammals</option>' +
                    '    </select>' +
                    '    <span class="types">' +
                    '      <button class="range selected" ' +
                             'value="range">' +
                    '        <img title="Click to use Expert range maps' +
                               ' for query."' +
                    '          src="/static/maps/search/range.png">' +
                    '      </button>' +
                    '      <button class="ecoregion" ' +
                    '        value="regionalchecklist">' +
                    '        <img title="Click to use Regional' +
                               ' checklists for query." ' +
                               'src="/static/maps/search/ecoregion.png">' +
                    '      </button>' +
                    '    </span>' +
                    '  </div>' +
                    '</div>';

            this._super(html);
            this.resultslist=$(this).find('.resultslist');
            this.radiusInput=$(this).find('.radius');
            this.dataset_id=$(this).find('.dataset_id');
            this.types=$(this).find('.types');
            this.queryButton=$(this).find('#speciesListButton');
            this.speciesDisplay = $(this).find('.speciesDisplay');
            $(this.speciesDisplay).hide();

            $(this.types).find('.ecoregion').toggle(false);
            $(this.types).find('.range').toggle(false);
        }
    });

    mol.map.QueryResultDisplay = mol.mvp.View.extend({
        init : function(scientificname) {
            var className = 'mol-Map-QueryResultDisplay', html = '{0}';
            this._super(html.format(scientificname));
        }
    });

    mol.map.query.listDisplay = mol.mvp.View.extend({
        init : function() {
            var html = '' +
                '<div class="mol-Map-ListDialogContent ui-tabs" id="tabs">' +
                '   <ul class="ui-tabs-nav">' +
                '      <li><a href="#listTab">List</a></li>' +
                '      <li><a href="#imagesTab">Images</a></li>' +
                '      <li><a href="#iucnTab">IUCN</a></li>' +
                '      <li><a href="#dlTab">Download</a></li>' +
                '   </ul>' +
                '   <div id="listTab" class="ui-tabs-panel">Content.</div>' +
                '   <div id="imagesTab" class="ui-tabs-panel">' +
                '       <div>' +
                '           <span id="imgTotals"></span>' +
                            'Source: <a href="http://eol.org/" ' +
                            'target="_blank">Encyclopedia of Life</a> ' +
                '       </div>' +
                '       <ul id="gallery" style="overflow: auto;"></ul></div>' +
                '   <div id="iucnTab" class="ui-tabs-panel">IUCN.</div>' +
                '   <div id="dlTab" class="ui-tabs-panel">Download.</div>' +
                '</div>';
            this._super(html);
        }
    });
};
mol.modules.map.basemap = function(mol) {

    mol.map.basemap = {};

    mol.map.basemap.BaseMapEngine = mol.mvp.Engine.extend({
        init: function(proxy, bus, map) {
            this.proxy = proxy;
            this.bus = bus;
            this.map = map;
        },

        /**
         * Starts the MenuEngine. Note that the container parameter is
         * ignored.
         */
        start: function() {
            this.display = new mol.map.basemap.BaseMapControlDisplay();
            this.display.toggle(true);
            this.addEventHandlers();
            this.fireEvents();
        },

        setBaseMap: function(type) {
                switch(type) {
                    case "Roadmap" :
                        this.map.setOptions({styles:[
                            {
                                "stylers" : [{
                                    "saturation" : -65
                                }, {
                                    "gamma" : 1.52
                                }]
                            }, {
                                "featureType" : "administrative",
                                "stylers" : [{
                                    "saturation" : -95
                                }, {
                                    "gamma" : 2.26
                                }]
                            }, {
                                "featureType" : "water",
                                "elementType" : "labels",
                                "stylers" : [{
                                    "visibility" : "off"
                                }]
                            }, {
                                "featureType" : "administrative",
                                "stylers" : [{
                                    "visibility" : "off"
                                }]
                            }, {
                                "featureType" : "administrative.country",
                                "stylers" : [{
                                    "visibility" : "on"
                                }]
                            }, {
                                "featureType" : "administrative.province",
                                "stylers" : [{
                                    "visibility" : "on"
                                }]
                            },{
                                "featureType" : "road",
                                "stylers" : [{
                                    "visibility" : "simplified"
                                }, {
                                    "saturation" : -99
                                }, {
                                    "gamma" : 2.22
                                }]
                            }, {
                                "featureType" : "poi",
                                "elementType" : "labels",
                                "stylers" : [{
                                    "visibility" : "off"
                                }]
                            }, {
                                "featureType" : "road.arterial",
                                "stylers" : [{
                                    "visibility" : "off"
                                }]
                            }, {
                                "featureType" : "road.local",
                                "elementType" : "labels",
                                "stylers" : [{
                                    "visibility" : "off"
                                }]
                            }, {
                                "featureType" : "transit",
                                "stylers" : [{
                                    "visibility" : "off"
                                }]
                            }, {
                                "featureType" : "road",
                                "elementType" : "labels",
                                "stylers" : [{
                                    "visibility" : "off"
                                }]
                            }, {
                                "featureType" : "poi",
                                "stylers" : [{
                                    "saturation" : -55
                                }]
                            }
                        ]});
                        break;

                    case "Basic":
                        type="ROADMAP";
                        this.map.setOptions({styles: [
                            {
                                featureType: "administrative",
                                stylers: [
                                 { visibility: "off" }
                                ]
                            },
                             {
                               featureType: "landscape",
                             stylers: [
                               { visibility: "off" }
                               ]
                             },
                             {
                             featureType: "road",
                             stylers: [
                               { visibility: "off" }
                               ]
                            },
                             {
                             featureType: "poi",
                             stylers: [
                               { visibility: "off" }
                             ]
                           },{
                                featureType: "water",
                                labels: "off",
                              stylers: [
                                { visibility: "on" },
                                { saturation: -65 },
                                { lightness: -15 },
                               { gamma: 0.83 },

                                ]
                              },{
                                featureType: "water",
                                elementType: "labels",
                                stylers: [
                                   { visibility: "off" }
                                ]
                              },
                           {
                              featureType: "transit",
                             stylers: [
                                  { visibility: "off" }
                                ]
                             }
                        ]});
                    break;
                    case 'Political' :
                        this.map.setOptions({styles : [
                            {
                        featureType: "administrative.country",
                        stylers: [
                        { visibility: "on" }
                        ]
                        },{
                        featureType: "administrative.locality",
                        stylers: [
                        { visibility: "off" }
                        ]
                        },{
                        featureType: "road",
                        stylers: [
                        { visibility: "off" }
                        ]
                        },{
                        featureType: "administrative.province",
                        stylers: [
                        { visibility: "on" }
                        ]
                        },{
                        featureType: "poi",
                        stylers: [
                        { visibility: "off" }
                        ]
                        },{
                        featureType: "landscape",
                        stylers: [
                        { visibility: "off" }
                        ]
                        },{
                        featureType: "water",
                        stylers: [
                        { visibility: "simplified" }
                        ]
                        },{
                        featureType: "water",
                        stylers: [
                        { gamma: 0.21 }
                        ]
                        },{
                        featureType: "landscape",
                        stylers: [
                        { gamma: 0.99 },
                        { lightness: 65 }
                        ]
                        },{
                        }
                        ]});
                   type='ROADMAP';
                   break;
                }
                this.map.setMapTypeId(google.maps.MapTypeId[type.toUpperCase()])
        },
        /**
         * Adds a handler for the 'search-display-toggle' event which
         * controls display visibility. Also adds UI event handlers for the
         * display.
         */
        addEventHandlers: function() {
            var self = this;
            _.each(
                $(this.display).find(".button"),
                function(button) {
                    $(button).click(
                        function(event) {
                            self.setBaseMap($(this).text());
                        }
                    );
                }
            );

            this.bus.addHandler(
                'basemap-display-toggle',
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
        },

        /**
         * Fires the 'add-map-control' event. The mol.map.MapEngine handles
         * this event and adds the display to the map.
         */
        fireEvents: function() {
            var params = {
                    display: this.display,
                    slot: mol.map.ControlDisplay.Slot.FIRST,
                    position: google.maps.ControlPosition.LEFT_BOTTOM
            };

            this.bus.fireEvent(new mol.bus.Event('add-map-control', params));
        }
    });

    mol.map.basemap.BaseMapControlDisplay = mol.mvp.View.extend({
        init: function() {
            var html = '' +
                '<div class="mol-BaseMapControl">' +
                    '<div class="label">Base Map:</div>' +
                    '<div title="Basic Base Map (water and boundaries only)" class="widgetTheme button">Basic</div>' +
                    '<div title="Road Base Map" class="widgetTheme button">Political</div>' +
                    '<div title="Political boundaries." class="widgetTheme button">Roadmap</div>' +
                    '<div title="Topographic Base Map" class="widgetTheme button">Terrain</div>' +
                    '<div title="Satellite Base Map" class="widgetTheme button">Satellite</div>' +
                '</div>';

            this._super(html);

        }
    });
};



mol.modules.map.metadata = function(mol) {

    mol.map.metadata = {};

    mol.map.metadata.MetadataEngine = mol.mvp.Engine.extend({
        init: function(proxy, bus) {
            this.proxy = proxy;
            this.bus = bus;
            this.sql = {
                dashboard: '' +
                    'SELECT Coverage as "Coverage", Taxon as "Taxon", ' +
                    '   dm.Description as "Description", ' +
                    '   CASE WHEN URL IS NOT NULL THEN CONCAT(\'<a target="_dashlink" href="\',dm.URL, \'">\', dm.URL, \'</a>\') ' +
                    '   ELSE Null END AS "URL", ' +
                    '   dm.Spatial_metadata as "Spatial Metadata", ' +
                    '   dm.Taxonomy_metadata as "Taxonomy Metadata", ' +
                    '   dm.seasonality as "Seasonality", ' +
                    '   dm.seasonality_more as "Seasonality further info", ' +
                    '   dm.date_range as "Date", ' +
                    '   dm.date_more as "Date further info", ' +
                    '   dm.Recommended_citation as "Recommended Citation", ' +
                    '   dm.Contact as "Contact" ' +
                    'FROM dashboard_metadata dm ' +
                    'WHERE ' +
                    '   dm.dataset_id = \'{0}\'',
                types: '' +
                    'SELECT title as "Data Type", description AS "Description" FROM types where type = \'{0}\''
            }
       },

        start: function() {

            this.addEventHandlers();
        },
        getTypeMetadata:function (params) {
            var self = this,
                type = params.type,
                title = params.title,
                sql = this.sql['types'].format(type);
              this.getMetadata(sql, title);
        },
        getDashboardMetadata: function (params) {
            var self = this,
                dataset_id = params.dataset_id,
                title = params.title,
                sql = this.sql['dashboard'].format(dataset_id);
            this.getMetadata(sql, title);
        },
        getMetadata: function (sql, title) {
            this.bus.fireEvent(
                new mol.bus.Event(
                    'show-loading-indicator',
                    {source: sql}
                )
            );
            $.getJSON(
                mol.services.cartodb.sqlApi.json_url.format(sql),
                function(response) {
                    if(self.display) {
                        self.display.dialog('close');
                    }
                    if(!response.error) {
                        if(response.total_rows > 0) {
                            self.display =
                                new mol.map.metadata.MetadataDisplay(
                                    response, title
                                );
                        }
                    }
                    self.bus.fireEvent(
                        new mol.bus.Event(
                            'hide-loading-indicator',
                            {source: sql}
                        )
                    );
                }
            );
        },
        addEventHandlers: function() {
            var self = this;

            /**
             * Callback that toggles the metadata display visibility.
             *
             * @param event mol.bus.Event
             */
            this.bus.addHandler(
                'metadata-toggle',
                function(event) {
                    var params = event.params;
                    if(params.dataset_id) {
                        self.getDashboardMetadata(params);
                    } else if(params.type) {
                        self.getTypeMetadata(params);
                    }
                }
            );
       }
    }
);

mol.map.metadata.MetadataDisplay = mol.mvp.View.extend(
    {
        init: function(response, title) {
            var self = this,
                html = '' +
                    '<div id="dialog" title="{0}">'.format(title),
                row_html = '' +
                    '<div class="metarow metakey-{0}">' +
                        '<div class="key">{1}</div>' +
                        '<div class="values"></div>' +
                    '</div>';
           _.each(
                response.rows[0],
                function(val, key, list) {
                    html+=row_html.format(
                            key.replace(/ /g, '_'),
                            key.replace(/_/g,' ')
                        );
                }
            )

            html+='</div>';

            this._super(html);
            _.each(
                response.rows,
                function(col) {
                    _.each(
                        col,
                        function(val, key, list) {
                            if(val != null) {
                                $(self).find(".metakey-{0} .values"
                                    .format(key.replace(/ /g, '_')))
                                    .append($('<div class="val">{0}<div>'
                                    .format(val)));
                            }
                            if($(self).find(".metakey-{0}"
                                .format(key.replace(/ /g, '_')))
                                .find(".val").length == 0 ) {
                                $(self).find(".metakey-{0}".format(
                                    key.replace(/ /g, '_'))
                                ).toggle(false);
                            } else {
                                $(self).find(".metakey-{0}"
                                    .format(key.replace(/ /g, '_')))
                                    .toggle(true);
                            }
                        }
                    )
                }
            );

            this.dialog(
                {
                    autoOpen: true,
                    stack: true,
                    dialogClass: "mol-LayerMetadata"
                }
            );
            //set first col widths
            $(this).find('.key')
                .width(
                    Math.max.apply(
                        Math,
                        $(self)
                            .find('.key')
                                .map(
                                    function(){
                                        return $(this).width();
                                    }
                                ).get()));
            //set total width
            this.dialog(
                "option",
                "width",
                Math.max.apply(
                    Math,
                    $(self).find('.key')
                        .map(
                            function(){
                                return $(this).width();
                            }
                        ).get())+
                    Math.max.apply(
                        Math,
                        $(self).find('.values').map(
                            function(){
                                return $(this).width()
                            }
                        ).get())+150
            );

            this.dialog("moveToTop");
        }
    });

};



mol.modules.map.splash = function(mol) {

    mol.map.splash = {};

    mol.map.splash.SplashEngine = mol.mvp.Engine.extend({
        init: function(proxy, bus, map) {
            this.proxy = proxy;
            this.bus = bus;
            this.map = map;
            this.IE8 = false;
        },
        start: function() {
        	if (this.getIEVersion() < 9 && this.getIEVersion() >= 0) {
                this.badBrowser();
            } else if (this.MOL_Down) {
                this.molDown();
            } else {
	        	this.display = new mol.map.splash.splashDisplay();
	            this.addEventHandlers();
            }
        },
        /*
        *  Returns the version of Internet Explorer or a -1
        *  (indicating the use of another browser).
        */
        getIEVersion: function() {
            var rv = -1, ua, re;
            if (navigator.appName == 'Microsoft Internet Explorer') {
                ua = navigator.userAgent;
                re = new RegExp("MSIE ([0-9]{1,}[\.0-9]{0,})");
                if (re.exec(ua) != null) {
                    rv = parseFloat(RegExp.$1);
                }
            }
            return rv;
        },
        initDialog: function() {
            var self = this;
            this.display.dialog({
                autoOpen: true,
                width: $(window).width() > 778  ? 778 : $(window).width() - 30,
                height: $(window).width() > 535  ? 535 : $(window).width() - 30,
                DialogClass: "mol-splash",
                title: "Map of Life",
                close: function() {
                    self.bus.fireEvent(new mol.bus.Event('dialog-closed-click'));
                }
            //modal: true
            });
         
            $(".ui-widget-overlay").live("click", function() {
                self.display.dialog("close");
            });
        },
        /*
        *  Display a message for IE8- users.
        */
        badBrowser: function() {
        	var self = this,
        		IEwarn = 'Sorry, your version of Internet Explorer requires the ' +
                    'Google Chrome Frame Plugin to view the Map of Life.<br>' +
                    'Chrome Frame is available at ' +
                    '<a href="http://www.google.com/chromeframe">' + 
                    	'http://www.google.com/chromeframe/</a>' +
                   	'.</br>Otherwise, please use the latest version of Chrome, ' +
                   	'Safari, Firefox, or Internet Explorer.' +
                   	'<p><a href="/about/">Click here</a> to learn more about ' +
                   	'the Map of Life Project</p>';
            //old ie8, please upgrade
            this.IE8 = true;
            $('<div class="mol-Splash IEwarning">{0}</div>'.format(IEwarn)).dialog({
            	title: 'Welcome to the Map of Life',
            	width: $(window).width()-50,
            	height: $(window).height()-50
            });
        },
        /*
        * Display a message if the site is down.
        */
        molDown: function() {
            this.initDialog();
            this.display.mesg.append($("" +
                "<font color='red'>" +
                    "Map of Life is down for maintenance. We will be back up shortly." +
                "</font>"
            ));
            $(this.display).dialog("option", "closeOnEscape", false);
            $(this.display).bind(
            "dialogbeforeclose",
            function(event, ui) {
                return false;
            }
            );
        },
        addEventHandlers: function() {
            var self = this;
            
            //Handlers for links in the splash.
            
            this.display.liveNear.click(
                function(event) {
                    var params = {dataset_id: $(this).data("dataset-id"),
                    	className: $(this).data("class-name")};
                    self.bus.fireEvent(new mol.bus.Event('hide-search'));
                    self.bus.fireEvent(new mol.bus.Event('show-list'));
                    self.bus.fireEvent(new mol.bus.Event('show-menu-hint'));
                    self.bus.fireEvent(new mol.bus.Event('list-local',params));
                    self.display.dialog("close");
                }
            );
            
            this.display.mapSingleLayer.click(
                function(event) {
                    var params = {dataset_id: 'mol',
                                    name: $(this).data("name")}
                    self.bus.fireEvent(new mol.bus.Event('map-single-species',params));
                    self.display.dialog("close");
                    self.bus.fireEvent(new mol.bus.Event('show-menu-hint'));
                    self.bus.fireEvent(new mol.bus.Event('hide-list'));
                }
            );   
                     
            this.display.pickRandom.click(
                function(event) {
                    self.bus.fireEvent(new mol.bus.Event('list-random',{}));
                    self.display.dialog("close");
                }
            );
            this.display.click(
                function(event){
                    $(this).qtip("close");
                }
            )
            this.display.list.click(
                function(event) {
                    self.bus.fireEvent(
                        new mol.bus.Event(
                            'species-list-tool-toggle',
                            {visible: true}
                        )
                    );
                     self.bus.fireEvent(
                        new mol.bus.Event(
                            'show-list'
                        )
                    );  
                    self.bus.fireEvent(
                        new mol.bus.Event(
                            'search-display-toggle',
                            {visible: false}
                        )
                    );
                    self.bus.fireEvent(
                        new mol.bus.Event(
                            'show-list-hint',
                            {visible: true}
                        )
                    );
                    self.bus.fireEvent(
                        new mol.bus.Event(
                            'show-menu-hint',
                            {visible: true}
                        )
                    );
                    self.bus.fireEvent(
                        new mol.bus.Event(
                            'hide-search'
                        )
                    );      
                    self.display.dialog("close");
                }
            );
            this.display.dashboard.click(
                function(event) {
                    self.bus.fireEvent(
                        new mol.bus.Event(
                            'taxonomy-dashboard-toggle',
                            {visible: true}
                        )
                    );
                }
            );
            
            this.display.search.click(
                function(event) {
                    self.display.dialog("close");
                    self.bus.fireEvent(
                        new mol.bus.Event(
                            'search-display-toggle',
                            {visible: true}
                        )
                    );
                    self.bus.fireEvent(
                        new mol.bus.Event(
                            'show-search'
                        )
                    );
                    self.bus.fireEvent(
                        new mol.bus.Event(
                            'species-list-tool-toggle',
                            {visible: false}
                        )
                    );
                    self.bus.fireEvent(
                        new mol.bus.Event(
                            'hide-list'
                        )
                    );
                     self.bus.fireEvent(
                        new mol.bus.Event(
                            'show-menu-hint',
                            {visible: true}
                        )
                    );
                    self.bus.fireEvent(
                        new mol.bus.Event(
                            'show-search-hint',
                            {visible: true}
                        )
                    );
                }
            );
            
            
            this.display.about.click(
                function(event) {
                    window.open('/about/');
                }
            );
            
            this.bus.addHandler(
            'toggle-splash',
            function(event) {
                self.bus.fireEvent(new mol.bus.Event('clear-lists'));
                self.initDialog();
                
            });
        }
    });
    mol.map.splash.splashDisplay = mol.mvp.View.extend({
        init: function() {
            var html = '' +
            '<div class="mol-Splash">' +
                '<div tabindex=0 class="message"></div>' +
                '<div class="header">' +
                    '<div style="font-size:16px; margin-bottom:6px;">' +
                        'Map of Life is an online resource for mapping, ' +
                        'monitoring and analyzing biodiversity worldwide. ' +
                        'Welcome to this demo version!' +
                    '</div>' +
                '</div>' +
                '<div class="mainPanel">' +
                    '<span class="legend">Map a species</span>' +
                    '<div class="innerPanel">' +
                        '<div class="imagePanel">' +
                            '<img src="../static/img/puma-range150px.jpg"/>' +
                        '</div>' +
                        '<div class="buttonPanel">' +
                            '<span ' +
                                'class="mol-Splash button mapSingleLayer" ' +
                                'data-name="Puma concolor">' +
                                'Where do Pumas live?' +
                            '</span>'    +
                            '<div class="middlePanel">' +
                                '<div >Where does this live?</div>'    +
                            '<div class="iconPanel">' +
                                '<div class="iconTop">' +
                                    '<div style="width:25px; height:37px;">' +
                                        '<img title="Lesser Flamingo" ' +
                                            'class="mapSingleLayer speciesPic" ' +
                                            'data-name="Phoeniconaias minor" ' +
                                            'src="../static/img/flamingo25x37px.png" />' +
                                    '</div>' +
                                '</div>' + 
                                '<div class="iconTop">' +
                                    '<div style="width:38px; height:39px;">' +
                                        '<img title="Broad-Banded Grass Frog" ' +
                                        'class="mapSingleLayer speciesPic" ' +
                                        'data-name="Ptychadena bibroni" ' +
                                        'src="../static/img/frog38x39px.png" />' +
                                    '</div>' +
                                '</div>' +
                                '<div class="iconTop">' +
                                    '<div style="width:40px; height:38px;">' +
                                        '<img title="Joshua Tree" ' +
                                        'class="mapSingleLayer speciesPic" ' +
                                        'data-name="Yucca brevifolia" ' +
                                        'src="../static/img/jtree40x38px.png" />' +
                                    '</div>' +
                                '</div>' +
                                '<div class="iconBottom">' +
                                    '<div style="width:60px; height:27px;">' +
                                        '<img ' +
                                            'title="Hairy-Eared Dwarf Lemur" ' +
                                            'class="mapSingleLayer speciesPic" ' +
                                            'data-name="Allocebus trichotis" ' +
                                            'src="../static/img/lemur60x27px.png"/>' +
                                    '</div>' +
                                '</div>' +
                                '<div class="iconBottom" style="float:right">' +
                                    '<div style="width:50px; height:33px;">'+
                                        '<img ' +
                                            'title="Arabian Toad-headed Agama" ' +
                                            'class="mapSingleLayer speciesPic" ' +
                                            'data-name="Phrynocephalus arabicus" ' +
                                            'src="../static/img/lizard50x33px.png"/>' +
                                    '</div>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                        '<div style="clear:both; padding-top:7px">'+
                            '<span class="mol-Splash button search">' +
                                'Let me search for a species' +
                            '</span>' +
                        '</div>'   +
                    '</div>'+
                '</div>' +
            '</div>' +
            '<div class="spacer"></div>' +
            '<div class="mainPanel">' +       
                '<span class="legend">See a species list</span>' +
                '<div class="innerPanel">' +
                    '<div class="imagePanel">' +
                        '<img src="../static/img/species-list150px.jpg"/>' +
                    '</div>' +
                    '<div class="buttonPanel">' + 
                        '<span class="mol-Splash button liveNear">' +
                            'Which birds live near me?' +
                        '</span>' +
                        '<div class="middlePanel">' +
                            '<div>What lives near me?</div>'  +
                            '<div style="margin-top:10px; width:150px">' +
                                '<div class="iconTop">' +
                                    '<div style="width:29px; height:40px;">' +
                                        '<img title="Birds" ' +
                                        'class="liveNear speciesPic"  ' +
                                        'data-dataset_id="jetz_maps" ' +
                                        'data-class_name="Aves" ' +
                                        'src="../static/img/bird29x40px.png" />' +
                                    '</div>' +
                                '</div>' +
                                '<div class="iconTop">' +
                            		'<div style="width:38px; height:39px;">' +
                                    	'<img title="Amphibians" ' +
                                            'class="liveNear speciesPic" '+
                                            'data-dataset-id="iucn_amphibians" '+
                                            'data-class-name="Amphibia" '+
                                            'src="../static/img/frog38x39px.png" />'+
                                        '</div>'+
                                    '</div>' +
                                    '<div class="iconTop">'+
                                    	'<div style="width:40px; height:18px; margin-top:11px">'+
            								'<img title="North American Freshwater Fishes" ' +
            									'class="liveNear speciesPic" ' +
            									'data-dataset-id="na_fish" ' +
            									'data-class-name="Fishes" ' +
            									'src="../static/img/bass40x18px.png" />' +
    									'</div>' +
									'</div>' +
            						'<div  class="iconBottom">' +
            							'<div style="width:60px; height:27px;">' +
            								'<img title="Mammals" ' +
            									'class="liveNear speciesPic" ' + 
            									'data-dataset-id="iucn_mammals" ' + 
            									'data-class-name="Mammalia" ' + 
            									'src="../static/img/lemur60x27px.png"/>'+
    									'</div>' +
									'</div>' +
            						'<div class="iconBottom" style="float:right">' +
            						    '<div style="width:50px; height:33px;">' +
                                            '<img title="North American Reptiles" ' +
                                            	'class="liveNear speciesPic" ' +
                                            	'data-dataset-id="iucn_reptiles" ' +
                                            	'data-class-name="Reptilia" ' +
                                            	'src="../static/img/lizard50x33px.png"/>' +
                                    	'</div>' +
                                	'</div>' +
                                '</div>' +
                            '</div>' +
                            '<div style="clear:both; padding-top:7px";>' +
                                '<span  class="mol-Splash button list">' +
                                    'Let me pick a place' +
                                '</span>' +
                            '</div>' + 
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="bottomPanel">' +
                    '<span class="mol-Splash dashboard button">' +
                        'All datasets' +
                    '</span>' +
                    '<div class="spacer"></div>'+
                    '<span class="mol-Splash about button">' +
                        'About' +
                    '</span>' + 
                '</div>' +
                
            '<div id="footer_imgs" style="text-align: center;clear: both;">' + 
                '<div>Sponsors, partners and supporters</div>' +
                    '<a target="_blank" ' +
                    	'tabindex="10" ' +
                    	'href="http://www.yale.edu/jetz/">' +
            			'<button>' +
            				'<img width="72px" ' +
    					        'height="36px" ' +
    					        'title="Jetz Lab, Yale University" ' +
    					        'src="/static/home/yale.png">' +
        				'</button>' +
    				'</a>' +
                    '<a target="_blank" ' +
                        'tabindex="11" ' +
                        'href="http://sites.google.com/site/robgur/">' +
                        '<button>' +
                            '<img width="149px" height="36px" ' +
                            'title="Guralnick Lab, University of Colorado Boulder" ' +
                            'src="/static/home/cuboulder.png">' +
                        '</button>' +
                    '</a>' +
                    '<a target="_blank" ' +
                    	'tabindex="12" ' +
                    	'href="http://www.gbif.org/">' +
                    	'<button>' +
                    		'<img width="33px" height="32px" ' +
                    		'title="Global Biodiversity Information Facility" '+
                    		'src="/static/home/gbif.png">' +
                		'</button>' +
            		'</a>' +
                    '<a target="_blank" tabindex="13" ' +
                    	'href="http://www.eol.org/">' +
                    	'<button>' +
                    		'<img width="51px" height="32px" ' +
                    			'title="Encyclopedia of Life" ' +
                    			'src="http://www.mappinglife.org/static/home/eol.png">' +
            			'</button>' +
        			'</a>' +
                    '<a target="_blank" tabindex="14" ' +
                    	'href="http://www.nasa.gov/">' +
                    	'<button>' +
                    		'<img width="37px" height="32px" ' +
                    			'title="National Aeronautics and Space Administration" ' +
                    			'src="http://www.mappinglife.org/static/home/nasa.png">' +
            			'</button>' +
        			'</a>' +
                    '<br>' +
                    '<a target="_blank" tabindex="15" ' +	
                    	'href="http://www.nceas.ucsb.edu/">' +
                    	'<button>' +
                    	    '<img width="30px" height="32px" ' +
                    		    'title="National Center for Ecological Analysis and Synthesis" ' +
                    		    'src="http://www.mappinglife.org/static/home/nceas.png">' +
        			    '</button>' +
    			    '</a>' +
                    '<a target="_blank" tabindex="16" ' +
                        'href="http://www.iplantcollaborative.org/">' +
                        '<button>' +
                            '<img width="105px" height="32px" ' +
                                'title="iPlant Collaborative" ' +
                                'src="http://www.mappinglife.org/static/home/iplant.png">' +
                        '</button>' +
                    '</a>' +
                    '<a target="_blank" tabindex="17" ' +
                    	'href="http://www.senckenberg.de">' +
                    	'<button>' +
                    		'<img width="81px" height="32px" ' +
                    			'title="Senckenberg" ' +
                    			'src="http://www.mappinglife.org/static/home/senckenberg.png">' +
            			'</button>' +
        			'</a>' +	
                    '<a target="_blank" tabindex="18" ' +
                    	'href="http://www.bik-f.de/">' +
                    		'<button>' +
                    			'<img width="74px" height="32px" ' +
                    				'title="Biodiversität und Klima Forschungszentrum (BiK-F)" ' +
                    				'src="http://www.mappinglife.org/static/home/bik_bildzeichen.png">' +
            				'</button>' +
    				'</a>' +
                    '<a target="_blank" tabindex="19" ' +
                    	'href="http://www.mountainbiodiversity.org/">' +
                    	'<button>' +
                    		'<img width="59px" height="32px" ' +
                    			'title="Global Mountain Biodiversity Assessment" ' +
                    			'src="http://www.mappinglife.org/static/home/gmba.png">' +
            			'</button>' +
        			'</a>' +
                '</div>' +
            '</div>';
            this._super(html);
            this.about = $(this).find('.about');
            this.search = $(this).find('.search');
            this.dashboard = (this).find('.dashboard');
            this.seePuma = $(this).find('.seePuma');
            this.liveNear = $(this).find('.liveNear');
            this.mapSingleLayer = $(this).find('.mapSingleLayer');
            this.pickRandom = $(this).find('.pickRandom');
            this.list = $(this).find('.list');
            this.mesg = $(this).find('.message');
        }
    });
};mol.modules.map.help = function(mol) {

    mol.map.help = {};

    mol.map.help.HelpDialog = mol.mvp.Engine.extend(
        {
            init: function(proxy, bus) {
                this.proxy = proxy;
                this.bus = bus;
             },

            /**
             * Starts the MenuEngine. Note that the container parameter is
             * ignored.
             */
            start: function() {
                this.helpDisplay = new mol.map.help.helpDisplay();
                this.feedbackDisplay = new mol.map.help.feedbackDisplay();
                this.initDialog();
                this.addEventHandlers();
            },

            addEventHandlers: function() {
                var self = this;

                this.bus.addHandler(
                    'help-display-dialog',
                    function(event) {
                        var params = null,
                            e = null;

                        if(event.state === undefined) {
                            self.helpDisplay.dialog('open');

                            // This is necessary, because otherwise the
                            // iframe comes out in the wrong size.
                            $(self.helpDisplay).width('98%');
                        } else {
                            self.helpDisplay.dialog(event.state);
                        }
                    }
                );

                this.bus.addHandler(
                    'feedback-display-toggle',
                    function(event) {
                        var params = null,
                            e = null;

                        if(event.state === undefined) {
                            if(self.feedbackDisplay.dialog('isOpen')) {
                                self.feedbackDisplay.dialog('close');
                            } else {
                                self.feedbackDisplay.dialog('open');
                            }

                            // This is necessary, because otherwise the
                            // iframe comes out in the wrong size.
                            $(self.feedbackDisplay).width('98%');
                        } else {
                            self.feedbackDisplay.dialog(event.state);
                        }
                    }
                );


            },

            initDialog: function() {
                this.helpDisplay.dialog(
                    {
                        autoOpen: false,
			            dialogClass: "mol-help",
                        height: 550,
                        width: 700,
                        modal: true
                    }
                );

                this.feedbackDisplay.dialog(
                    {
                        autoOpen: false,
			            dialogClass: "mol-help",
                        height: 550,
                        width: 850,
                        modal: true,
                    }
                );
            }
        }
    );

    mol.map.help.helpDisplay = mol.mvp.View.extend(
        {
            init: function() {
                var html = '' +
                    '<iframe id="help_dialog" ' + 
                        'class="mol-help iframe_content" ' + 
                        'src="/static/help/index.html">' + 
                    '</iframe>';

                this._super(html);

                // this.iframe_content = $(this).find('.iframe_content');
            }
        }
    );

    mol.map.help.feedbackDisplay = mol.mvp.View.extend(
        {
            init: function() {
                var html = '' +
                    '<iframe id="feedback_dialog" ' + 
                        'src="https://docs.google.com/' + 
                        'spreadsheet/embeddedform?' + 
                        'formkey=dC10Y2ZWNkJXbU5RQWpWbXpJTzhGWEE6MQ" ' + 
                        'width="760" ' + 
                        'height="625" ' + 
                        'frameborder="0" ' + 
                        'marginheight="0" ' + 
                        'marginwidth="0">' + 
                        'Loading...' + 
                    '</iframe>';

                this._super(html);

                // this.iframe_content = $(this).find('.iframe_content');
            }
        }
    );
};



mol.modules.map.status = function(mol) {

    mol.map.status = {};

    mol.map.status.StatusEngine = mol.mvp.Engine.extend(
        {
            init: function(proxy, bus) {
                this.proxy = proxy;
                this.bus = bus;
             },

            /**
             * Starts the MenuEngine. Note that the container parameter is
             * ignored.
             */
            start: function() {

                this.display = new mol.map.status.StatusDisplay();
                this.addEventHandlers();
            },

            showStatus: function() {
                this.display.dialog(
                    {
                        autoOpen: true,
            			width: 680,
            			height: 390,
            			dialogClass: "mol-status",
            			modal: true
                    }
                );
                
                $(this.display).width('98%');
            },
            
            addEventHandlers : function () {
                 var self = this;
                 this.bus.addHandler(
                    'status-display-dialog',
                    function (params) {
                        self.showStatus();
                    }
                );
            }
        }
    );

    mol.map.status.StatusDisplay = mol.mvp.View.extend(
        {
            init: function() {
                var html = '' +
                '<div>' +
	            '  <iframe ' + 
	                   'class="mol-status iframe_content ui-dialog-content" ' + 
	                   'style="height:600px; ' + 
	                           'width: 98%; ' + 
	                           'margin-left: -18px; ' + 
	                           'margin-right: auto; ' + 
	                           'display: block;" ' + 
                       'src="/static/status/index.html">' + 
                '  </iframe>' +
                '</div>';

                this._super(html);
                this.iframe_content = $(this).find('.iframe_content');
		        this.mesg = $(this).find('.message');
            }
        }
    );
};



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
                                } else if(layer.type != 'sum'){
                                    o.fill = $('#showFillPalette')
                                            .spectrum("get")
                                                .toHexString();
                                }
                                if(layer.type != 'sum'){
                                    o.border = $('#showBorderPalette')
                                                    .spectrum("get")
                                                        .toHexString();
                                    o.size = $(api.elements.content)
                                                    .find('.sizer')
                                                        .slider('value');
                                }

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
                } else if (layer.type != 'sum'){
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
            } else if (lay.type != 'sum'){
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
            if(lay.type != 'sum') {
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
            }
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
            if(layer.type='sum') {return};
            
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
                } else if (layer.type !='sum'){
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
                                visible ? '#AA0022' : oldStyle.border,
                                false
                            );
                } else {
                    style = this.changeStyleProperty(
                                style,
                                'line-color',
                                visible ? '#AA0022' : oldStyle.border,
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
mol.modules.map.images = function(mol) {

    mol.map.images = {};

    mol.map.images.ImagesEngine = mol.mvp.Engine.extend(
        {
            init: function(proxy, bus) {
                this.proxy = proxy;
                this.bus = bus;
             },

            /**
             * Starts the MenuEngine. Note that the container parameter is
             * ignored.
             */
            start: function() {

                this.display = new mol.map.images.ImagesDisplay();
                this.addEventHandlers();
            },

            showImages: function() {
                this.display.dialog(
                    {
                        autoOpen: true,
                        width: 640,
                        height: 480,
                        dialogClass: "mol-images",
                        modal: true
                    }
                );
                 $(this.display).width('98%');

            },
            addEventHandlers : function () {
                 var self = this;
                 this.bus.addHandler(
                    'get-images',
                    function (params) {
                        $.post(
                            'eol/images',
                            {
                                names : params.names},
                            function(response) {
                               $(self.display).empty();
                               _.each(
                                   response,
                                   function(species) {
                                       _.each(
                                           species.dataObjects,
                                           function(dataObject) {
                                               self.display.append(new mol.map.images.ImageDisplay(dataObject.eolMediaURL));
                                           }
                                       )
                                   }
                               );
                               self.showImages();
                            }
                        );

                    }
                );
            }
        }
    );

    mol.map.images.ImagesDisplay = mol.mvp.View.extend(
        {
            init: function() {
                var html = '' +
                '<div class="mol-ImagesDisplay"></div>';

                this._super(html);
            }
        }
    );
       mol.map.images.ImageDisplay = mol.mvp.View.extend(
        {
            init: function(src) {
                var html = '' +
                '<img height="100%" src="{0}">';

                this._super(html.format(src));
            }
        }
    );
      mol.map.images.ThumbnailDisplay = mol.mvp.View.extend(
        {
            init: function(src) {
                var html = '' +
                '<img class="mol-Thumbnail" src="{0}">';

                this._super(html.format(src));
            }
        }
    );
};



mol.modules.map.boot = function(mol) {

    mol.map.boot = {};

    mol.map.boot.BootEngine = mol.mvp.Engine.extend({
        init: function(proxy, bus, map) {
            this.proxy = proxy;
            this.bus = bus;
            this.map = map;
            this.IE8 = false;
            this.maxLayers = ($.browser.chrome) ? 6 : 25;
            this.sql = '' +
                'SELECT DISTINCT l.scientificname as name,'+
                    't.type as type,'+
                    't.cartocss as css,' +
                    't.sort_order as type_sort_order, ' +
                    't.title as type_title, '+
                    't.opacity as opacity, ' +
                    'CONCAT(l.provider,\'\') as source, '+
                    'CONCAT(p.title,\'\') as source_title,'+
                    's.source_type as source_type, ' +
                    's.title as source_type_title, ' +   
                    "CASE WHEN l.feature_count is not null THEN CASE WHEN d.type = 'taxogeooccchecklist' " +
                        'THEN ' +
                            "CONCAT("+
                                "to_char(l.occ_count,'999,999,999'),"+
                                "' records<br>'," +
                                "to_char(l.feature_count, '999,999,999'),"+
                                "' locations'"+
                ") " +
                        'ELSE ' +
                            "CONCAT(to_char(l.feature_count,'999,999,999'),' features') "+
                    'END ELSE \'\' END as feature_count, '+
                    'CONCAT(n.v,\'\') as names, ' +
                    'CASE WHEN l.extent is null THEN null ELSE ' +
                    'CONCAT(\'{' +
                        '"sw":{' +
                            '"lng":\',ST_XMin(box2d(ST_Transform(ST_SetSRID(l.extent,3857),4326))),\', '+
                            '"lat":\',ST_YMin(box2d(ST_Transform(ST_SetSRID(l.extent,3857),4326))),\' '+
                        '}, '+
                        '"ne":{' +
                        '"lng":\',ST_XMax(box2d(ST_Transform(ST_SetSRID(l.extent,3857),4326))),\', ' +
                        '"lat":\',ST_YMax(box2d(ST_Transform(ST_SetSRID(l.extent,3857),4326))),\' ' +
                        '}}\') ' +
                    'END as extent, ' +
                    'l.dataset_id as dataset_id, ' +
                    'd.dataset_title as dataset_title, ' + 
                    'd.style_table as style_table ' +
                    
                'FROM layer_metadata l ' +
                'LEFT JOIN data_registry d ON ' +
                    'l.dataset_id = d.dataset_id ' +
                'LEFT JOIN types t ON ' +
                    'l.type = t.type ' +
                'LEFT JOIN providers p ON ' +
                    'l.provider = p.provider ' +
                'LEFT JOIN source_types s ON ' +
                    'p.source_type = s.source_type ' +
                'LEFT JOIN ac n ON ' +
                    'l.scientificname = n.n ' +
                'WHERE ' +
                     "n.n~*'\\m{0}' OR n.v~*'\\m{0}' " +
                'ORDER BY name, type_sort_order';
        },
        start: function() {
            this.loadTerm();
        },
        /*
         *   Method to attempt loading layers from search term in the URL.
         */
        loadTerm: function() {
            var self = this;
            
            // Remove backslashes and replace characters that equal spaces.
            this.term = unescape(
                window.location.pathname
                    .replace(/\//g, '')
                    .replace(/\+/g, ' ')
                    .replace(/_/g, ' ')
            );

            if ((this.getIEVersion() >= 0 && this.getIEVersion() <= 8) 
                || this.term == '') {
                // If on IE8- or no query params, fire the splash event
                self.bus.fireEvent(new mol.bus.Event('toggle-splash'));
            } else {
                // Otherwise, try and get a result using term
                $.getJSON(
                    mol.services.cartodb.sqlApi.json_url.format(this.sql.format(self.term)),
                    function(response) {
                        var results = response.rows;
                        if (results.length == 0) {
                            self.bus.fireEvent(new mol.bus.Event('toggle-splash'));
                            self.map.setCenter(new google.maps.LatLng(0,-50));
                        } else {
                            //parse the results
                            self.loadLayers(self.getLayersWithIds(results));
                        }
                    },
                    'json'
                );
            }
        },
        /*
         * Adds layers to the map if there are fewer than 25 results, 
         * or fires the search results widgetif there are more.
         */
        loadLayers: function(layers) {
            if (Object.keys(layers).length <= this.maxLayers) {
                this.bus.fireEvent(
                    new mol.bus.Event('add-layers', {layers: layers})
                );
            } else if (this.term != null) {
                this.bus.fireEvent(
                    new mol.bus.Event('search', {term: this.term})
                );
                this.map.setCenter(new google.maps.LatLng(0,-50));
            }
        },
        /*
         * Returns an array of layer objects {id, name, type, source}
         * with their id set given an array of layer objects
         * {name, type, source}.
         */
        getLayersWithIds: function(layers) {
            return _.map(
                layers,
                function(layer) {
                    return _.extend(layer, {id: mol.core.getLayerId(layer)});
                }
            );
        },
        /* Returns the version of Internet Explorer or a -1
         * (indicating the use of another browser).
         */
        getIEVersion: function() {
            var rv = -1, ua, re;
            // Return value assumes failure.
            if (navigator.appName == 'Microsoft Internet Explorer') {
                ua = navigator.userAgent;
                re = new RegExp("MSIE ([0-9]{1,}[\.0-9]{0,})");
                if (re.exec(ua) != null) {
                    rv = parseFloat(RegExp.$1);
                }
            }
            return rv;
        }
    });
};
