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
                        new mol.bus.Event('taxonomy-dashboard-toggle',{visible:false})
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

