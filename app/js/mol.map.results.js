/**
 * This module provides support for rendering search results.
 */
mol.modules.map.results = function(mol) {

    mol.map.results = {};

    mol.map.results.ResultsEngine = mol.mvp.Engine.extend(
        {
            /**
             * @param bus mol.bus.Bus
             */
            init: function(proxy, bus, map) {
                this.proxy = proxy;
                this.bus = bus;
                this.map = map;
            },

            /**
             * Starts the SearchEngine. Note that the container parameter is
             * ignored.
             */
            start: function(container) {
                this.display = new mol.map.results.ResultsDisplay();
                this.display.toggle(false);
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

                /**
                 * Clicking the "select all" link checks all results.
                 */
                this.display.selectAllLink.click(
                    function(event) {
                        self.display.toggleSelections(true);
                    }
                );
                this.bus.addHandler(
                    'results-select-all',
                    function(event) {
                        self.display.selectAllLink.click();
                    }
                );
                this.bus.addHandler(
                    'results-map-selected',
                    function(event) {
                        self.display.addAllButton.click();
                    }
                );
                /**
                 * Clicking the 'map selected layers' button fires an 'add-layers'
                 * event on the bus.
                 */
                this.display.addAllButton.click(
                    function(event) {
                        var checkedResults = self.display.getChecked(),
                        layers = _.map(
                            checkedResults,
                            function(result) {
                                return $.data(result[0],"layer");
                            }
                        );
                        if(self.map.overlayMapTypes.length + layers.length > 100) {
                            alert('The map is currently limited to 100 layers at a time. Please remove some layers before adding more.');
                        } else {
                            self.bus.fireEvent(
                                new mol.bus.Event(
                                    'add-layers',
                                    {
                                        layers: layers
                                    }
                                )
                            );
                        }
                    }
                );
                /**
                 * Clicking the "select none" link unchecks all results.
                 */
                this.display.selectNoneLink.click(
                    function(event) {
                        self.display.toggleSelections(false);
                    }
                );

                /**
                 * Callback that toggles the search display visibility. The
                 * event is expected to have the following properties:
                 *
                 *   event.visible - true to show the display, false to hide it,
                 *                   undefined to toggle.
                 *
                 * @param event mol.bus.Event
                 */
                this.bus.addHandler(
                    'results-display-toggle',
                    function(event) {
                        if(self.results == undefined) {
                            self.display.toggle(false);
                        } else {
                            if (event.visible === undefined) {
                                self.display.toggle();
                            } else {
                                self.display.toggle(event.visible);
                            }
                        }
                    }
                );

                /**
                 * Callback that displays search results.
                 */
                this.bus.addHandler(
                    'search-results',
                    function(event) {
                        var response= event.response;
                        self.bus.fireEvent(new mol.bus.Event('close-autocomplete'));
                        self.results = mol.services.cartodb.convert(response);
                        self.profile = new mol.map.results.SearchProfile(self.results);
                        if (self.getLayersWithIds(self.results.layers).length > 0) {
                            self.showFilters(self.profile);
                            self.showLayers(self.results.layers);
                        } else {
                            self.showNoResults();
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
                    position: google.maps.ControlPosition.TOP_LEFT
                },
                event = new mol.bus.Event('add-map-control', params);

                this.bus.fireEvent(event);
            },

            /**
             * Handles layers (results) to display by updating the result list
             * and filters.
             *
             * layers:
             *    0:
             *      name: "Coturnix delegorguei"
             *      source: "eafr"
             *      type: "points"
             *
             * @param layers an array of layers
             */
            showLayers: function(layers) {
                var display = this.display;

                display.clearResults();

                // Set layer results in display.
                 _.each(
                    this.display.setResults(this.getLayersWithIds(layers)), //passing in self so I can fire events in resultdisplay
                    function(result) {
                    // TODO: Wire up results.
                        result.source.click(
                            function(event) {
                                self.bus.fireEvent(new mol.bus.Event('metadata-toggle', {params : { type: $.data(result[0],'layer').type, provider: $.data(result[0],'layer').source, _class: $.data(result[0],'layer')._class, name: $.data(result[0],'layer').name }}));
                                event.stopPropagation();
                                event.cancelBubble = true;
                            }
                        );
                        result.type.click(
                            function(event) {
                                self.bus.fireEvent(new mol.bus.Event('metadata-toggle', {params : { type: $.data(result[0],'layer').type}}));
                                event.stopPropagation();
                                event.cancelBubble = true;
                            }
                        );
                    },
                    this
                  );
                this.display.noResults.hide();
                this.display.results.show();
                this.display.toggle(true);
            },
            /*
             * Displays a message when no results are returned from the search query.
             */
            showNoResults: function() {
                this.display.clearFilters();
                this.display.results.hide();
                this.display.noResults.show();
                this.display.toggle(true);
            },
            /**
             * Returns an array of layer objects {id, name, type, source}
             * with their id set given an array of layer objects
             * {name, type, source}.
             */
            getLayersWithIds: function(layers) {
                return  _.map(
                    layers,
                    function(layer) {
                        return _.extend(layer, {id: mol.core.getLayerId(layer)});
                    }
                );
            },

            showFilters: function(profile) {
                var display = this.display,
                layerNames = profile.getKeys('names'),
                sourceNames = profile.getKeys('sources'),
                typeNames = profile.getKeys('types');

                display.clearFilters();

                // Set name options in display.
                _.each(
                    display.setOptions('Names', layerNames),
                    function (option) {
                        option.click(this.optionClickCallback(option, 'Names'));
                    },
                    this
                );

                // Set source options in display.
                _.each(
                    display.setOptions('Sources', sourceNames),
                    function (option) {
                        option.click(this.optionClickCallback(option, 'Sources'));
                    },
                    this
                );

                // Set type options in display.
                _.each(
                    display.setOptions('Types', typeNames),
                    function (option) {
                        option.click(this.optionClickCallback(option, 'Types'));
                    },
                    this
                );

            },

            /**
             * Returns a function that styles the option as selected and removes
             * the selected styles from all other items. This is what gets fired
             * when a filter option is clicked.
             *
             * @param filter mol.map.results.FilterDisplay
             * @param option the filter option display
             */
            optionClickCallback: function(option, filterName) {
                var self = this;

                return function(event) {
                    self.display.clearOptionSelections(filterName);
                    option.addClass('selected');
                    self.updateDisplay();
                };
            },

            /**
             * When a filter is clicked, the search display results are
             * dynamically updated to match name, source, and type. This
             * is the function that makes that happen. It calculates the
             * new layers (results) that are viewable and calls the
             * handleResults() function.
             *
             */
            updateDisplay: function() {
                var name = this.display.getOptions('Names', true)[0].attr('id'),
                source = this.display.getOptions('Sources', true)[0].attr('id'),
                type = this.display.getOptions('Types', true)[0].attr('id'),
                layers = this.profile.getNewLayers(
                    name !== 'All' ? name : null,
                    source !== 'All' ? source : null,
                    type !== 'All'? type : null);

                this.showLayers(layers);
            }
        }
    );

    /**
     * The main display for search results. Contains a search box, a search
     * results list, and search result filters. This is the thing that gets
     * added to the map as a control.
     */
    mol.map.results.ResultsDisplay = mol.mvp.View.extend(
        {
            init: function() {
                var html = '' +
                    '<div class="mol-LayerControl-Results">' +
                    '  <div class="filters"></div>' +
                    '  <div class="searchResults widgetTheme">' +
                    '    <div class="results">' +
                    '      <div class="resultHeader">' +
                    '         Results' +
                    '         <a href="#" class="selectNone">none</a>' +
                    '         <a href="#" class="selectAll">all</a>' +
                    '      </div>' +
                    '      <ol class="resultList"></ol>' +
                    '      <div class="pageNavigation">' +
                    '         <button class="addAll">Map Selected Layers</button>' +
                    '      </div>' +
                    '    </div>' +
                    '    <div class="noresults">' +
                    '      <h3>No results found.</h3>' +
                    '    </div>' +
                    '  </div>' +
                    '</div>';

                this._super(html);
                this.resultList = $(this).find('.resultList');
                this.filters = $(this).find('.filters');
                this.selectAllLink = $(this).find('.selectAll');
                this.selectNoneLink = $(this).find('.selectNone');
                this.addAllButton = $(this).find('.addAll');
                this.results = $(this).find('.results');
                this.noResults = $(this).find('.noresults');
            },

            clearResults: function() {
                this.resultList.html('');
            },

            clearFilters: function() {
                this.filters.html('');
            },

            /**
             * Makes all options for a filter unselected.
             */
            clearOptionSelections: function(filterName) {
                _.each(
                    this.getOptions(filterName),
                    function(option) {
                        option.removeClass('selected').addClass('option');
                    }
                );
            },

            toggleSelections: function(showOrHide) {
                $('.checkbox').each(
                    function() {
                        $(this).attr('checked', showOrHide);
                    }
                );
            },

            /**
             * Returns an array of jquery result objects that are checked.
             */
            getChecked: function() {
                var checked = _.filter(
                    this.resultList.children(),
                    function(result) {
                        if ($(result).find('.checkbox').attr('checked')) {
                            return true;
                        } else {
                            return false;
                        }
                    },
                    this
                );

                return _.map(
                    checked,
                    function(result) {
                        return $(result);
                    }
                );
            },

            /**
             * Sets the results and returns them as an array of JQuery objects.
             *
             * @param layers An array of layer objects {id, name, type, source}
             */
            setResults: function(layers) {
                return _.map(
                    layers,
                    function(layer) {
                        var result = new mol.map.results.ResultDisplay(layer);
                        this.resultList.append(result);
                        return result;
                    },
                    this
                );
            },

            /**
             * Sets the options for a filter and returns the options as an array
             * of JQuery objects.
             */
            setOptions: function(filterName, optionNames) {
                var self = this,
                filter = new mol.map.results.FilterDisplay(filterName),
                options =  _.map(
                    optionNames,
                    function(name) {
                        var option = new mol.map.results.OptionDisplay(name);
                        filter.options.append(option);
                        return option;
                    }
                );

                filter.attr('id', filterName);
                this.filters.append(filter);
                return _.union([filter.allOption], options);
            },

            /**
             * Returns an array of filter options as JQuery objects. If
             * selected is true, only returns options that are selected.
             */
            getOptions: function(filterName, selected) {
                var filter = this.filters.find('#{0}'.format(filterName)),
                options =  _.filter(
                    filter.find('.option'),
                    function(option) {
                        var opt = $(option);

                        if (!selected) {
                            return true;
                        } else if (opt.hasClass('selected')) {
                            return true;
                        } else {
                            return false;
                        }
                    }
                );

                return _.map(
                    options,
                    function(option) {
                        return $(option);
                    }
                );
            }
        }
    );
    /**
     * The display for a single search result that lives in the result list.
     *
     * @param parent the .resultList element in search display
     */
    mol.map.results.ResultDisplay = mol.mvp.View.extend(
        {
            init: function(layer) {
                var self=this, html = '' +
                    '<div>' +
                    '<ul id="{0}" class="result">' +
                    '<div class="resultSource"><button><img class="source" title="Layer Source: {7}" src="/static/maps/search/{2}.png"></button></div>' +
                    '<div class="resultType" ><button ><img class="type" title="Layer Type: {6}" src="/static/maps/search/{3}.png"></button></div>' +
                    '<div class="resultName">' +
                    '  <div class="resultRecords">{5} features</div>' +
                    '  <div class="resultNomial">{1}</div>' +
                    '  <div class="resultEnglishName" title="{4}">{4}</div>' +
                    '  <div class="resultAuthor"></div>' +
                    '</div>' +
                    '<label class="buttonContainer">' +
                    ' <input type="checkbox" class="checkbox" />' +
                    '   <span class="customCheck"></span>' +
                    '</label> ' +
                    '</ul>' +
                    '<div class="break"></div>' +
                    '</div>';

                this._super(html.format(layer.id, layer.name, layer.source, layer.type, layer.names, layer.feature_count, layer.type_title, layer.source_title));
                $.data(this[0],'layer',layer);
                this.infoLink = $(this).find('.info');
                this.nameBox = $(this).find('.resultName');
                this.source = $(this).find('.source');
                this.type = $(this).find('.type');
                this.checkbox = $(this).find('.checkbox');
            }
        }
    );

    /**
     * The display for a single search result filter. Allows you to select a name,
     * source, or type and see only matching search results.
     */
    mol.map.results.FilterDisplay = mol.mvp.View.extend(
        {
            init: function(name) {
                var html = '' +
                    '<div class="filter widgetTheme">' +
                    '    <div class="filterName">{0}</div>' +
                    '    <div class="options"></div>' +
                    '</div>';

                this._super(html.format(name));
                this.name = $(this).find('.filterName');
                this.options = $(this).find('.options');
                this.allOption = new mol.map.results.OptionDisplay('All');
                this.allOption.addClass('selected');
                this.options.append(this.allOption);
            }
        }
    );


    mol.map.results.OptionDisplay = mol.mvp.View.extend(
        {
            init: function(name) {
                var name_mappings = {
                    "gbif": "GBIF",
                    "wdpa": "Scientist/Literature",
                    "wwf": "WWF",
                    "jetz": "Scientist/Literature",
                    "iucn": "IUCN",
                    "fishes": "Scientist/Literature",
                    "points": "Points",
                    "range": "Expert range maps",
                    "protectedarea": "Local inventories",
                    "ecoregion": "Regional checklists"
                };

                mapped_name = name_mappings[name];

                if(name == "All") {
                    this._super('<div id="{0}" class="option" style="text-align: right; margin-right: 10px;"><span class="option_text"><strong>all</strong></span></div>'.format(name, mapped_name));
                } else if(!mapped_name) {
                    this._super('<div id="{0}" class="option"><span class="option_text">{1}</span></div>'.format(name, name));
                } else
                    this._super('<div id="{0}" class="option"><button><img type="source" style="width: 12px; height: 12px; margin: 0.5px;" src="/static/maps/search/{0}.png"></button> <span class="option_text">{1}</span></div>'.format(name, mapped_name));

            }
        }
    );


    /**
     * This class supports dynamic search result filtering. You give it a name,
     * source, type, and search profile, and you get back all matching results
     * that satisfy those constraints. This is the thing that allows you to
     * click on a name, source, or type and only see those results.
     *
     * TODO: This could use a refactor. Lot's of duplicate code. <<< +1 -- j
     */
    mol.map.results.SearchProfile = Class.extend(
        {
            init: function(response) {
                this.response = response;
            },

            /**
             * Gets layer namesthat satisfy a name, source, and type combined
             * constraint.
             *
             * @param name the layer name
             * @param source the layer source
             * @param type the layer type
             * @param profile the profile to test
             *
             */
            getNewLayers: function(name, source, type, englishname, profile) {
                var layers = this.getLayers(name, source, type, englishname, profile);

                return _.map(
                    layers,
                    function(layer) {
                        return this.getLayer(parseInt(layer));
                    },
                    this
                );
            },

            getLayers: function(name, source, type, englishname, profile) {
                var response = this.response,
                currentProfile = profile ? profile : 'nameProfile',
                nameProfile = name ? response.names[name] : null,
                sourceProfile = source ? response.sources[source] : null,
                typeProfile = type ? response.types[type] : null,
                englishnameProfile = englishname ? response.englishnames[englishname] : null,
                profileSatisfied = false;

                if (!name && !type && !source && !englishname){
                    var keys = new Array();
                    for (i in response.layers) {
                        keys.push(i);
                    };
                    return keys;
                }

                switch (currentProfile) {

                case 'nameProfile':
                    if (!name) {
                        return this.getLayers(name, source, type, englishname, 'sourceProfile');
                    }

                    if (nameProfile) {
                        if (!source && !type) {
                            return nameProfile.layers;
                        }
                        if (source && type) {
                            if (this.exists(source, nameProfile.sources) &&
                                this.exists(type, nameProfile.types)) {
                                return _.intersect(
                                    nameProfile.layers,
                                    this.getLayers(name, source, type, englishname, 'sourceProfile'));
                            }
                        }
                        if (source && !type) {
                            if (this.exists(source, nameProfile.sources)) {
                                return _.intersect(
                                    nameProfile.layers,
                                    this.getLayers(name, source, type, englishname, 'sourceProfile'));
                            }
                        }
                        if (!source && type) {
                            if (this.exists(type, nameProfile.types)) {
                                return _.intersect(
                                    nameProfile.layers,
                                    this.getLayers(name, source, type, englishname, 'typeProfile'));
                            }
                        }
                    }
                    return [];

                case 'sourceProfile':
                    if (!source) {
                        return this.getLayers(name, source, type, englishname,'typeProfile');
                    }

                    if (sourceProfile) {
                        if (!name && !type) {
                            return sourceProfile.layers;
                        }
                        if (name && type) {
                            if (this.exists(name, sourceProfile.names) &&
                                this.exists(type, sourceProfile.types)) {
                                return _.intersect(
                                    sourceProfile.layers,
                                    this.getLayers(name, source, type, englishname,'typeProfile'));
                            }
                        }
                        if (name && !type) {
                            if (this.exists(name, sourceProfile.names)) {
                                return sourceProfile.layers;
                            }
                        }
                        if (!name && type) {
                            if (this.exists(type, sourceProfile.types)) {
                                return _.intersect(
                                    sourceProfile.layers,
                                    this.getLayers(name, source, type, englishname, 'typeProfile'));
                            }
                        }
                    }
                    return [];
                /*TODO englishname profile */

                case 'typeProfile':
                    if (!type) {
                        return [];
                    }

                    if (typeProfile) {
                        if (!name && !source) {
                            return typeProfile.layers;
                        }
                        if (name && source) {
                            if ( this.exists(name, typeProfile.names) &&
                                 this.exists(source, typeProfile.sources)) {
                                return typeProfile.layers;
                            }
                        }
                        if (name && !source) {
                            if (this.exists(name, typeProfile.names)) {
                                return typeProfile.layers;
                            }
                        }
                        if (!name && source) {
                            if (this.exists(source, typeProfile.sources)) {
                                return typeProfile.layers;
                            }
                        }
                    }
                    return [];

                }
                return [];
            },

            getLayer: function(layer) {
                return this.response.layers[layer];
            },

            getKeys: function(id) {
                var res;
                switch(id.toLowerCase()){
                case "types":
                    res = this.response.types;
                    break;
                case "sources":
                    res = this.response.sources;
                    break;
                case "names":
                    res = this.response.names;
                    break;
                case "englishnames":
                    res = this.response.englishnames;
                    break;
                }
                return _.keys(res);
            },

            getTypeKeys: function() {
                var x = this.typeKeys,
                types = this.response.types;
                return x ? x : (this.typeKeys = _.keys(types));
            },

            getType: function(type) {
                return this.response.types[type];
            },

            getSourceKeys: function() {
                var x = this.sourceKeys,
                sources = this.response.sources;
                return x ? x : (this.sourceKeys = _.keys(sources));
            },

            getSource: function(source) {
                return this.response.sources[source];
            },

            getNameKeys: function() {
                var x = this.nameKeys,
                names = this.response.names;
                return x ? x : (this.nameKeys = _.keys(names));
            },

            getName: function(name) {
                return this.response.names[name];
            },
            getEnglishNameKeys: function() {
                var x = this.englishnameKeys,
                englishnames = this.response.englishnames;
                return x ? x : (this.englishnameKeys = _.keys(englishnames));
            },

            getEnglishName: function(englishname) {
                return this.response.englishnames[englishname];
            },
            /**
             * Returns true if the name exists in the array, false otherwise.
             */
            exists: function(name, array) {
                return _.indexOf(array, name) != -1;
            }
        }
    );
};