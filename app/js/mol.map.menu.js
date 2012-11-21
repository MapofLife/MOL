mol.modules.map.menu = function(mol) {

    mol.map.menu = {};

    mol.map.menu.MenuEngine = mol.mvp.Engine.extend({
        init: function(proxy, bus) {
            this.proxy = proxy;
            this.bus = bus;
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

            this.bus.addHandler(
                'add-dashboard-toggle-button',
                function(event) {
                    $(self.display).prepend(event.button);
                    self.display.dashboardItem =
                        $(self.display).find('#dashboard');

                    self.display.dashboardItem.click(
                        function(event) {
                            self.bus.fireEvent(
                                new mol.bus.Event('taxonomy-dashboard-toggle'));
                        }
                    );
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
            this.about = $(this).find('.about');
            this.help = $(this).find('.help');
            this.feedback = $(this).find('.feedback');
            this.status = $(this).find('.status');
        }
    });
};

