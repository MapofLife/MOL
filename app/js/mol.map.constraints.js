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
            
            this.bus.addHandler(
                'show-constraints',
                function(event) {
                    var params = event.params;
                    self.showConstraints(params)
                }
            );
            this.bus.addHandler(
                'hide-constraints',
                function(event) {
                    var params = event.params;
                    self.applyConstraints();
                    self.display.dialog('hide');
                }
            );
        },
        showConstraints: function (params) {
            var self = this,
                constraints = (params.layer.constraints == undefined) ?
                    {
                        year: {min:1950, max:2013}
                    } : params.layer.constraints;

                    
            this.display.year.slider({
                width:80, 
                height:20, 
                min: 1800, 
                max: 2013, 
                range: true, 
                values:[constraints.year.min,constraints.year.max], 
                step:1,
                stop: function(event, ui) {
                    constraints.year.min = ui.values[0];
                    constraints.year.max = ui.values[1];
                    params.layer.constraints = constraints;
                    self.setConstraints(event, ui, params.layer)
                },
                slide: function (event, ui) {
                    self.updateYearLabels(event, ui, params.layer);
                }    
            });
            
            this.updateYearLabels(
                        {}, 
                        {values:[constraints.year.min,constraints.year.max]}, 
                        params.layer);
           this.display.dialog({
               title:"Set constraints for the {0} layer from {1}"
                    .format(params.layer.name, params.layer.source_title)
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
                    {min: 1950, 
                    max: 2014}
                )
            );
        },
        setConstraints: function(event, ui, layer) {
            this.bus.fireEvent(
                new mol.bus.Event(
                    'set-constraints',
                    {layer: layer}
                )
            );            
        },
        updateYearLabels: function (event, ui) {
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
