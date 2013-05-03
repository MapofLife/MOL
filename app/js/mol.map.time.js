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
                'show-time-widget',
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
                selectedDate,
                html = '' +
                    '<div class="' + className + ' widgetTheme">' +
                        '<div>' +
                            '<label for="from">From</label>' +
                            '<input type="text" size="6" class="from" name="from" value="01/01/1980" />' +
                            '<label for="to">To</label>' +
                            '<input type="text" size="6" class="to" name="to" value="12/31/2013" />' +
                        '</div>' +
                    '</div>',
                    self = this;
            this._super(html);
            this.from = $(this).find('.from');
            this.from.datepicker({
                defaultDate: "-30y",
                changeMonth: true,
                changeYear:true,
                numberOfMonths: 1,
                onClose: function( selectedDate ) {
                    self.from.datepicker( "option", "minDate", selectedDate );
                }
            });
            this.to = $(this).find('.to');
            this.to.datepicker({
                defaultDate: "+1w",
                changeMonth: true,
                changeYear:true,
                numberOfMonths: 1,
                onClose: function( selectedDate ) {
                    self.from.datepicker( "option", "maxDate", selectedDate );
                }
            });

        }
    });
};
