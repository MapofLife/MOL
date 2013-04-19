mol.modules.map.boot = function(mol) {

    mol.map.boot = {};

    mol.map.boot.BootEngine = mol.mvp.Engine.extend({
        init: function(proxy, bus, map) {
            this.proxy = proxy;
            this.bus = bus;
            this.map = map;
            this.IE8 = false;
            this.maxLayers = ($.browser.chrome) ? 6 : 25;
            this.sql = '' +
                'SELECT DISTINCT l.scientificname as name,'+
                    't.type as type,'+
                    "CASE d.style_table WHEN 'points_style' " + 
                        'THEN t.carto_css_point ' + 
                        "WHEN 'polygons_style' " + 
                        'THEN t.carto_css_poly END as css,' +
                    't.sort_order as type_sort_order, ' +
                    't.title as type_title, '+
                    't.opacity as opacity, ' +
                    'CONCAT(l.provider,\'\') as source, '+
                    'CONCAT(p.title,\'\') as source_title,'+
                    's.source_type as source_type, ' +
                    's.title as source_type_title, ' +   
                    'l.feature_count as feature_count, '+
                    'CONCAT(n.v,\'\') as names, ' +
                    'CASE WHEN l.extent is null THEN null ELSE ' +
                    'CONCAT(\'{' +
                        '"sw":{' +
                            '"lng":\',ST_XMin(box2d(ST_Transform(ST_SetSRID(l.extent,3857),4326))),\', '+
                            '"lat":\',ST_YMin(box2d(ST_Transform(ST_SetSRID(l.extent,3857),4326))),\' '+
                        '}, '+
                        '"ne":{' +
                        '"lng":\',ST_XMax(box2d(ST_Transform(ST_SetSRID(l.extent,3857),4326))),\', ' +
                        '"lat":\',ST_YMax(box2d(ST_Transform(ST_SetSRID(l.extent,3857),4326))),\' ' +
                        '}}\') ' +
		    'END as extent, ' +
                    'l.dataset_id as dataset_id, ' +
                    'd.dataset_title as dataset_title, ' + 
                    'd.style_table as style_table ' +
                    
                'FROM layer_metadata_mar_8_2013 l ' +
                'LEFT JOIN data_registry d ON ' +
                    'l.dataset_id = d.dataset_id ' +
                'LEFT JOIN types t ON ' +
                    'l.type = t.type ' +
                'LEFT JOIN providers p ON ' +
                    'l.provider = p.provider ' +
                'LEFT JOIN source_types s ON ' +
                    'p.source_type = s.source_type ' +
                'LEFT JOIN ac_mar_8_2013 n ON ' +
                    'l.scientificname = n.n ' +
                'WHERE ' +
                     "n.n~*'\\m{0}' OR n.v~*'\\m{0}' " +
                'ORDER BY name, type_sort_order';
        },
        start: function() {
            this.loadTerm();
        },
        /*
         *   Method to attempt loading layers from search term in the URL.
         */
        loadTerm: function() {
            var self = this;
            
            // Remove backslashes and replace characters that equal spaces.
            this.term = unescape(
                window.location.pathname
                    .replace(/\//g, '')
                    .replace(/\+/g, ' ')
                    .replace(/_/g, ' ')
            );

            if ((this.getIEVersion() >= 0 && this.getIEVersion() <= 8) 
                || this.term == '') {
                // If on IE8- or no query params, fire the splash event
                self.bus.fireEvent(new mol.bus.Event('toggle-splash'));
            } else {
                // Otherwise, try and get a result using term
                $.getJSON(
                    mol.services.cartodb.sqlApi.json_url.format(this.sql.format(self.term)),
                    function(response) {
                        var results = response.rows;
                        if (results.length == 0) {
                            self.bus.fireEvent(new mol.bus.Event('toggle-splash'));
                            self.map.setCenter(new google.maps.LatLng(0,-50));
                        } else {
                            //parse the results
                            self.loadLayers(self.getLayersWithIds(results));
                        }
                    },
                    'json'
                );
            }
        },
        /*
         * Adds layers to the map if there are fewer than 25 results, 
         * or fires the search results widgetif there are more.
         */
        loadLayers: function(layers) {
            if (Object.keys(layers).length <= this.maxLayers) {
                this.bus.fireEvent(
                    new mol.bus.Event('add-layers', {layers: layers})
                );

            } else if (this.term != null) {
                this.bus.fireEvent(
                    new mol.bus.Event('search', {term: this.term})
                );
                this.map.setCenter(new google.maps.LatLng(0,-50));
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
