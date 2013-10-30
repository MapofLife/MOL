mol.modules.map.constraints = function(mol) {

    mol.map.constraints = {};

    mol.map.constraints.ConstraintsEngine = mol.mvp.Engine.extend({
        init: function(proxy, bus, map) {
            this.proxy = proxy;
            this.bus = bus;
            this.map = map;
          
        },    
        start: function() {
            this.display = new mol.map.constraints.ConstraintsDisplay();
            this.fireEvents();
            this.addEventHandlers();
        },
        addEventHandlers: function() {
            var self = this;
            this.display.year.slider({
                width:100, 
                height:20, 
                min: 1800, 
                max: 2013, 
                range: true, 
                values:[1970,2013], 
                step:1,
                slide: function(event, ui) {
                    self.setYearConstraint(event, ui)
                }    
            });
        },
        /**
         * Fires the 'add-map-control' event. The mol.map.MapEngine handles
         * this event and adds the display to the map.
         */
        fireEvents: function() {
            var params = {
                    display: this.display,
                    slot: mol.map.ControlDisplay.Slot.TOP,
                    position: google.maps.ControlPosition.TOP_CENTER
            };
            this.bus.fireEvent(new mol.bus.Event('add-map-control', params));
            
            this.bus.fireEvent(
                new mol.bus.Event(
                    'set-year-constraint',
                    {min: 1800, 
                    max: 2014}
                )
            );
        },
        setYearConstraint: function(event, ui) {
            this.display.find('.minyear').text(ui.values[0]);
            this.display.find('.minyear').css(
                'left',
                $(this.display.find('.ui-slider-handle')[0])
                    .offset().left
                    -$(this.display.year).offset().left
                    -$(this.display.find('.ui-slider-handle')[1])
                            .width()/2
            );
            this.display.find('.maxyear').text(ui.values[1]);
            this.display.find('.maxyear').css(
                'left',
                $(this.display.find('.ui-slider-handle')[1])
                    .offset().left
                        -$(this.display.year).offset().left
                        -$(this.display.find('.maxyear')).width()
                        -$(this.display.find('.ui-slider-handle')[1])
                            .width()/2
            );
            this.bus.fireEvent(
                new mol.bus.Event(
                    'set-year-constraint',
                    {min: ui.values[0], max: ui.values[1]}
                )
            );            
        }
    });

    mol.map.constraints.ConstraintsDisplay = mol.mvp.View.extend({
        init: function() {
            var html = '' +
                '<div class="mol-ConstraintsControl">' +
                    '<div class="year"></div>' +
                    '<span class="minyear"></span>' +
                    '<span class="maxyear"></span>' +
                '</div>',
                self = this;
            this._super(html);
            this.year = $(this).find('.year');
            
        }
    });
}