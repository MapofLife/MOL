mol.modules.map.search = function(mol) {

    mol.map.search = {};

    mol.map.search.SearchEngine = mol.mvp.Engine.extend({
        /**
         * @param bus mol.bus.Bus
         */
        init: function(proxy, bus) {
            this.proxy = proxy;
            this.bus = bus;
            this.searching = {};
            this.names = [];
            this.ac_label_html = ''+
                '<div class="ac-item">' +
                    '<span class="sci">{0}</span>' +
                    '<span class="eng">{1}</span>' +
                '</div>';
            this.ac_sql = "" +
                "SELECT n,v FROM ac_mar_8_2013 WHERE n~*'\\m{0}' OR v~*'\\m{0}'";
            this.search_sql = '' +
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
                    "CASE WHEN d.type = 'taxogeooccchecklist' " +
                        'THEN ' +
                            "CONCAT("+
                                "to_char(l.occ_count,'999,999,999'),"+
                                "' records<br>'," +
                                "to_char(l.feature_count, '999,999,999'),"+
                                "' locations'"+
			    ") " +
                        'ELSE ' +
                            "CONCAT(to_char(l.feature_count,'999,999,999'),' features') "+
                    'END as feature_count, '+
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
                    'd.style_table as style_table, ' +
                    'e.habitatprefs as modis_habitats, ' +
                    'c.consensusprefs as consensus_habitats, ' +
                    'e.finalmin as mine, ' +
                    'e.finalmax as maxe, ' +
                    'ee.ee_id as ee_id ' +
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
                'LEFT JOIN consensus_prefs_join c ON ' +
                    'l.scientificname = c.binomial ' +
                'LEFT JOIN elevandhabitat e ON ' +
                    'l.scientificname = e.scientific ' +
                'LEFT JOIN ee_assets ee ON ' +
                    'l.scientificname = ee.scientificname ' +
                    'AND l.dataset_id = ee.dataset_id ' +
                'WHERE ' +
                     "n.n~*'\\m{0}' OR n.v~*'\\m{0}' " +
                'ORDER BY name, type_sort_order';
        },

        /**
         * Starts the SearchEngine. Note that the container parameter is
         * ignored.
         */
        start: function() {
            this.display = new mol.map.search.SearchDisplay();
            this.display.toggle(true);
            this.initAutocomplete();
            this.addEventHandlers();
            this.fireEvents();
        },
        /*
         * Initialize autocomplate functionality
         */
        initAutocomplete: function() {
            this.populateAutocomplete(null, null);

            //http://stackoverflow.com/questions/2435964/jqueryui-how-can-i-custom-format-the-autocomplete-plug-in-results
            $.ui.autocomplete.prototype._renderItem = function (ul, item) {

                item.label = item.label.replace(
                    new RegExp("(?![^&;]+;)(?!<[^<>]*)(" +
                       $.ui.autocomplete.escapeRegex(this.term) +
                       ")(?![^<>]*>)(?![^&;]+;)", "gi"),
                    "<strong>$1</strong>"
                );
                return $("<li></li>")
                    .data("item.autocomplete", item)
                    .append("<a>" + item.label + "</a>")
                    .appendTo(ul);
            };
        },

        /*
         * Populate autocomplete results list
         */
        populateAutocomplete : function(action, response) {
            var self = this;
            $(this.display.searchBox).autocomplete(
                {
                    minLength: 3,
                    source: function(request, response) {
                        $.getJSON(
                            'http://mol.cartodb.com/api/v1/sql?q={0}'.format(
                                    self.ac_sql.format(
                                        $.trim(request.term)
                                            .replace(/ /g, ' ')
                                    )
                            ),
                            function (json) {
                                var names = [],scinames=[];
                                _.each (
                                    json.rows,
                                    function(row) {
                                        var sci, eng;
                                        if(row.n != undefined){
                                            sci = row.n;
                                            eng = (row.v == null ||
                                                row.v == '') ?
                                                    '' :
                                                    ', {0}'.format(
                                                        row.v.replace(
                                                            /'S/g, "'s"
                                                        )
                                                    );
                                            names.push({
                                                label:self.ac_label_html
                                                    .format(sci, eng),
                                                value:sci
                                            });
                                            scinames.push(sci);
                                       }
                                   }
                                );
                                if(scinames.length>0) {
                                    self.names=scinames;
                                }
                                response(names);
                                self.bus.fireEvent(
                                    new mol.bus.Event(
                                        'hide-loading-indicator',
                                        {source : "autocomplete"}
                                    )
                                );
                             },
                             'json'
                        );
                    },
                    select: function(event, ui) {
                        self.searching[ui.item.value] = false;
                        self.names = [ui.item.value];
                        self.search(ui.item.value);
                    },
                    close: function(event,ui) {

                    },
                    search: function(event, ui) {
                        self.searching[$(this).val()] = true;
                        self.names=[];
                        self.bus.fireEvent(
                            new mol.bus.Event(
                                'show-loading-indicator',
                                {source : "autocomplete"}
                            )
                        );
                    },
                    open: function(event, ui) {
                        self.searching[$(this).val()] = false;
                        self.bus.fireEvent(
                             new mol.bus.Event(
                                'hide-loading-indicator',
                                {source : "autocomplete"}
                            )
                        );
                    }
              });
        },

        addEventHandlers: function() {
            var self = this;

            /**
             * Callback that toggles the search display visibility. The
             * event is expected to have the following properties:
             *
             *   event.visible - true to show the display, false to hide it.
             *
             * @param event mol.bus.Event
             */
            this.bus.addHandler(
                'search-display-toggle',
                function(event) {
                    var params = {},
                        e = null;

                    if (event.visible === undefined) {
                        self.display.toggle();
                        params = {visible: self.display.is(':visible')};
                    } else {
                        self.display.toggle(event.visible);
                    }

                    e = new mol.bus.Event('results-display-toggle', params);
                    self.bus.fireEvent(e);
                }
            );

            this.bus.addHandler(
                'close-autocomplete',
                function(event) {
                    $(self.display.searchBox).autocomplete("close");
                }
            );

            this.bus.addHandler(
                'search',
                function(event) {
                    if (event.term != undefined) {
                        if (!self.display.is(':visible')) {
                            self.bus.fireEvent(
                                new mol.bus.Event(
                                    'search-display-toggle',
                                    {visible : true}
                                )
                            );
                        }

                        self.search(event.term);

                        if (self.display.searchBox.val()=='') {
                            self.display.searchBox.val(event.term);
                        }
                    }
               }
            );

            /**
             * Clicking the go button executes a search.
             */
            this.display.goButton.click(
                function(event) {
                    self.search(self.display.searchBox.val());
                }
            );

            /**
             * Clicking the cancel button hides the search display and fires
             * a cancel-search event on the bus.
             */
            this.display.toggleButton.click(
                function(event) {
                    var params = {
                        visible: false
                    }, that = this;

                    if(self.display.searchDisplay.is(':visible')) {
                        self.display.searchDisplay.hide();
                        $(this).text('▶');
                        params.visible = false;
                    } else {

                        self.display.searchDisplay.show();
                        $(this).text('◀');
                        params.visible = true;
                    }

                    self.bus.fireEvent(
                        new mol.bus.Event('results-display-toggle', params));
                }
            );

            /**
             * Pressing the return button clicks the go button.
             */
            this.display.searchBox.keyup(
                function(event) {
                    if (event.keyCode === 13) {
                        $(this).autocomplete("close");
                        self.bus.fireEvent(
                            new mol.bus.Event(
                                'hide-loading-indicator',
                                {source : "autocomplete"}
                            )
                        );
                        self.search($(this).val());
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
                    slot: mol.map.ControlDisplay.Slot.TOP,
                    position: google.maps.ControlPosition.TOP_LEFT
                },
                event = new mol.bus.Event('add-map-control', params);

            this.bus.fireEvent(event);
        },

        /**
         * Searches CartoDB using a term from the search box. Fires
         * a search event on the bus. The success callback fires a
         * search-results event on the bus.
         *
         * @param term the search term (scientific name)
         */
        search: function(term) {
            var self = this;


                $(self.display.searchBox).autocomplete('disable');
                $(self.display.searchBox).autocomplete('close');

                if(term.length<3) {
                    if ($.trim(term).length==0) {
                        self.bus.fireEvent(new mol.bus.Event('clear-results'));
                    } else {
                        alert('' +
                            'Please enter at least 3 characters ' +
                            'in the search box.'
                        );
                    }
                } else {
                    self.bus.fireEvent(
                        new mol.bus.Event(
                            'show-loading-indicator',
                            {source : "search-{0}".format(term)}
                        )
                    );
                    $(self.display.searchBox).val(term);
                    $.getJSON(
                        'http://mol.cartodb.com/api/v1/sql?q={0}'.format(
                            this.search_sql.format(
                                $.trim(term)
                                .replace(/ /g, ' ')
                            )
                        ),
                        function (response) {
                            var results = {term:term, response:response};
                            self.bus.fireEvent(
                                new mol.bus.Event(
                                    'hide-loading-indicator',
                                    {source : "search-{0}".format(term)}
                                )
                            );
                            self.bus.fireEvent(
                                new mol.bus.Event(
                                    'search-results',
                                    results
                                )
                            );
                            $(self.display.searchBox).autocomplete('enable');
                        }
                    );
               }

        }
    });

    mol.map.search.SearchDisplay = mol.mvp.View.extend({
        init: function() {
            var html = '' +
                '<div class="mol-LayerControl-Search widgetTheme" style="display: inline-block">' +
                '    <div class="title">Search</div>' +
                '    <div class="searchDisplay">' +
                '       <input class="value ui-autocomplete-input" type="text" ' +
                            'placeholder="Search by species name">' +
                '       <button class="execute">Go</button>' +
                '   </div>'+
                '   <button class="toggle">◀</button>' +
                '</div>';

            this._super(html);
            this.goButton = $(this).find('.execute');
            this.toggleButton = $(this).find('.toggle');
            this.searchDisplay = $(this).find('.searchDisplay');
            this.searchBox = $(this).find('.value');
        },

        clear: function() {
            this.searchBox.html('');
        }
    });
};
