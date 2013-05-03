mol.modules.map.time = function(mol) {

    mol.map.time = {};

    mol.map.time.TimeEngine = mol.mvp.Engine.extend(
    {
        init : function(proxy, bus) {
                this.proxy = proxy;
                this.bus = bus;
        },
        start : function() {
            this.addTimeDisplay();
            this.addEventHandlers();
            this.cache = {};
        },
        /*
         *  Build the time display and add it as a control to the top center of the map display.
         */
        addTimeDisplay : function() {
            var event,
                params = {
                    display: null, // The loader gif display
                    slot: mol.map.ControlDisplay.Slot.TOP,
                    position: google.maps.ControlPosition.TOP_RIGHT
                };
            
            this.time = new mol.map.TimeDisplay();
            params.display = this.time;
            event = new mol.bus.Event('add-map-control', params);
            this.bus.fireEvent(event);
        },
        addEventHandlers : function () {
            var self = this;
          
            this.bus.addHandler(
                'hide-time-widget',
                function(event) {
         
                }
            );
          
            this.bus.addHandler(
                'show-date-widget',
                function(event) {
                  
                }
            );
        }
    }
    );

    /*
     *  Display for a time indicator.
     *  Use jQuery hide() and show() to turn it off and on.
     */
    mol.map.TimeDisplay = mol.mvp.View.extend(
    {
        init : function() {
            var className = 'mol-Map-TimeWidget',
                html = '' +
                    '<div class="' + className + '">' +
                        '<div class="widgetTheme">' +
                            '<label for="from">From</label>' +
                            '<input type="text" id="from" name="from" />' +
                            '<label for="to">to</label>' +
                            '<input type="text" id="to" name="to" />' +
                        '</div>' +
                    '</div>';
            this._super(html);
            this.from = $(this).find('.from');
            this.to = $(this).find('.to');
        }
    });
};
