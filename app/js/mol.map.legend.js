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
                params.display = this.display;
                this.bus.fireEvent( new mol.bus.Event('add-map-control', params));
        },
        addEventHandlers : function () {
            var self = this;
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
