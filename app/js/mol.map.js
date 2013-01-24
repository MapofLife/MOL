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
                            "click",
                            function(event) {
                                var params = {
                                    gmaps_event : event,
                                    map : self.display.map}
                                self.bus.fireEvent(
                                    new mol.bus.Event(
                                        'species-list-query-click',
                                        params));
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
                    maxZoom: 10,
                    minZoom: 2,
                    minLat: -85,
                    maxLat: 85,
                    mapTypeControl: false,
                    panControl: false,
                    zoomControl: true,
                    streetViewControl: false,
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
                            "featureType" : "administrative.locality",
                            "stylers" : [{
                                "visibility" : "off"
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
