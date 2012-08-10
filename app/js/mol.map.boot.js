mol.modules.map.boot = function(mol) {

    mol.map.boot = {};

    mol.map.boot.BootEngine = mol.mvp.Engine.extend({
        init: function(proxy, bus) {
            this.proxy = proxy;
            this.bus = bus;
            this.IE8 = false;
            this.sql = '' +
                'SELECT DISTINCT l.scientificname as name,'+
                '       l.type as type,'+
                '       t.title as type_title,'+
                '       l.provider as source, '+
                '       p.title as source_title,'+
                '       n.class as _class, ' +
                '       l.feature_count as feature_count,'+
                '       n.common_names_eng as names,' +
                '       CONCAT(\'{"sw":{"lng":\',ST_XMin(l.extent),\', "lat":\',ST_YMin(l.extent),\'} , "ne":{"lng":\',ST_XMax(l.extent),\', "lat":\',ST_YMax(l.extent),\'}}\') as extent ' +
                'FROM layer_metadata l ' +
                'LEFT JOIN types t ON ' +
                '       l.type = t.type ' +
                'LEFT JOIN providers p ON ' +
                '       l.provider = p.provider ' +
                'LEFT JOIN taxonomy n ON ' +
                '       l.scientificname = n.scientificname ' +
                'WHERE ' +
                "  l.scientificname~*'\\m{0}' OR n.common_names_eng~*'\\m{0}'";
        },
        start: function() {
            this.loadTerm();
        },
        /*
         *   Method to attempt loading layers from search term in the URL.
         */
        loadTerm: function() {
            var self = this;

            // Remove backslashes and characters that should be counted as spaces
            this.term = unescape(window.location.pathname.replace(/\//g, '').replace(/\+/g, ' ').replace(/_/g, ' '));

            if ((this.getIEVersion() >= 0 && this.getIEVersion() <= 8) || this.term == '') {
                // If on IE8- or no query params, fire the splash event
                self.bus.fireEvent(new mol.bus.Event('toggle-splash'));
            } else {
                // Otherwise, try and get a result using term
                $.post(
                'cache/get',
                {
                    key: 'boot-results-08102012210-{0}'.format(self.term),
                    sql: this.sql.format(self.term)
                },
                function(response) {
                    var results = mol.services.cartodb.convert(response);
                    if (Object.keys(results.layers).length == 0) {
                        self.bus.fireEvent(new mol.bus.Event('toggle-splash'));
                    } else {
                        //parse the results
                        self.loadLayers(self.getLayersWithIds(results.layers));
                    }
                },
                'json'
                );
            }
        },
        /*
         * Adds layers to the map if there are fewer than 25 results, or fires the search results widgetif there are more.
         */
        loadLayers: function(layers) {
            if (Object.keys(layers).length < 25) {
                this.bus.fireEvent(new mol.bus.Event('add-layers', {layers: layers}))
            } else if (this.term != null) {
                this.bus.fireEvent(new mol.bus.Event('search', {term: this.term}));
            }
        },
        /*
         * Returns an array of layer objects {id, name, type, source}
         * with their id set given an array of layer objects
         * {name, type, source}.
         */
        getLayersWithIds: function(layers) {
            return _.map(
            layers,
            function(layer) {
                return _.extend(layer, {id: mol.core.getLayerId(layer)});
            }
            );
        },
        /* Returns the version of Internet Explorer or a -1
         * (indicating the use of another browser).
         */
        getIEVersion: function() {
            var rv = -1, ua, re;
            // Return value assumes failure.
            if (navigator.appName == 'Microsoft Internet Explorer') {
                ua = navigator.userAgent;
                re = new RegExp("MSIE ([0-9]{1,}[\.0-9]{0,})");
                if (re.exec(ua) != null) {
                    rv = parseFloat(RegExp.$1);
                }
            }
            return rv;
        }
    });
};
