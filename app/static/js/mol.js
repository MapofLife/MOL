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
     * Retunrs a layer id string given a layer {name, type, source, englishname}.
     */
    mol.core.getLayerId = function(layer) {
        var name = $.trim(layer.name.toLowerCase()).replace(/ /g, "_"),
            type = $.trim(layer.type.toLowerCase()).replace(/ /g, "_"),
            source = $.trim(layer.source.toLowerCase()).replace(/ /g, "_");
            englishname = $.trim(layer.englishname).replace(/ /g, "_");
        return 'layer--{0}--{1}--{2}--{3}--'.format(name, type, source, englishname);
    };

    /**
     * @param id The layer id of the form "layer--{name}--{type}--{source}--{englishname}".
     */
    mol.core.getLayerFromId = function(id) {
        var tokens = id.split('--'),
            name = tokens[1].replace(/_/g, " "),
            type = tokens[2].replace(/_/g, " "),
            source = tokens[3].replace(/_/g, " ");
            englishname = tokens[4].replace(/_/g, " ");

        name = name.charAt(0).toUpperCase()+name.slice(1).toLowerCase();
        source = source.toLowerCase();
        type = type.toLowerCase();

        return {
            id: id,
            name: name,
            type: type,
            source: source,
            englishname: englishname
        };
    };
};
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
            init: function(user, host) {
                this.user = user;
                this.host = host;
                this.url = 'https://{0}.{1}/api/v2/sql?q={2}';
                this.cache = '/cache/get';
            },

            query: function(key, sql, callback) {
                  var data = {
                          key: key,
                          sql: sql
                      },
                      xhr = $.post(this.cache, data);

                xhr.success(
                    function(response) {
                        callback.success(response);
                    }
                );

                xhr.error(
                    function(response) {
                        callback.failure(response);
                    }
                );
            }
        }
    );

    mol.services.cartodb.sqlApi = new mol.services.cartodb.SqlApi('mol', 'cartodb.com');

    mol.services.cartodb.query = function(key, sql, callback) {
        mol.services.cartodb.sqlApi.query(key, sql, callback);
    };

    /**
     * Converts a CartoDB SQL response to a search profile response.
     *
     */
    mol.services.cartodb.Converter = Class.extend(
        {
            init: function() {
            },

            convert: function(response) {
                this.response = response;
                return {

                    "layers": this.getLayers(this.response),
                    "names": this.genNames(this.response),
                    "sources": this.genSources(this.response),
                    "types": this.genTypes(this.response),
                    "englishnames": this.genEnglishNames(this.response)
                };
            },

            /**
             * Returns an array of unique values in the response. Key value is
             * name, source, or type.
             */
            uniques: function(key, response) {
                var results = [],
                row = null;

                for (i in response.rows) {
                    row = response.rows[i];
                    switch (key) {
                    case 'name':
                        results.push(row.name);
                        break;
                    case 'type':
                        results.push(row.type);
                        break;
                    case 'source':
                        results.push(row.source);
                        break;
                    case 'englishname':
                        results.push(row.englishname);
                        break;
                    }
                }
                return _.uniq(results);
            },

            /**
             * Returns the top level names profile object.
             *
             * {"name": "types":[], "sources":[], "layers":[]}
             *
             */
            genNames: function(response) {
                var names = this.uniques('name', response),
                name = null,
                profile = {};

                for (i in names) {
                    name = names[i];
                    profile[name] = this.getNameProfile(name, response);
                }

                return profile;
            },

            /**
             * Returns the top level types profile object.
             *
             * {"type": "names":[], "sources":[], "layers":[]}
             *
             */
            genTypes: function(response) {
                var types = this.uniques('type', response),
                type = null,
                profile = {};

                for (i in types) {
                    type = types[i];
                    profile[type] = this.getTypeProfile(type, response);
                }

                return profile;
            },

            /**
             * Returns the top level source profile object.
             *
             * {"source": "names":[], "types":[], "layers":[]}
             *
             */
            genSources: function(response) {
                var sources = this.uniques('source', response),
                source = null,
                profile = {};

                for (i in sources) {
                    source = sources[i];
                    profile[source] = this.getSourceProfile(source, response);
                }

                return profile;
            },
            /**
             * Returns the top level english profile object.
             *
             * {"source": "names":[], "types":[], "layers":[], "englishnames":[]}
             *
             */
            genEnglishNames: function(response) {
                var englishnames = this.uniques('englishname', response),
                englishname = null,
                profile = {};

                for (i in englishnames) {
                    englishname = englishnames[i];
                    profile[englishname] = this.getEnglishNameProfile(englishname, response);
                }

                return profile;
            },
            /**
             * Returns a profile for a single name.
             */
            getNameProfile: function(name, response) {
                var layers = [],
                sources = [],
                types = [],
                englishnames =[],
                row = null;

                for (i in response.rows) {
                    row = response.rows[i];
                    if (name === row.name) {
                        layers.push(i + '');
                        sources.push(row.source);
                        types.push(row.type);
                    }
                }
                return {
                    "layers": _.uniq(layers),
                    "sources" : _.uniq(sources),
                    "types": _.uniq(types),
                    "englishnames": _.uniq(englishnames)
                };
            },

            /**
             * Returns a profile for a single source.
             */
            getSourceProfile: function(source, response) {
                var layers = [],
                names = [],
                types = [],
                englishnames = [],
                row = null;

                for (i in response.rows) {
                    row = response.rows[i];
                    if (source === row.source) {
                        layers.push(i + '');
                        names.push(row.name);
                        types.push(row.type);
                    }
                }
                return {
                    "layers": _.uniq(layers),
                    "names" : _.uniq(names),
                    "types": _.uniq(types),
                    "englishnames": _.uniq(englishnames)
                };
            },

            /**
             * Returns a profile for a single type.
             */
            getTypeProfile: function(type, response) {
                var layers = [],
                sources = [],
                names = [],
                englishnames =[],
                row = null;

                for (i in response.rows) {
                    row = response.rows[i];
                    if (type === row.type) {
                        layers.push(i + '');
                        sources.push(row.source);
                        names.push(row.name);
                        englishnames.push(row.englishname);
                    }
                }
                return {
                    "layers": _.uniq(layers),
                    "sources" : _.uniq(sources),
                    "names": _.uniq(names),
                    "englishnames": _.uniq(englishnames)
                };
            },
            /**
             * Returns a profile for a single english name.
             */
            getEnglishNameProfile: function(englishname, response) {
                var layers = [],
                sources = [],
                names = [],
                types =[],
                row = null;

                for (i in response.rows) {
                    row = response.rows[i];
                    if (englishname === row.englishname) {
                        layers.push(i + '');
                        sources.push(row.source);
                        names.push(row.name);
                        types.push(row.type);
                    }
                }
                return {
                    "layers": _.uniq(layers),
                    "sources" : _.uniq(sources),
                    "names": _.uniq(names),
                    "types": _.uniq(types)
                };
            },

            /**
             * Returns the layers profile.
             */
            getLayers: function(response) {
                var rows = response.rows,
                row = null,
                key = null,
                layers = {};

                for (i in rows) {
                    row = rows[i];
                    key = i + '';
                    layers[key] = {
                        name: row.name.charAt(0).toUpperCase()+row.name.slice(1).toLowerCase(),
                        source: row.source.toLowerCase(),
                        type: row.type.toLowerCase(),
                        englishname: (row.englishname != undefined) ? _.uniq(row.englishname.split(', ')).join(', ') : '' //this removes duplicates
                        //extent: this.getExtent(row.extent)
                    };
                }
                return layers;
            },

            /**
             * Returns an array of coordinate arrays:
             * [[1, 2], ...]
             *
             * @param polygon POLYGON((34.073597 36.393648,34.073597 36.467531,
             *                         34.140662 36.467531,34.140662 36.393648,
             *                         34.073597 36.393648))
             */
            getExtent: function(polygon) {
                return _.map(
                    polygon.split('POLYGON((')[1].split('))')[0].split(','),
                    function(x) {
                        var pair = x.split(' ');
                        return [parseFloat(pair[0]), parseFloat(pair[1])];
                    }
                );
            }
        }
    );

    mol.services.cartodb.converter = new mol.services.cartodb.Converter();

    mol.services.cartodb.convert = function(response) {
        return mol.services.cartodb.converter.convert(response);
    };
};
mol.modules.map = function(mol) {

    mol.map = {};

    mol.map.submodules = ['search', 'results', 'layers', 'tiles', 'menu', 'loading', 'dashboard', 'query', 'legend', 'basemap'];

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

                // Add bottom left map control.
                this.ctlBottom = new ControlDisplay('LeftBottomControl');
                controls[ControlPosition.BOTTOM_LEFT].clear();
                controls[ControlPosition.BOTTOM_LEFT].push(this.ctlBottom.element);

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
                case ControlPosition.BOTTOM_LEFT:
                    control = this.ctlBottom;
                    break;
                 case ControlPosition.RIGHT_BOTTOM:
                    control = this.ctlRightBottom;
                    break;
                }

                return control;
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
                this.bus.addHandler(
                    'register-list-click',
                    function(event) {
                            google.maps.event.addListener(
                            self.display.map,
                            "rightclick",
                            function(event) {
                                var params = { gmaps_event : event, map : self.display.map}
                                self.bus.fireEvent(new mol.bus.Event('species-list-query-click',params));
                            }
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
                                self.bus.fireEvent(new mol.bus.Event('show-loading-indicator',{source : "overlays"}));
                                $("img",self.display.map.overlayMapTypes).imagesLoaded (
                                    function(images, proper, broken) {
                                        self.bus.fireEvent( new mol.bus.Event('hide-loading-indicator',{source : "overlays"}));
                                    }
                                 );
                            }
                        }
                );


                /**
                 * Handles the layer-toggle event. The event.layer is a layer
                 * object {name, type} and event.showing is true if the layer
                 * is showing, false otherwise.
                 */
                this.bus.addHandler(
                    'layer-toggle',
                    function(event) {
                        var name = event.layer.name,
                            type = event.layer.type,
                            id = 'layer-{0}-{1}'.format(name, type),
                            overlayMapTypes = self.display.map.overlayMapTypes;

                        overlayMapTypes.forEach(
                            function(layer, index) {
                                if (layer.name === id) {
                                    overlayMapTypes.removeAt(index);
                                }
                            }
                        );
                    }
                );
                /**
                 * Handles the layer-toggle event. The event.layer is a layer
                 * object {name, type} and event.showing is true if the layer
                 * is showing, false otherwise.
                 */
                this.bus.addHandler(
                    'toggle-overlays',
                    function(event) {
                        var toggle = event.toggle,
                        overlayMapTypes = self.display.map.overlayMapTypes;
                        if(toggle == false) {
                            self.layerList = [];
                            overlayMapTypes.forEach(
                                function(layer, index) {
                                    self.layerList.push(layer);
                                    overlayMapTypes.removeAt(index);
                                }
                            )
                            overlayMapTypes.clear();
                        } else {
                            _.each(
                                self.layerList,
                                function(layer){
                                    self.display.map.overlayMapTypes.push(layer);
                                }
                            )
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
                    zoom: 2,
                    maxZoom: 15,
                    minZoom: 2,
                    minLat: -85,
                    maxLat: 85,
                    mapTypeControl: false,
                    //mapTypeControlOptions: {position: google.maps.ControlPosition.BOTTOM_LEFT},
                    center: new google.maps.LatLng(0,0),
                    mapTypeId: google.maps.MapTypeId.ROADMAP,
                    styles: [
                      {
                        featureType: "administrative",
                        stylers: [
                          { visibility: "simplified" }
                        ]
                      },
                      {
                        featureType: "administrative.locality",
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
                        stylers: [
                          { visibility: "on" },
                          { saturation: -65 },
                          { lightness: -15 },
                          { gamma: 0.83 }
                        ]
                      },
                      {
                        featureType: "transit",
                        stylers: [
                          { visibility: "off" }
                        ]
                      },{
                        featureType: "administrative",
                        stylers: [
                          { visibility: "off" }
                        ]
                      },{
                        featureType: "administrative.country",
                        stylers: [
                          { visibility: "on" }
                        ]
                      },{
                        featureType: "administrative.province",
                       stylers: [
                          { visibility: "on" }
                        ]
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
                    '    <div class="TOP"></div>' +
                    '    <div class="MIDDLE"></div>' +
                    '    <div class="BOTTOM"></div>' +
                    '</div>';

                this._super(html);
                //this.selectable({disabled: true});

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

    mol.map.layers.LayerEngine = mol.mvp.Engine.extend(
        {
            init: function(proxy, bus, map) {
                this.proxy = proxy;
                this.bus = bus;
                this.map = map;
            },

            start: function() {
                this.display = new mol.map.layers.LayerListDisplay('.map_container');
                this.fireEvents();
                this.addEventHandlers();
				    this.initSortable();
            },

            /**
             * Handler a layer-opacity event. This handler only does something
             * when the event.opacity is undefined. This is to support layer
             * toggling with opacity only (instead of removing overlays from
             * the map). In this case, the opacity from the layer widget is
             * bubbled to a new layer-opacity event that gets fired on the bus.
             */
            addEventHandlers: function() {
                var self = this;

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
                        _.each(
                            event.layers,
                            function(layer) { // Removes duplicate layers.
                                if (self.display.getLayer(layer).length > 0) {
                                    event.layers = _.without(event.layers, layer);
                                }
                            }
                        );
                        self.addLayers(event.layers);
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
            },

            /**
             * Fires the 'add-map-control' event. The mol.map.MapEngine handles
             * this event and adds the display to the map.
             */
            fireEvents: function() {
                var params = {
                        display: this.display,
                        slot: mol.map.ControlDisplay.Slot.TOP,
                        position: google.maps.ControlPosition.TOP_RIGHT
                    },
                    event = new mol.bus.Event('add-map-control', params);

                this.bus.fireEvent(event);
            },

            /**
             * Sorts layers so that they're grouped by name. Within each named
             * group, they are sorted by type: points, protectedarea, range,
             * ecoregion.
             *
             * @layers array of layer objects {name, type}
             */
            sortLayers: function(layers) {
                var sorted = [],
                    names_map = {};

                _.sortBy( // Layer names sorted alphabetically.
                    _.each(layers,
                          function(layer) {
                              names_map[layer.name] = layer.name; // Gather unique names.
                          })
                );

                _.each(_.keys(names_map),
                       function(name) {
                           var group = _.groupBy(_.groupBy(layers, "name")[name], "type");

                           _.each(
                               ['points', 'protectedarea', 'range', 'ecoregion'],
                               function(type) {
                                   if (group[type]) {
                                       sorted.push(group[type][0]);
                                   }
                               }
                           );
                       });

                return sorted;

            },

            /**
             * Handler for layer opacity changes via UI. It fires a layer-opacity
             * event on the bus, passing in the layer object and its opacity.
             */
            opacityHandler: function(layer, l) {
                return function(event) {
                    var params = {},
                        e = null;

                    params = {
                        layer: layer,
                        opacity: parseFloat(l.opacity.slider("value"))
                    },

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
                    sortedLayers = this.sortLayers(layers);

                _.each(
                    sortedLayers,
                    function(layer) {
                        var l = this.display.addLayer(layer),
                            self = this,
                            opacity = null;

                        self.bus.fireEvent(new mol.bus.Event('show-layer-display-toggle'));

                        // Set initial opacity based on layer type.
                        switch (layer.type) {
                        case 'points':
                            opacity = 1.0;
                            break;
                        case 'ecoregion':
                            opacity = .25;
                            break;
                        case 'protectedarea':
                            opacity = 1.0;
                            break;
                        case 'range':
                            opacity = .5;
                            break;
                        }

                        // Hack so that at the end we can fire opacity event with all layers.
                        all.push({layer:layer, l:l, opacity:opacity});

                        // Opacity slider change handler.
                        l.opacity.bind("slide",self.opacityHandler(layer, l));
                        l.opacity.slider("value",opacity);

                        // Close handler for x button fires a 'remove-layers' event.
                        l.close.click(
                            function(event) {
                                var params = {
                                      layers: [layer]
                                    },
                                    e = new mol.bus.Event('remove-layers', params);

                                self.bus.fireEvent(e);
                                l.remove();
                                // Hide the layer widge toggle in the main menu if no layers exist
                                if(self.map.overlayMapTypes.length == 0) {
                                    self.bus.fireEvent(new mol.bus.Event('hide-layer-display-toggle'));
                                }
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
                                    e = new mol.bus.Event('layer-zoom-extent', params),
                                    le = new mol.bus.Event('show-loading-indicator',{source : "map"});

                                self.bus.fireEvent(e);
                                self.bus.fireEvent(le);
                            }
                        );
                        // Click handler for info button fires 'layer-info'
                        // and 'show-loading-indicator' events.
                        l.info.click(
                            function(event) {
                                var params = {
                                        layer: layer,
                                        auto_bound: true
                                    },
                                    e = new mol.bus.Event('layer-info', params),
                                    le = new mol.bus.Event('show-loading-indicator',{source : "info"});

                                self.bus.fireEvent(e);
                                self.bus.fireEvent(le);
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
                            }
                        );
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

						          $(display.list).find('li').each(
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
                    '<li class="layerContainer">' +
                    '  <div class="layer widgetTheme">' +
                    '    <button class="source" title="Layer Source: {0}"><img src="/static/maps/search/{0}.png"></button>' +
                    '    <button class="type" title="Layer Type: {1}"><img src="/static/maps/search/{1}.png"></button>' +
                    '    <div class="layerName">' +
                    '        <div class="layerNomial" title="Common Names: {3}">{2}</div>' +
                    '    </div>' +
                    '    <button title="Remove layer." class="close">x</button>' +
                    '    <button title="Zoom to layer extent." class="zoom">z</button>' +
                    '    <button title="Layer metadata info." class="info">i</button>' +
                    '    <label class="buttonContainer"><input class="toggle" type="checkbox"><span title="Toggle layer visibility." class="customCheck"></span></label>' +
                    '    <div class="opacityContainer"><div class="opacity"/></div>' +
                    '  </div>' +
                    '</li>';

                this._super(html.format(layer.source, layer.type, layer.name, layer.englishname));
                this.attr('id', layer.id);
                this.opacity = $(this).find('.opacity').slider({value: 0.5, min: 0, max:1, step: 0.02, animate:"slow"});
                this.toggle = $(this).find('.toggle').button();
                this.zoom = $(this).find('.zoom');
                this.info = $(this).find('.info');
                this.close = $(this).find('.close');
                this.type = $(this).find('.type');
                this.source = $(this).find('.source');
            }
        }
    );

    mol.map.layers.LayerListDisplay = mol.mvp.View.extend(
        {
            init: function() {
                var html = '' +
                    '<div class="mol-LayerControl-Layers">' +
                    '   <div class="scrollContainer">' +
                    '      <ul id="sortable">' +
                    '      </ul>' +
                    '   </div>' +
                    '</div>';

                this._super(html);
                this.list = $(this).find("#sortable");
                this.open = false;
                this.views = {};
                this.layers = [];

            },

            getLayer: function(layer) {
                return $(this).find('#{0}'.format(layer.id));
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
                $(this).find('li').each(function(i, el) {
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
mol.modules.map.menu = function(mol) {

    mol.map.menu = {};

    mol.map.menu.MenuEngine = mol.mvp.Engine.extend(
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
                this.display = new mol.map.menu.MenuDisplay();
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

                this.display.dashboardItem.click(
                    function(event) {
                        self.bus.fireEvent(
                            new mol.bus.Event('taxonomy-dashboard-toggle'));
                    }
                );

                this.display.searchItem.click(
                    function(event) {
                        self.bus.fireEvent(
                            new mol.bus.Event('search-display-toggle'));
                    }
                );
                this.display.legendItem.click(
                    function(event) {
                        self.bus.fireEvent(
                            new mol.bus.Event('legend-display-toggle'));
                    }
                );
                this.display.speciesListItem.click(
                    function(event) {
                        self.bus.fireEvent(new mol.bus.Event('species-list-tool-toggle'));
                    }
                );
                this.display.layersToggle.click(
                    function(event) {
                        if(self.display.layersToggle[0].src.indexOf('collapse.png')>0)  {
                            self.bus.fireEvent(new mol.bus.Event('layer-display-toggle',{visible : false}));
                            self.display.layersToggle[0].src = '/static/maps/layers/expand.png';
                        } else {
                            self.bus.fireEvent(new mol.bus.Event('layer-display-toggle',{visible : true}));
                            self.display.layersToggle[0].src = '/static/maps/layers/collapse.png';
                        }
                    }
                );

                this.bus.addHandler(
                    'hide-layer-display-toggle',
                    function(event) {
                        self.display.layersToggle[0].style.visibility="hidden";
                    }
                );
                this.bus.addHandler(
                    'show-layer-display-toggle',
                    function(event) {
                        self.display.layersToggle[0].style.visibility="visible";
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
            },

            /**
             * Fires the 'add-map-control' event. The mol.map.MapEngine handles
             * this event and adds the display to the map.
             */
            fireEvents: function() {
                var params = {
                        display: this.display,
                        slot: mol.map.ControlDisplay.Slot.FIRST,
                        position: google.maps.ControlPosition.TOP_RIGHT
                    },
                    event = new mol.bus.Event('add-map-control', params);

                this.bus.fireEvent(event);
            }
        }
    );

    mol.map.menu.MenuDisplay = mol.mvp.View.extend(
        {
            init: function() {
                var html = '' +
                    '<div class="mol-LayerControl-Menu ">' +
                    '    <div class="label">' +
                    '       <img class="layersToggle" src="/static/maps/layers/collapse.png">' +
                    '    </div>' +
                    '    <div title="Toggle taxonomy dashboard." class="widgetTheme dashboard button">Dashboard</div>' +
                    '    <div title="Toggle layer search tools." class="widgetTheme search button">Search</div>' +
                    '    <div title="Toggle map legend." class="widgetTheme legend button">Legend</div>' +
                    '    <div title="Toggle species list radius tool (right-click to use)" class="widgetTheme list button">Species&nbsp;Lists</div>' +
                    '</div>' +
                    '<div class="mol-LayerControl-Layers">' +
                    /*'      <div class="staticLink widgetTheme" >' +
                    '          <input type="text" class="linkText" />' +
                    '      </div>' +*/
                    '   <div class="scrollContainer">' +
                    '   </div>' +
                    '</div>';

                this._super(html);
                this.searchItem = $(this).find('.search');
                this.legendItem = $(this).find('.legend');
                this.dashboardItem = $(this).find('.dashboard');
                this.speciesListItem = $(this).find('.list');
                this.layersToggle = $(this).find('.layersToggle');

            }
        }
    );
};



/**
 * This module provides support for rendering search results.
 */
mol.modules.map.results = function(mol) {

    mol.map.results = {};

    mol.map.results.ResultsEngine = mol.mvp.Engine.extend(
        {
            /**
             * @param bus mol.bus.Bus
             */
            init: function(proxy, bus) {
                this.proxy = proxy;
                this.bus = bus;
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

                /**
                 * Clicking the 'map selected layers' button fires an 'add-layers'
                 * event on the bus.
                 */
                this.display.addAllButton.click(
                    function(event) {
                        var checkedResults = self.display.getChecked(),
                        layers = _.map(
                            checkedResults,
                            function(result) {
                                var id = $(result).find('.result').attr('id');
                                return mol.core.getLayerFromId(id);
                            }
                        );

                        self.bus.fireEvent(
                            new mol.bus.Event(
                                'add-layers',
                                {
                                    layers: layers
                                }
                            )
                        );
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
                        if(self.results == undefined) {
                            self.display.toggle(false);
                        } else {
                            if (event.visible === undefined) {
                                self.display.toggle();
                            } else {
                                self.display.toggle(event.visible);
                            }
                        }
                    }
                );

                /**
                 * Callback that displays search results.
                 */
                this.bus.addHandler(
                    'search-results',
                    function(event) {
                        self.results = mol.services.cartodb.convert(event.response);
                        self.profile = new mol.map.results.SearchProfile(self.results);
                        if (self.getLayersWithIds(self.results.layers).length > 0) {
                            self.showFilters(self.profile);
                            self.showLayers(self.results.layers);
                        } else {
                            self.showNoResults();
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

                display.clearResults();

                // Set layer results in display.
                 _.each(
                    this.display.setResults(this.getLayersWithIds(layers)),
                    function(result) {
                    // TODO: Wire up results.
                    },
                    this
                  );
                this.display.noResults.hide();
                this.display.results.show();
                this.display.toggle(true);
            },
            /*
             * Displays a message when no results are returned from the search query.
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

            showFilters: function(profile) {
                var display = this.display,
                layerNames = profile.getKeys('names'),
                sourceNames = profile.getKeys('sources'),
                typeNames = profile.getKeys('types');

                display.clearFilters();

                // Set name options in display.
                _.each(
                    display.setOptions('Names', layerNames),
                    function (option) {
                        option.click(this.optionClickCallback(option, 'Names'));
                    },
                    this
                );

                // Set source options in display.
                _.each(
                    display.setOptions('Sources', sourceNames),
                    function (option) {
                        option.click(this.optionClickCallback(option, 'Sources'));
                    },
                    this
                );

                // Set type options in display.
                _.each(
                    display.setOptions('Types', typeNames),
                    function (option) {
                        option.click(this.optionClickCallback(option, 'Types'));
                    },
                    this
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
                    self.display.clearOptionSelections(filterName);
                    option.addClass('selected');
                    self.updateDisplay();
                };
            },

            /**
             * When a filter is clicked, the search display results are
             * dynamically updated to match name, source, and type. This
             * is the function that makes that happen. It calculates the
             * new layers (results) that are viewable and calls the
             * handleResults() function.
             *
             */
            updateDisplay: function() {
                var name = this.display.getOptions('Names', true)[0].attr('id'),
                source = this.display.getOptions('Sources', true)[0].attr('id'),
                type = this.display.getOptions('Types', true)[0].attr('id'),
                layers = this.profile.getNewLayers(
                    name !== 'All' ? name : null,
                    source !== 'All' ? source : null,
                    type !== 'All'? type : null);

                this.showLayers(layers);
            }
        }
    );

    /**
     * The main display for search results. Contains a search box, a search
     * results list, and search result filters. This is the thing that gets
     * added to the map as a control.
     */
    mol.map.results.ResultsDisplay = mol.mvp.View.extend(
        {
            init: function() {
                var html = '' +
                    '<div class="mol-LayerControl-Results">' +
                    '  <div class="filters"></div>' +
                    '  <div class="searchResults widgetTheme">' +
                    '    <div class="results">' +
                    '      <div class="resultHeader">' +
                    '         Results' +
                    '         <a href="#" class="selectNone">none</a>' +
                    '         <a href="#" class="selectAll">all</a>' +
                    '      </div>' +
                    '      <ol class="resultList"></ol>' +
                    '      <div class="pageNavigation">' +
                    '         <button class="addAll">Map Selected Layers</button>' +
                    '      </div>' +
                    '    </div>' +
                    '    <div class="noresults">' +
                    '      <h3>No results found.</h3>' +
                    '    </div>' +
                    '  </div>' +
                    '</div>';

                this._super(html);
                this.resultList = $(this).find('.resultList');
                this.filters = $(this).find('.filters');
                this.selectAllLink = $(this).find('.selectAll');
                this.selectNoneLink = $(this).find('.selectNone');
                this.addAllButton = $(this).find('.addAll');
                this.results = $(this).find('.results');
                this.noResults = $(this).find('.noresults');
            },

            clearResults: function() {
                this.resultList.html('');
            },

            clearFilters: function() {
                this.filters.html('');
            },

            /**
             * Makes all options for a filter unselected.
             */
            clearOptionSelections: function(filterName) {
                _.each(
                    this.getOptions(filterName),
                    function(option) {
                        option.removeClass('selected').addClass('option');
                    }
                );
            },

            toggleSelections: function(showOrHide) {
                $('.checkbox').each(
                    function() {
                        $(this).attr('checked', showOrHide);
                    }
                );
            },

            /**
             * Returns an array of jquery result objects that are checked.
             */
            getChecked: function() {
                var checked = _.filter(
                    this.resultList.children(),
                    function(result) {
                        if ($(result).find('.checkbox').attr('checked')) {
                            return true;
                        } else {
                            return false;
                        }
                    },
                    this
                );

                return _.map(
                    checked,
                    function(result) {
                        return $(result);
                    }
                );
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
                        var id = layer.id,
                            name = layer.name,
                            source = layer.source,
                            type = layer.type,
                            englishname = layer.englishname,
                            result = new mol.map.results.ResultDisplay(name, id, source, type, englishname);

                        this.resultList.append(result);
                        return result;
                    },
                    this
                );
            },

            /**
             * Sets the options for a filter and returns the options as an array
             * of JQuery objects.
             */
            setOptions: function(filterName, optionNames) {
                var self = this,
                filter = new mol.map.results.FilterDisplay(filterName),
                options =  _.map(
                    optionNames,
                    function(name) {
                        var option = new mol.map.results.OptionDisplay(name);
                        filter.options.append(option);
                        return option;
                    }
                );

                filter.attr('id', filterName);
                this.filters.append(filter);
                return _.union([filter.allOption], options);
            },

            /**
             * Returns an array of filter options as JQuery objects. If
             * selected is true, only returns options that are selected.
             */
            getOptions: function(filterName, selected) {
                var filter = this.filters.find('#{0}'.format(filterName)),
                options =  _.filter(
                    filter.find('.option'),
                    function(option) {
                        var opt = $(option);

                        if (!selected) {
                            return true;
                        } else if (opt.hasClass('selected')) {
                            return true;
                        } else {
                            return false;
                        }
                    }
                );

                return _.map(
                    options,
                    function(option) {
                        return $(option);
                    }
                );
            }
        }
    );
    /**
     * The display for a single search result that lives in the result list.
     *
     * @param parent the .resultList element in search display
     */
    mol.map.results.ResultDisplay = mol.mvp.View.extend(
        {
            init: function(name, id, source, type, englishname) {
                var html = '' +
                    '<div>' +
                    '<ul id="{0}" class="result">' +
                    '<div class="resultSource"><button><img class="source" title="Layer Source: {2}" src="/static/maps/search/{2}.png"></button></div>' +
                    '<div class="resultType" ><button ><img class="type" title="Layer Type: {3}" src="/static/maps/search/{3}.png"></button></div>' +
                    '<div class="resultName">' +
                    '  <div class="resultNomial">{1}</div>' +
                    '  <div class="resultEnglishName" title="{4}">{4}</div>' +
                    '  <div class="resultAuthor"></div>' +
                    '</div>' +
                    '<label class="buttonContainer">' +
                    '   <input type="checkbox" class="checkbox" />' +
                    '   <span class="customCheck"></span>' +
                    '</label> ' +
                    '</ul>' +
                    '<div class="break"></div>' +
                    '</div>';

                this._super(html.format(id, name, source, type, englishname));

                this.infoLink = $(this).find('.info');
                this.nameBox = $(this).find('.resultName');
                this.sourcePng = $(this).find('.source');
                this.typePng = $(this).find('.type');
                this.checkbox = $(this).find('.checkbox').button();
            }
        }
    );

    /**
     * The display for a single search result filter. Allows you to select a name,
     * source, or type and see only matching search results.
     */
    mol.map.results.FilterDisplay = mol.mvp.View.extend(
        {
            init: function(name) {
                var html = '' +
                    '<div class="filter widgetTheme">' +
                    '    <div class="filterName">{0}</div>' +
                    '    <div class="options"></div>' +
                    '</div>';

                this._super(html.format(name));
                this.name = $(this).find('.filterName');
                this.options = $(this).find('.options');
                this.allOption = new mol.map.results.OptionDisplay('All');
                this.allOption.addClass('selected');
                this.options.append(this.allOption);
            }
        }
    );

    mol.map.results.OptionDisplay = mol.mvp.View.extend(
        {
            init: function(name) {
                this._super('<div id="{0}" class="option">{0}</div>'.format(name, name));
            }
        }
    );


    /**
     * This class supports dynamic search result filtering. You give it a name,
     * source, type, and search profile, and you get back all matching results
     * that satisfy those constraints. This is the thing that allows you to
     * click on a name, source, or type and only see those results.
     *
     * TODO: This could use a refactor. Lot's of duplicate code.
     */
    mol.map.results.SearchProfile = Class.extend(
        {
            init: function(response) {
                this.response = response;
            },

            /**
             * Gets layer names that satisfy a name, source, and type combined
             * constraint.
             *
             * @param name the layer name
             * @param source the layer source
             * @param type the layer type
             * @param profile the profile to test
             *
             */
            getNewLayers: function(name, source, type, englishname, profile) {
                var layers = this.getLayers(name, source, type, englishname, profile);

                return _.map(
                    layers,
                    function(layer) {
                        return this.getLayer(parseInt(layer));
                    },
                    this
                );
            },

            getLayers: function(name, source, type, englishname, profile) {
                var response = this.response,
                currentProfile = profile ? profile : 'nameProfile',
                nameProfile = name ? response.names[name] : null,
                sourceProfile = source ? response.sources[source] : null,
                typeProfile = type ? response.types[type] : null,
                englishnameProfile = englishname ? response.englishnames[englishname] : null,
                profileSatisfied = false;

                if (!name && !type && !source && !englishname){
                    var keys = new Array();
                    for (i in response.layers) {
                        keys.push(i);
                    };
                    return keys;
                }

                switch (currentProfile) {

                case 'nameProfile':
                    if (!name) {
                        return this.getLayers(name, source, type, englishname, 'sourceProfile');
                    }

                    if (nameProfile) {
                        if (!source && !type) {
                            return nameProfile.layers;
                        }
                        if (source && type) {
                            if (this.exists(source, nameProfile.sources) &&
                                this.exists(type, nameProfile.types)) {
                                return _.intersect(
                                    nameProfile.layers,
                                    this.getLayers(name, source, type, englishname, 'sourceProfile'));
                            }
                        }
                        if (source && !type) {
                            if (this.exists(source, nameProfile.sources)) {
                                return _.intersect(
                                    nameProfile.layers,
                                    this.getLayers(name, source, type, englishname, 'sourceProfile'));
                            }
                        }
                        if (!source && type) {
                            if (this.exists(type, nameProfile.types)) {
                                return _.intersect(
                                    nameProfile.layers,
                                    this.getLayers(name, source, type, englishname, 'typeProfile'));
                            }
                        }
                    }
                    return [];

                case 'sourceProfile':
                    if (!source) {
                        return this.getLayers(name, source, type, englishname,'typeProfile');
                    }

                    if (sourceProfile) {
                        if (!name && !type) {
                            return sourceProfile.layers;
                        }
                        if (name && type) {
                            if (this.exists(name, sourceProfile.names) &&
                                this.exists(type, sourceProfile.types)) {
                                return _.intersect(
                                    sourceProfile.layers,
                                    this.getLayers(name, source, type, englishname,'typeProfile'));
                            }
                        }
                        if (name && !type) {
                            if (this.exists(name, sourceProfile.names)) {
                                return sourceProfile.layers;
                            }
                        }
                        if (!name && type) {
                            if (this.exists(type, sourceProfile.types)) {
                                return _.intersect(
                                    sourceProfile.layers,
                                    this.getLayers(name, source, type, englishname, 'typeProfile'));
                            }
                        }
                    }
                    return [];
                /*TODO englishname profile */

                case 'typeProfile':
                    if (!type) {
                        return [];
                    }

                    if (typeProfile) {
                        if (!name && !source) {
                            return typeProfile.layers;
                        }
                        if (name && source) {
                            if ( this.exists(name, typeProfile.names) &&
                                 this.exists(source, typeProfile.sources)) {
                                return typeProfile.layers;
                            }
                        }
                        if (name && !source) {
                            if (this.exists(name, typeProfile.names)) {
                                return typeProfile.layers;
                            }
                        }
                        if (!name && source) {
                            if (this.exists(source, typeProfile.sources)) {
                                return typeProfile.layers;
                            }
                        }
                    }
                    return [];

                }
                return [];
            },

            getLayer: function(layer) {
                return this.response.layers[layer];
            },

            getKeys: function(id) {
                var res;
                switch(id.toLowerCase()){
                case "types":
                    res = this.response.types;
                    break;
                case "sources":
                    res = this.response.sources;
                    break;
                case "names":
                    res = this.response.names;
                    break;
                case "englishnames":
                    res = this.response.englishnames;
                    break;
                }
                return _.keys(res);
            },

            getTypeKeys: function() {
                var x = this.typeKeys,
                types = this.response.types;
                return x ? x : (this.typeKeys = _.keys(types));
            },

            getType: function(type) {
                return this.response.types[type];
            },

            getSourceKeys: function() {
                var x = this.sourceKeys,
                sources = this.response.sources;
                return x ? x : (this.sourceKeys = _.keys(sources));
            },

            getSource: function(source) {
                return this.response.sources[source];
            },

            getNameKeys: function() {
                var x = this.nameKeys,
                names = this.response.names;
                return x ? x : (this.nameKeys = _.keys(names));
            },

            getName: function(name) {
                return this.response.names[name];
            },
            getEnglishNameKeys: function() {
                var x = this.englishnameKeys,
                englishnames = this.response.englishnames;
                return x ? x : (this.englishnameKeys = _.keys(englishnames));
            },

            getEnglishName: function(englishname) {
                return this.response.englishnames[englishname];
            },
            /**
             * Returns true if the name exists in the array, false otherwise.
             */
            exists: function(name, array) {
                return _.indexOf(array, name) != -1;
            }
        }
    );
};
mol.modules.map.search = function(mol) {

    mol.map.search = {};

    mol.map.search.SearchEngine = mol.mvp.Engine.extend(
        {
            /**
             * @param bus mol.bus.Bus
             */
            init: function(proxy, bus) {
                this.proxy = proxy;
                this.bus = bus;
                this.sql = '' +
                    'SELECT ' +
                    'provider as source, scientificname as name, type as type, englishname ' +
                    'FROM scientificnames s ' +
                    'LEFT JOIN (' +
                    '   SELECT ' +
                    '   scientific, initcap(lower(array_to_string(array_sort(array_agg(common_names_eng)),\', \'))) as englishname ' +
                    '   FROM master_taxonomy ' +
                    '   GROUP BY scientific ' +
                    ') n '+
                    'ON s.scientificname = n.scientific ' +
                    'WHERE scientificname = \'{0}\'';
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

                // http://stackoverflow.com/questions/2435964/jqueryui-how-can-i-custom-format-the-autocomplete-plug-in-results
                $.ui.autocomplete.prototype._renderItem = function (ul, item) {
                    var val = item.label.split(':'),
                        name = val[0],
                        kind = val[1],
                        eng = '<a>{0}</a>'.format(name),
                        sci = '<a><i>{0}</i></a>'.format(name);

                    item.label = kind === 'sci' ? sci : eng;
                    item.value = name;
                    if(kind == 'sci') {
                        item.type = 'scientificname';
                    } else {
                        item.type =  'vernacularname';
                    }

                    item.label = item.label.replace(
                        new RegExp("(?![^&;]+;)(?!<[^<>]*)(" +
                                   $.ui.autocomplete.escapeRegex(this.term) +
                                   ")(?![^<>]*>)(?![^&;]+;)", "gi"), "<strong>$1</strong>");
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
                $(this.display.searchBox).autocomplete(
                    {
                        minLength: 3, // Note: Auto-complete indexes are min length 3.
                        delay: 0,
                        source: function(request, response) {
                            $.getJSON(
                                'api/autocomplete',
                                {
                                    key: 'acn-{0}'.format(request.term)
                                },
                                function(names) {
                                    response(
                                        _.sortBy(names,  // Alphabetical sort on auto-complete results.
                                                 function(x) {
                                                     return x;
                                                 })
                                    );
                                }
                            );
                        },
                        select: function(event, ui) {
                            $(this).autocomplete("close");
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
                        var params = {},
                            e = null;

                        if (event.visible === undefined) {
                            self.display.toggle();
                            params = {visible: self.display.is(':visible')};
                        } else {
                            self.display.toggle(event.visible);
                        }

                        e = new mol.bus.Event('results-display-toggle', params);
                        self.bus.fireEvent(e);
                    }
                );
                this.bus.addHandler(
                    'search',
                    function(event) {
                        if (event.term != undefined) {
                            if(!self.display.is(':visible')) {
                                self.bus.fireEvent(new mol.bus.Event('search-display-toggle',{visible : true}));
                            }
                            self.search(event.term);

                            if(self.display.searchBox.val()=='') {
                                self.display.searchBox.val(event.term)
                            }

                        }
                   }
               );
                /**
                 * Clicking the go button executes a search.
                 */
                this.display.goButton.click(
                    function(event) {
                        $(self.display).autocomplete("close");
						      self.search(self.display.searchBox.val());
                    }
                );

                /**
                 * Clicking the cancel button hides the search display and fires
                 * a cancel-search event on the bus.
                 */
                this.display.cancelButton.click(
                    function(event) {
                        var params = {
                            visible: false
                        };

                        self.display.toggle(false);
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
                        self.display.goButton.click();
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
             * Searches CartoDB via proxy using a term from the search box. Fires
             * a search event on the bus. The success callback fires a search-results
             * event on the bus.
             *
             * @param term the search term (scientific name)
             */
            search: function(term) {
                var self = this,
                    sql = this.sql.format(term),
                    params = {sql:sql, key: 'acr-{0}'.format(term)},
                    action = new mol.services.Action('cartodb-sql-query', params),
                    success = function(action, response) {
                        var results = {term:term, response:response},
                            event = new mol.bus.Event('search-results', results);
                        self.bus.fireEvent(new mol.bus.Event('hide-loading-indicator', {source : "search"}));
                        self.bus.fireEvent(event);
                    },
                    failure = function(action, response) {
                        self.bus.fireEvent(new mol.bus.Event('hide-loading-indicator', {source : "search"}));
                    };
                self.bus.fireEvent(new mol.bus.Event('show-loading-indicator', {source : "search"}));
                this.proxy.execute(action, new mol.services.Callback(success, failure));
                //this.bus.fireEvent('search', new mol.bus.Event('search', term));
            }
        }
    );

    mol.map.search.SearchDisplay = mol.mvp.View.extend(
        {
            init: function() {
                var html = '' +
                    '<div class="mol-LayerControl-Search widgetTheme">' +
                    '    <div class="title ui-autocomplete-input">Search:</div>' +
                    '    <input class="value" type="text" placeholder="Search by name">' +
                    '    <button class="execute">Go</button>' +
                    '    <button class="cancel">&nbsp;</button>' +
                    '</div>';

                this._super(html);
                this.goButton = $(this).find('.execute');
                this.cancelButton = $(this).find('.cancel');
                this.searchBox = $(this).find('.value');
            },

            clear: function() {
                this.searchBox.html('');
            }
        }
    );
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
    mol.map.tiles.TileEngine = mol.mvp.Engine.extend(
        {
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
                 *  The event.layer is a layer object {id, name, type, source}. event.showing
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
                                function(maptype, index) {
                                    if ((maptype != undefined) && (maptype.name === layer.id)) {
                                        params = {
                                            layer: layer
                                        };
                                        e = new mol.bus.Event('layer-opacity', params);
                                        self.bus.fireEvent(e);
                                        maptype.interaction.add();
                                        return;
                                    }
                                }
                            );
                            //self.renderTiles([layer]);
                        } else { // Remove layer from map.
                            self.map.overlayMapTypes.forEach(
                                function(maptype, index) {
                                    if ((maptype != undefined) && (maptype.name === layer.id)) {
                                        params = {
                                            layer: layer,
                                            opacity: 0
                                        };
                                        e = new mol.bus.Event('layer-opacity', params);
                                        self.bus.fireEvent(e);
                                        maptype.interaction.remove();
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
                                    function(mt, index) { // "mt" is short for map type.
                                        if ((mt != undefined) && (mt.name === lid)) {
                                            mapTypes.removeAt(index);
                                            mt.interaction.remove();
                                        }
                                    }
                                );
                            }
                        );
                    }
                );

				    /**
				     * Handler for when the reorder-layers event is fired. This renders
				     * the layers according to the list of layers provided
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
									         function(mt, index) { // "mt" is short for maptype.
										          if ((mt != undefined) && (mt.name === lid)) {
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
             * Renders an array a tile layers by firing add-map-overlays event
             * on the bus.
             *
             * @param layers the array of layer objects {name, type}
             */
            renderTiles: function(layers) {
                var tiles = [],
                    overlays = this.map.overlayMapTypes.getArray(),
                    newLayers = this.filterLayers(layers, overlays),
                    self = this;

                _.each(
                    newLayers,
                    function(layer) {
                        tiles.push(self.getTile(layer, self.map));
                        self.bus.fireEvent(new mol.bus.Event("show-loading-indicator",{source : "overlays"}));

                        $("img",self.map.overlayMapTypes).imagesLoaded(
                            function(images, proper, broken) {
                                self.bus.fireEvent(new mol.bus.Event("hide-loading-indicator", {source : "overlays"}));
                            }
                         );
                    },
                    self
                );
            },
            /**
             * Returns an array of layer objects that are not already on the map.
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
                var name = layer.name,
                    type = layer.type,
                    tile = null;

                switch (type) {
                case 'points':
                    new mol.map.tiles.CartoDbTile(layer, 'gbif_import', this.map);
                    break;
                case 'polygon':
                case 'range':
                case 'ecoregion':
                case 'protectedarea':
                    new mol.map.tiles.CartoDbTile(layer, 'polygons', this.map);
                    break;
                }
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
                this.proxy.execute(action, new mol.services.Callback(success, failure));
		      }
        }
	 );

    mol.map.tiles.CartoDbTile = Class.extend(
        {
            init: function(layer, table, map) {
                var sql =  "SELECT * FROM {0} where scientificname = '{1}' and type='{2}'",
                    opacity = layer.opacity && table !== 'points' ? layer.opacity : null,
                    tile_style = opacity ? "#{0}{polygon-fill:#99cc00;}".format(table, opacity) : null,
                    hostname = window.location.hostname,
                    style_table_name = table,
                    info_query = sql;
                    tile_style =  null,
                    hostname = window.location.hostname;

                if (layer.type === 'points') {
                    sql = "SELECT cartodb_id, st_transform(the_geom, 3785) AS the_geom_webmercator, identifier " +
                        "FROM {0} WHERE lower(scientificname)='{1}'".format("gbif_import", layer.name.toLowerCase());
                    table = 'gbif_import';
                    style_table_name = 'names_old';
                    info_query = "SELECT cartodb_id, st_transform(the_geom, 3785) AS the_geom_webmercator, \'GBIF\' AS source, \'point\' AS type, CONCAT(\'<a href=\"\',(\'http://data.gbif.org/ws/rest/occurrence/get/\',identifier),\'\">\',identifier),\'</a>\') AS 'GBIF_Occurence_ID', scientificname AS \'name\' FROM {0} WHERE lower(scientificname)='{1}'".format("gbif_import", layer.name.toLowerCase());
                } else {
                    sql = sql.format(table, layer.name, layer.type);
                    info_query = sql;
                }

                hostname = (hostname === 'localhost') ? '{0}:8080'.format(hostname) : hostname;

                this.layer = new google.maps.CartoDBLayer(
                    {
                        tile_name: layer.id,
                        hostname: hostname,
                        map_canvas: 'map_container',
                        map: map,
                        user_name: 'mol',
                        table_name: table,
                        style_table_name: style_table_name,
                        query: sql,
                        info_query: info_query,
                        tile_style: tile_style,
                        map_style: false,
                        infowindow: true,
                        opacity: 0.5
                    }
                );
            }
        }
    );
};
mol.modules.map.dashboard = function(mol) {

    mol.map.dashboard = {};

    mol.map.dashboard.DashboardEngine = mol.mvp.Engine.extend(
        {
            init: function(proxy, bus) {
                this.proxy = proxy;
                this.bus = bus;
                this.sql = '';
//Here is the sql to use for polygon dash requests.
/*SELECT s.provider as provider, s.type as type, num_species, num_records, s.class FROM
    (SELECT provider, type, count(*) as num_species, class
        FROM
        (SELECT DISTINCT scientificname, provider, type from gbif_import) p,
        (SELECT DISTINCT scientific, class from master_taxonomy) t
    WHERE p.scientificname = t.scientific
    GROUP BY provider, type, class
        ) s,
    (SELECT provider, type, count(*) as num_records, class
    FROM
        (SELECT scientificname, provider, type from gbif_import) pr,
        (SELECT DISTINCT scientific, class from master_taxonomy) tr
    WHERE pr.scientificname = tr.scientific
    GROUP BY provider, type, class
        ) r
 WHERE
    r.provider = s.provider and r.type = s.type and r.class = s.class;
*/            },

            /**
             * Starts the MenuEngine. Note that the container parameter is
             * ignored.
             */
            start: function() {
                this.display = new mol.map.dashboard.DashboardDisplay();
                this.initDialog();
                this.addEventHandlers();
            },

            /**
             * Adds a handler for the 'search-display-toggle' event which
             * controls display visibility. Also adds UI event handlers for the
             * display.
             */
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
                            self.display.dialog('open');
                        } else {
                            self.display.dialog(event.state);
                        }
                    }
                );
            },

            /**
             * Fires the 'add-map-control' event. The mol.map.MapEngine handles
             * this event and adds the display to the map.
             */
            initDialog: function() {
                this.display.dialog(
                    {
                        autoOpen: false,
					    width: 1000,
					    dialogClass: "mol-Dashboard"
                    }
                );
            }
        }
    );

    mol.map.dashboard.DashboardDisplay = mol.mvp.View.extend(
        {
            init: function() {
                var html = '' +
                    '<div id="dialog">' +
                    '  <div class="dashboard">' +
                    '  <div class="title">Dashboard</div>' +
                    '  <div class="subtitle">Statistics for data served by the Map of Life</div>' +
                    '  <table>' +
                    '    <tr>' +
                    '      <td width="50px"><b>Type</b></td>' +
                    '      <td width="100px"><b>Source</b></td>' +
                    '      <td><b>Amphibians</b></td>' +
                    '      <td><b>Birds</b></td>' +
                    '      <td><b>Mammals</b></td>' +
                    '      <td><b>Reptiles</b></td>' +
                    '      <td><b>Fish</b></td>' +
                    '    </tr>' +
                    '    <tr>' +
                    '      <td>Points</td>' +
                    '      <td>GBIF</td>' +
                    '      <td>5,662 species names with 1,794,441 records</td>' +
                    '      <td>13,000 species names with 132,412,174 records</td>' +
                    '      <td>14,095 species names with 4,351,065 records</td>' +
                    '      <td>11,445 species names with 1,695,170 records</td>' +
                    '      <td></td>' +
                    '   <tr>' +
                    '       <td>Expert maps</td>' +
                    '       <td>User-uploaded</td>' +
                    '       <td></td>' +
                    '       <td>Jetz et al. 2012: 9,869 species with 28,019 records</td>' +
                    '       <td></td>' +
                    '       <td></td>' +
                    '       <td>Page and Burr, 2011: 723 species with 9,755 records</td>' +
                    '   </tr>' +
                    '   <tr>' +
                    '       <td>Expert maps</td>' +
                    '       <td>IUCN</td>' +
                    '       <td>5,966 species with 18,852 records</td>' +
                    '       <td></td>' +
                    '       <td>4,081 species with 38,673 records</td>' +
                    '       <td></td>' +
                    '       <td></td>' +
                    '   </tr>' +
                    '   <tr>' +
                    '       <td>Local Inventories</td>' +
                    '       <td>Misc. sources</td>' +
                    '       <td>727 species with 1,820 records</td>' +
                    '       <td>4,042 species with 48,000 records</td>' +
                    '       <td>1,411 species with 9,895 records</td>' +
                    '       <td></td>' +
                    '       <td></td>' +
                    '   </tr>' +
                    '   <tr>' +
                    '       <td>Regional checklists</td>' +
                    '       <td>WWF</td>' +
                    '       <td>3,081 species with 12,296 records</td>' +
                    '       <td>8,755 species with 201,418 records</td>' +
                    '       <td>4,224 species with 67,533 records</td>' +
                    '       <td>6,830 species with 67,533 records</td>' +
                    '       <td></td>' +
                    '   </tr>' +
                    '  </table>' +
                    '</div>  ';

                this._super(html);

            }
        }
    );
};



mol.modules.map.query = function(mol) {

    mol.map.query = {};

    mol.map.query.QueryEngine = mol.mvp.Engine.extend(
    {
        init : function(proxy, bus, map) {
                this.proxy = proxy;
                this.bus = bus;
                this.map = map;
                this.sql = "" +
                        "SELECT DISTINCT "+
                        "   p.scientificname as scientificname, "+
                        "   t.common_names_eng as english, "+
                        "   initcap(lower(t._order)) as order, " +
                        "   initcap(lower(t.Family)) as family, " +
                        "   t.red_list_status as redlist, " +
                        "   initcap(lower(t.class)) as className, " +
                        "   p.type as type, " +
                        "   p.provider as provider, " +
                        "   t.year_assessed as year_assessed " +
                        "FROM {3} p " +
                        "LEFT JOIN (SELECT scientific, " +
                        "                  string_agg(common_names_eng, ',')  as common_names_eng, " + //using string_agg in case there are duplicates
                        "                  MIN(class) as class, " + //these should be the same, even if there are duplicates
                        "                  MIN(_order) as _order, " +
                        "                  MIN(family) as family, " +
                        "                  string_agg(red_list_status,',') as red_list_status, " +
                        "                  string_agg(year_assessed,',') as year_assessed " +
                        "           FROM master_taxonomy WHERE " +
                        "                  infraspecific_name = '' " + //dont want subspecies
                        "           GROUP BY scientific ) t " +
                        "ON p.scientificname = t.scientific " +
                        "WHERE " +
                        "   ST_DWithin(p.the_geom_webmercator,ST_Transform(ST_PointFromText('POINT({0})',4326),3857),{1}) " + //radius test
                        "   {2} " + //other constraints
                        "ORDER BY \"order\", scientificname";

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
                    slot: mol.map.ControlDisplay.Slot.BOTTOM,
                    position: google.maps.ControlPosition.RIGHT_BOTTOM
                 };
                this.bus.fireEvent(new mol.bus.Event('register-list-click'));
                this.enabled=true;
                this.features={};
                this.display = new mol.map.QueryDisplay();
                params.display = this.display;
                this.bus.fireEvent( new mol.bus.Event('add-map-control', params));
        },
        getList: function(lat, lng, listradius, constraints, className, typeName) {
                var self = this,
                    sql = this.sql.format((lng+' '+lat), listradius.radius, constraints, (typeName == 'Point records') ? 'gbif_import' : 'polygons'),
                    params = {sql:sql, key: '{0}'.format((lat+'-'+lng+'-'+listradius.radius+constraints))},
                    action = new mol.services.Action('cartodb-sql-query', params),
                    success = function(action, response) {
                        var results = {listradius:listradius, className : className, typeName : typeName, constraints: constraints, response:response},
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
                    var listradius,
                        constraints = $(self.display.classInput).val() + $(self.display.typeInput).val(),
                        className =  $("option:selected", $(self.display.classInput)).text(),
                        typeName = $("option:selected", $(self.display.typeInput)).text();

                    if (self.enabled) {
                        listradius = new google.maps.Circle(
                            {
                                map: event.map,
                                radius: parseInt(self.display.radiusInput.val())*1000, // 50 km
                                center: event.gmaps_event.latLng,
                                strokeWeight: 0,
                                clickable:false
                            }
                        );
                        self.bus.fireEvent( new mol.bus.Event('show-loading-indicator', {source : 'listradius'}));
                        self.getList(event.gmaps_event.latLng.lat(),event.gmaps_event.latLng.lng(),listradius, constraints, className, typeName);
                    }
                 }
            );
             this.bus.addHandler(
                'species-list-query-results',
                function (event) {
                    var content,
                        listradius  = event.listradius,
                        className,
                        typeName,
                        typeStr,
                        tablerows = [],
                        providers = [],
                        scientificnames = {},
                        years = [],
                        infoWindow,
                        latHem,
                        lngHem,
                        height,
                        redlistCt = {},
                        speciestotal = 0,
                        speciesthreatened = 0,
                        speciesdd = 0;

                    if(!event.response.error) {
                            className = event.className,
                            typeName = event.typeName,
                            typeStr = '';

                        typeStr = typeName.replace(/maps/i, '').toLowerCase() + ' maps ';
                        latHem = (listradius.center.lat() > 0) ? 'N' : 'S';
                        lngHem = (listradius.center.lng() > 0) ? 'E' : 'W';



                        _.each(
                           event.response.rows,
                            function(row) {
                                    var english = (row.english != null) ? _.uniq(row.english.split(',')).join(',') : '',
                                        year = (row.year_assessed != null) ? _.uniq(row.year_assessed.split(',')).join(',') : '',
                                        redlist = (row.redlist != null) ? _.uniq(row.redlist.split(',')).join(',') : '';

                                    tablerows.push("<tr><td><button value='"+row.scientificname+"'>map</button></td>" +
                                        "<td class='wiki'>" +
                                        row.scientificname + "</td><td class='wiki english'>" +
                                        english + "</td><td class='wiki'>" +
                                        row.order + "</td><td class='wiki'>" +
                                        row.family + "</td><td class='iucn' data-scientificname='"+row.scientificname+"'>" +
                                        row.redlist + "</td></tr>");
                                    providers.push(row.type.charAt(0).toUpperCase()+row.type.substr(1,row.type.length) + ' maps/' + row.provider);
                                    if (year != null && year != '') {
                                        years.push(year)
                                    }
                                    scientificnames[row.scientificname]=redlist;
                            }
                        );

                        tablerows = _.uniq(tablerows);
                        providers = _.uniq(providers);

                        years = _.sortBy(_.uniq(years), function(val) {return val});
                        years[years.length-1] = (years.length > 1) ? ' and '+years[years.length-1] : years[years.length-1];

                        _.each(
                            scientificnames,
                            function(red_list_status) {
                                speciestotal++;
                                speciesthreatened += ((red_list_status.indexOf('RN')>=0) || (red_list_status.indexOf('VU')>=0) || (red_list_status.indexOf('CR')>=0) )  ? 1 : 0;
                                speciesdd += (red_list_status.indexOf('DD')>0)  ? 1 : 0;
                            }
                        )

                        height = (90 + 22*speciestotal < 450) ? 90 + 22*speciestotal : 450;

                        stats = (speciesthreatened > 0) ? ('('+speciesthreatened+' considered threatened by <a href="http://www.iucnredlist.org" target="_iucn">IUCN</a> '+years.join(',')+')') : '';

                        if(speciestotal>0) {
                            content=$('<div class="mol-Map-ListQueryInfoWindow" style="height:'+ height+'px">' +
                                    '   <div>' +
                                    '       <b>' +
                                            className + ' species ' +
                                    '       </b>' +
                                            listradius.radius/1000 + ' km around ' +
                                            Math.abs(Math.round(listradius.center.lat()*1000)/1000) + '&deg;&nbsp;' + latHem + '&nbsp;' +
                                            Math.abs(Math.round(listradius.center.lng()*1000)/1000) + '&deg;&nbsp;' + lngHem + ':<br>' +
                                            speciestotal + ' '+
                                            stats +
                                           '<br>' +
                                           'Data type/source:&nbsp;' + providers.join(', ') +
                                    '   </div> ' +
                                    '   <div> ' +
                                    '       <table class="tablesorter">' +
                                    '           <thead><tr><th></th><th>Scientific Name</th><th>English Name</th><th>Order</th><th>Family</th><th>IUCN&nbsp;&nbsp;</th></tr></thead>' +
                                    '           <tbody>' +
                                                    tablerows.join('') +
                                    '           </tbody>' +
                                    '       </table>' +
                                    '   </div>' +
                                    '</div>');
                        } else {
                            content = $('<div class="mol-Map-ListQueryEmptyInfoWindow">' +
                                    '       <b>' +
                                    '        No ' + className.replace(/All/g, '') + ' species found within ' +
                                            listradius.radius/1000 + ' km of ' +
                                            Math.abs(Math.round(listradius.center.lat()*1000)/1000) + '&deg;&nbsp;' + latHem + '&nbsp;' +
                                            Math.abs(Math.round(listradius.center.lng()*1000)/1000) + '&deg;&nbsp;' + lngHem +
                                    '       </b>' +
                                    '   </div>');
                        }

                        infoWindow= new google.maps.InfoWindow( {
                            content: content[0],
                            position: listradius.center
                        });

                        self.features[listradius.center.toString()+listradius.radius] = {
                             listradius : listradius,
                             infoWindow : infoWindow
                        };

                        google.maps.event.addListener(
                            infoWindow,
                            "closeclick",
                            function (event) {
                                listradius.setMap(null);
                                delete(self.features[listradius.center.toString()+listradius.radius]);
                            }
                         );
                         self.features[listradius.center.toString()+listradius.radius] = {
                             listradius : listradius,
                             infoWindow : infoWindow
                         };

                        infoWindow.open(self.map);
                        //infoWindow.setSize(new google.maps.Size(height+200), 650)
                        $(".tablesorter", $(infoWindow.content)
                         ).tablesorter({ headers: { 0: { sorter: false}}, widthFixed: true}
                         );

                         _.each(
                             $('button',$(infoWindow.content)),
                             function(button) {
                                 $(button).click(
                                     function(event) {
                                        self.bus.fireEvent(new mol.bus.Event('search',{term:$(button).val()}));
                                    }
                                 );
                             }
                         );
                         _.each(
                             $('.wiki',$(infoWindow.content)),
                             function(wiki) {
                                 $(wiki).click(
                                     function(event) {
                                        var win = window.open('http://en.wikipedia.com/wiki/'+$(this).text().split(',')[0].replace(/ /g, '_'));
                                        win.focus();
                                    }
                                 );
                             }
                         );
                         _.each(
                             $('.iucn',$(infoWindow.content)),
                             function(iucn) {
                                 $(iucn).click(
                                     function(event) {
                                        var win = window.open('http://www.iucnredlist.org/apps/redlist/search/external?text='+$(this).data('scientificname'));
                                        win.focus();
                                    }
                                 );
                             }
                         );
                        } else {
                            listradius.setMap(null);
                            delete(self.features[listradius.center.toString()+listradius.radius]);
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
                    } else {
                        $(self.display).hide();
                        _.each(
                            self.features,
                            function(feature) {
                                feature.listradius.setMap(null);
                                feature.infoWindow.setMap(null);
                            }
                        );
                   }
                }
            );
            this.display.radiusInput.blur(
                function(event) {
                    if(this.value>1000) {
                        this.value=1000;
                        alert('Please choose a radius between 50 km and 1000 km.');
                    }
                    if(this.value<50) {
                        this.value=50;
                        alert('Please choose a radius between 50 km and 1000 km.');
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
                        '     Search Radius <select class="radius">' +
                        '       <option selected value="50">50 km</option>' +
                        '       <option value="100">100 km</option>' +
                        '       <option value="500">500 km</option>' +
                        '       <option value="1000">1000 km</option>' +
                        '     </select>' +
                        '     Class <select class="class" value="">' +
                        '       <option value="">All</option>' +
                        '       <option selected value=" and p.class=\'aves\' ">Bird</option>' +
                        '       <option value=" and p.class LIKE \'%osteichthyes\' ">Fish</option>' + //note the space, leaving till we can clean up polygons
                        '       <option value=" and p.class=\'reptilia\' ">Reptile</option>' +
                        '       <option value=" and p.class=\'amphibia\' ">Amphibian</option>' +
                        '       <option value=" and p.class=\'mammalia\' ">Mammal</option>' +
                        '     </select>' +
                        '     Type <select class="type" value="">' +
                        '       <option value="">All</option>' +
                        '       <option selected value="and p.type=\'range\' ">Range maps</option>' +
                        '       <option value=" and p.type=\'protectedarea\'">Protected Areas</option>' +
                        '       <option value=" and p.type=\'ecoregion\'">Ecoregions</option>' +
                        '       <option disabled value="">Point records</option>' +
                        '     </select>' +
                        '   </div>' +
                        //'   <div class="resultslist">Click on the map to find bird species within 50km of that point.</div>' +
                        '</div>';

            this._super(html);
            this.resultslist=$(this).find('.resultslist');
            this.radiusInput=$(this).find('.radius');
            //$(this.radiusInput).numeric({negative : false, decimal : false});
            this.classInput=$(this).find('.class');
            this.typeInput=$(this).find('.type');
        }
    }
    );
    mol.map.QueryResultDisplay = mol.mvp.View.extend(
    {
        init : function(scientificname) {
            var className = 'mol-Map-QueryResultDisplay',
                 html = '{0}';
            this._super(html.format(scientificname));

        }
    }
    );
};mol.modules.map.legend = function(mol) {

    mol.map.legend = {};

    mol.map.legend.LegendEngine = mol.mvp.Engine.extend(
    {
        init : function(proxy, bus, map) {
                this.proxy = proxy;
                this.bus = bus;
                this.map = map;
        },

        start : function() {
            this.addLegendDisplay();
            this.addEventHandlers();
        },

        /*
         *  Build the legend display and add it as a control to the bottom right of the map display.
         */
        addLegendDisplay : function() {
            var params = {
                  display: null,
                  slot: mol.map.ControlDisplay.Slot.TOP,
                  position: google.maps.ControlPosition.RIGHT_BOTTOM
                };

            this.display = new mol.map.LegendDisplay();
            this.display.toggle(false);
            params.display = this.display;
            this.bus.fireEvent( new mol.bus.Event('add-map-control', params));
        },

        addEventHandlers : function () {
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
                'legend-display-toggle',
                function(event) {
                    var params = {},
                        e = null;

                    if (event.visible === undefined) {
                        self.display.toggle();
                        params = {visible: self.display.is(':visible')};
                    } else {
                        self.display.toggle(event.visible);
                    }
                }
            );
        }
    }
    );

    mol.map.LegendDisplay = mol.mvp.View.extend(
    {
        init : function(names) {
            var className = 'mol-Map-LegendDisplay',
                html = '' +
                        '<div class="' + className + ' widgetTheme">' +
                        '       Seasonality Key' +
                        '       <div class="legendRow"><div class="seasonality1 legendItem"></div> Resident</div>' +
                        '       <div class="legendRow"><div class="seasonality2 legendItem"></div> Breeding Season</div>' +
                        '       <div class="legendRow"><div class="seasonality3 legendItem"></div> Non-breeding Season</div>' +
                        '       <div class="legendRow"><div class="seasonality4 legendItem"></div> Passage</div>' +
                        '       <div class="legendRow"><div class="seasonality5 legendItem"></div> Seasonality Uncertain</div>' +
                        '</div>';

            this._super(html);
        }
    }
   );
};
mol.modules.map.basemap = function(mol) {

    mol.map.basemap = {};

    mol.map.basemap.BaseMapEngine = mol.mvp.Engine.extend(
        {
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
                            this.map.setOptions({styles:null});
                            break;

                        case "Basic":
                            type="ROADMAP";
                            this.map.setOptions({styles: [
                                {
                                    featureType: "administrative",
                                    stylers: [
                                     { visibility: "simplified" }
                                    ]
                                },
                                {
                                    featureType: "administrative.locality",
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
                                  stylers: [
                                    { visibility: "on" },
                                    { saturation: -65 },
                                    { lightness: -15 },
                                   { gamma: 0.83 }
                                    ]
                                  },
                               {
                                  featureType: "transit",
                                 stylers: [
                                      { visibility: "off" }
                        ]
                      },{
                        featureType: "administrative",
                        stylers: [
                          { visibility: "off" }
                        ]
                      },{
                        featureType: "administrative.country",
                        stylers: [
                          { visibility: "on" }
                        ]
                      },{
                        featureType: "administrative.province",
                       stylers: [
                          { visibility: "on" }
                        ]
                      }
                    ]});
                        break;
                        case 'Political' :
                        this.map.setOptions({styles : [
                            {
featureType: "administrative.country",
stylers: [
{ visibility: "simplified" }
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
{ visibility: "off" }
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
                        position: google.maps.ControlPosition.BOTTOM_LEFT
                    },
                    event = new mol.bus.Event('add-map-control', params);

                this.bus.fireEvent(event);
            }
        }
    );

    mol.map.basemap.BaseMapControlDisplay = mol.mvp.View.extend(
        {
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
        }
    );
};



