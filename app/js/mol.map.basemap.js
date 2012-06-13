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
                                     { visibility: "on" }
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
                          { visibility: "on" }
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



