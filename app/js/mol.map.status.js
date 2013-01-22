mol.modules.map.status = function(mol) {

    mol.map.status = {};

    mol.map.status.StatusEngine = mol.mvp.Engine.extend(
        {
            init: function(proxy, bus) {
                this.proxy = proxy;
                this.bus = bus;
             },

            /**
             * Starts the MenuEngine. Note that the container parameter is
             * ignored.
             */
            start: function() {

                this.display = new mol.map.status.StatusDisplay();
                this.addEventHandlers();
            },

            showStatus: function() {
                this.display.dialog(
                    {
                        autoOpen: true,
            			width: 360,
            			height: 360,
            			dialogClass: "mol-status",
            			modal: true
                    }
                );

                $(this.display).width('98%');
            },

            addEventHandlers : function () {
                 var self = this;
                 this.bus.addHandler(
                    'status-display-dialog',
                    function (params) {
                        self.showStatus();
                    }
                );
            }
        }
    );

    mol.map.status.StatusDisplay = mol.mvp.View.extend(
        {
            init: function() {
                var html = '' +
                '<div>' +
	            '  <iframe ' +
	                   'class="mol-status iframe_content ui-dialog-content" ' +
	                   'style="height:300px; ' +
	                           'width: 98%; ' +
	                           'margin-left: -20px; ' +
	                           'margin-right: auto; ' +
	                           'display: block;" ' +
                       'src="/static/status/index.html">' +
                '  </iframe>' +
                '</div>';

                this._super(html);
                this.iframe_content = $(this).find('.iframe_content');
		        this.mesg = $(this).find('.message');
            }
        }
    );
};



