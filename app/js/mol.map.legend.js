mol.modules.map.legend = function(mol) {

    mol.map.legend = {};

    mol.map.legend.LegendEngine = mol.mvp.Engine.extend(
    {
        init : function(proxy, bus, map) {
                this.proxy = proxy;
                this.bus = bus;
                this.map = map;
        },

        start : function() {
            this.addLegendMenuButton();
            this.addLegendDisplay();
            this.addEventHandlers();
        },
        
        addLegendMenuButton : function() {
           var html = '' +
                '  <div ' + 
                    'title="Toggle map legend." ' + 
                    'id="legend" ' + 
                    'class="widgetTheme legend button">' + 
                    'Legend' + 
                '  </div>',
                params = {
                    button: html
                },
                event = new mol.bus.Event('add-legend-toggle-button', params);
                
           this.bus.fireEvent(event);
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
                        '       <div class="legendCategory">' +
                        '           Type' +
                        '           <div class="legendRow"><div class="ecoregion legendItem"></div> Regional checklist</div>' +
                        '           <div class="legendRow"><div class="protectedarea legendItem"></div> Local inventory</div>' +
                        '           <div class="legendRow"><div class="seasonality1 legendItem narrow"></div><div class="seasonality2 legendItem narrow"></div><div class="seasonality3 legendItem narrow"></div><div class="seasonality4 legendItem narrow"></div><div class="seasonality5 legendItem narrow"></div> Expert range map</div>' +
                        '           <div class="legendRow"><div class="legendItem"><img class="point" src="/static/maps/placemarks/mol_sprite.png"></div> Point observation</div>' +
                        '       </div>' +
                        '       <div class="legendCategory">' +
                        '           Expert Range Map Seasonality' +
                        '           <div class="legendRow"><div class="seasonality1 legendItem"></div> Resident</div>' +
                        '           <div class="legendRow"><div class="seasonality2 legendItem"></div> Breeding Season</div>' +
                        '           <div class="legendRow"><div class="seasonality3 legendItem"></div> Non-breeding Season</div>' +
                        '           <div class="legendRow"><div class="seasonality4 legendItem"></div> Passage</div>' +
                        '           <div class="legendRow"><div class="seasonality5 legendItem"></div> Seasonality Uncertain</div>' +
                        '       </div>' +
                        '</div>';

            this._super(html);
        }
    }
   );
};
