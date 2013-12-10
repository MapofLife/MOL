/**
 * This module provides support for rendering search results.
 */
mol.modules.map.results = function(mol) {

    mol.map.results = {};

    mol.map.results.ResultsEngine = mol.mvp.Engine.extend({
        /**
         * @param bus mol.bus.Bus
         */
        init: function(proxy, bus, map) {
            this.proxy = proxy;
            this.bus = bus;
            this.map = map;
            this.maxLayers = ($.browser.chrome) ? 6 : 100;

            /** 
             * this.current_results = []
             *
             * Stores the currently displayed results.
             */
            this.current_results = [];

            /**
             * this.flag_synonym_bar_displayed = (0|1)
             *
             * The synonym bar displays "Synonyms" between direct and synonym 
             * search results. This flag is turned on once the bar has been 
             * displayed, preventing it from being displayed multiple times,
             * where multiple synonym searches return separate results, for
             * instance.
             */
            this.flag_synonym_bar_displayed = 0; 

            /**
             * this.synonym_search_counter = 0, 1, ...
             *
             * The number of ongoing asynchronous synonym searches. When zero,
             * no synonym searches are ongoing, so if rows are being added,
             * it must be from a direct search. If > 0, then rows are being
             * added by a synonym search. As the results from synonym searches
             * return to this module, this counter in decremented, and once
             * it returns to zero, any "Please wait, synonym search in 
             * progress  ..." messages are hidden.
             */
            this.synonym_search_counter = 0; 

            this.filters = { 
                'name': {
                    title: 'Name', 
                    hasIcon: false, 
                    title_field : 'name', 
                    values: {}
                },
                'source_type':{ 
                    title: 'Source', 
                    hasIcon: true, 
                    title_field : 'source_type_title', 
                    values: {}
                },
                'type': {
                    title: 'Type',
                    hasIcon: true,
                    title_field : 'type_title',
                    values: {}
                }
            }
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
        clearResults: function() {
            this.display.toggle(false);
            this.display.clearResults();
            this.display.clearFilters();
            delete(this.results);
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
                'clear-results',
                function(event) {
                    self.clearResults();
                }
            );
            this.bus.addHandler(
                'results-map-selected',
                function(event) {
                    self.display.addAllButton.click();
                }
            );
            this.display.clearResultsButton.click(
                function(event) {
                    self.clearResults();
                }
            );
            /**
             * Clicking the 'map selected layers' button fires an 'add-layers'
             * event on the bus.
             */
            this.display.addAllButton.click(
                function(event) {
                    var layers = self.display.getChecked(), clearResults = false;
                    if(self.display.find('.result').filter(':visible').length == layers.length) {
                        clearResults = true;
                    } 
                    //remove layers that are already mapped
                    self.map.overlayMapTypes.forEach(
                          function(layer) {
                              _.each(
                                  layers,
                                  function(newLayer) {
                                      if(newLayer.id==layer.name) {
                                          layers = _.without(layers, newLayer);
                                      }
                                  }
                              )
                          }
                    );
                    if(self.map.overlayMapTypes.length + layers.length > self.maxLayers) {
                        if(!$.browser.chrome) {
                            alert(
                                'The map is currently limited to {0}'.format(self.maxLayers) +
                                ' layers at a time. Please remove some layers ' +
                                ' before adding more.'
                            );
                            
                        } else {
                            alert(
                                'An issue with Google Chrome currently limits the number '+
                                ' of active layers in Map of Life to {0}'.format(self.maxLayers) +
                                ' layers at a time. Other browsers may display up to 100 layers.'
                            )
                        }
                    } else {
                        self.bus.fireEvent(
                            new mol.bus.Event(
                                'add-layers',
                                {
                                    layers: layers
                                }
                            )
                        );
                        if(clearResults) {
                            self.clearResults();
                            
                        }
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
                    if(self.current_results.length == 0) {
                        self.display.toggle(false);
                    } else {
                        if (event.visible === undefined) {
                            self.display.toggle(
                                "slide",
                                {direction: "left"},
                                1000
                            );
                        } else if (event.visible && self.display.not(':visible')) {
                            self.display.show(
                                "slide",
                                {direction: "left"},
                                1000
                            );
                        } else if (self.display.is(':visible')){
                            self.display.hide(
                                "slide",
                                {direction: "left"},
                                1000
                            );
                        }
                    }
                }
            );

            /**
             * Callback that displays search results. If synonym searches
             * are in progress, these will be added to the search results
             * instead of overwriting them.
             */
            this.bus.addHandler(
                'search-results',
                function(event) {
                    var response = event.response;
                    var search_type = 'direct';
 
                    // Turn off autocomplete.
                    self.bus.fireEvent(new mol.bus.Event('close-autocomplete'));

                    console.log("*** search results for: " + event.term + ".");
                    console.log("synonym_search_counter = " + this.synonym_search_counter);

                    // Are we in a synonym search or a direct search?
                    if(this.synonym_search_counter > 0) {
                        // We are in a synonym search!
                        this.synonym_search_counter--;

                        if(this.synonym_search_counter == 0) {
                            // All synonyms are done. Turn off the 
                            // 'please wait ...' display.
                            self.display.synonymSearchInProgress.hide();
                            self.display.synonymSearchEnded.show();
                        }

                        // Change the search type to 'synonym'.
                        search_type = 'synonym';

                    } else {
                        // No ongoing synonym searches in progress.
                        // So this is a new direct search result!

                        // Turn off the previous synonym display.
                        self.display.synonymDisplay.hide();
                        self.display.synonymDisplay.synonymList.html("");

                        // Clear synonym flags and counters.
                        self.flag_synonym_bar_displayed = 0;
                        this.synonym_search_counter = 0;

                        // Clear synonym UI.
                        self.display.synonymSearchInProgress.hide();
                        self.display.synonymSearchEnded.show();

                        // Clear current results.
                        self.current_results = [];
                        self.display.clearResults();
                    }

                    // Rows found by the search.
                    var rows_found = response.rows;

                    // Find all the rows we need to add in this operation.
                    // Uniqueness is determined by concatenating the source_type,
                    // dataset_id and name.
                    var time_start = new Date().getTime();
                    var ids_currently_in_use = _.map(self.current_results,
                        function(row) {
                            return (row.source_type + "-" + row.dataset_id + 
                                "-" + row.name);
                        }
                    );
                    var rows_to_add = _.filter(rows_found,
                        function(row) {
                            var id = (row.source_type + "-" + row.dataset_id
                                + "-" + row.name);
                            return(ids_currently_in_use.indexOf(id) == -1);
                        }
                    );
                    console.log("Time taken to test for duplicates: " + 
                        (new Date().getTime() - time_start) + " ms");

                    // Display the synonym bar if appropriate.
                    if(
                        rows_to_add.length > 0 && 
                        search_type == 'synonym' && 
                        self.flag_synonym_bar_displayed == 0
                    ) {
                        self.flag_synonym_bar_displayed = 1;
                        self.display.resultList.append(self.display.synonymBar.clone());
                    }

                    // Add the new search results back to current_results. 
                    // Since we've already eliminated duplicates, this will 
                    // only add non-duplicates.
                    if(rows_to_add.length > 0)
                        self.current_results = self.current_results.concat(rows_to_add);

                    // Now,this.current_results is all current results,
                    // and rows_to_add are the new rows to add because
                    // of these search results.

                    // console.log("search_type: " + search_type);
                    // console.log("current_results: " + self.current_results.join(', ') + " (" + self.current_results.length + ")");
                    // console.log("rows_to_add: " + rows_to_add.join(', ') + " (" + rows_to_add.length + ")");

                    if (self.current_results.length > 0) {
                        self.showFilters(self.current_results);

                        // We only want to add the new rows.
                        self.showLayers(rows_to_add);

                        // Synonym matches shouldn't trigger further
                        // synonym searching.
                        if(search_type != 'synonym')
                            self.searchForSynonyms(event.term);
                    } else {
                        self.showNoResults();

                        // Synonym matches shouldn't trigger further
                        // synonym searching.
                        if(search_type != 'synonym')
                            self.searchForSynonyms(event.term);
                    }
                }
            );
        },

        /**
         * Check with TaxRefine for known synonyms of this name,
         * pick the most likely accepted name, add it to the search
         * display, and search for it to extend the current search.
         *
         * TaxRefine uses the GBIF APIs to try to pick the best
         * supported interpretation of a particular taxonomic name.
         * Find out more at 
         * https://github.com/gaurav/taxrefine/#taxrefine
         *
         * Parameters:
         *  name: the name to search for.
         *                  
         */
        searchForSynonyms: function(name) {
            // Store the URL.
            var refine_url = 
                "http://refine.taxonomics.org/gbifchecklists/reconcile?callback=?&query=" 
                + encodeURIComponent(name);

            // Store display for easy access.
            var display = this.display;

            // Display the 'processing ...' message.
            display.synonymSearchEnded.hide();
            display.synonymSearchInProgress.show();
            console.log("searchForSynonyms: " + name
                + " (" + this.synonym_search_counter + ")");

            // For testing reasons, if the URL contains 'test-break-taxrefine'
            // change the refine_url so we can see what happens if TaxRefine
            // is down.
            if(window.location.href.indexOf("test-break-taxrefine") != -1) {
                refine_url = refine_url.replace("//refine.", "//refine-b.");
            }

            // Query TaxRefine.
            $.ajax(refine_url,
                {
                    dataType: "json",
                    timeout: 10000,
                    complete: function() {
                        // Log the completion of the JSON request.
                        console.log("JSONP request complete for " + name + " (" 
                            + this.synonym_search_counter + ")");
                    },
                    error: function(jqXHR, textStatus, errorThrown) {
                        // Log the error.
                        console.log("Error in JSONP request: " + textStatus 
                            + "/" + errorThrown);

                        // Turn off the UI.
                        display.synonymSearchInProgress.hide();
                        display.synonymSearchEnded.show();
                    },
                    success: function(result) {
                        // Make sure we have some results.
                        if(!result.result)
                            return;
                        var names = result.result;

                        // We use this hash to make sure we don't repeat a name.
                        //
                        // Add the actual name to this: we don't want to say that
                        // 'Panthera tigris' is a synonym of 'Panthera tigris'.
                        var duplicateNameCheck = {};
                        duplicateNameCheck[name.toLowerCase()] = 1;
                         
                        // Make a list of all non-duplicate synonyms, whether
                        // they are junior synonyms ("related") or senior synonyms
                        // ("accepted").
                        // 
                        // This is particularly importance for TaxRefine which
                        // differentiates between identical names in, say,
                        // different kingdoms.
                        var synonyms = [];

                        // Go through all the names that TaxRefine matched.
                        names.forEach(function(name_usage) {
                            // If there is a canonical name, store it.
                            if(name_usage.summary && name_usage.summary.canonicalName) {
                                var canonicalName = name_usage.summary.canonicalName;

                                // Make a list of canonical name as long as they
                                // haven't been duplicated.
                                if(!duplicateNameCheck[canonicalName.toLowerCase()]) {
                                    synonyms.push({
                                        'name': canonicalName,
                                        'url': name_usage.type[0] + name_usage.id,
                                        'type': 'related',
                                        'score': name_usage.score
                                    });
                                    duplicateNameCheck[canonicalName.toLowerCase()] = 1;
                                }
                            }

                            // If there is an accepted name, store it.
                            if(name_usage.summary && name_usage.summary.accepted) {
                                var acceptedName = name_usage.summary.accepted;

                                // The accepted name usually has authority information. So let's find 
                                // a leading monomial/binomial/trinomial.
                                var match = acceptedName.match(/^\s*([A-Z][a-z\.]+(?:\s+[a-z\.]+(?:\s+[a-z]+)?)?)/);
                                if(match) {
                                    // console.log("Matched '" + acceptedName + "' as '" + match[1] + "'");
                                    acceptedName = match[1];
                                } else {
                                    // console.log("Unable to match '" + acceptedName + "'.");
                                }

                                // If we found an accepted name, and it's not on the duplicate name check.
                                if(!duplicateNameCheck[acceptedName.toLowerCase()]) {
                                    synonyms.push({
                                        'name': acceptedName,
                                        'url': name_usage.type[0] + name_usage.id,
                                        'type': 'accepted',
                                        'score': name_usage.score
                                    });
                                    duplicateNameCheck[acceptedName.toLowerCase()] = 1;
                                }
                            }
                    });

                    // No synonyms? Then we're done.
                    if(synonyms.length == 0)
                        return;

                    // Sort the synonyms first by the 'type' ('accepted' sorted above 'related')
                    // and then by the score.
                    synonyms.sort(function(a,b) {
                        if(b.type == a.type)
                            return b.score - a.score;
                        else {
                            if(b.type > a.type) {
                                return 1;
                            } else {
                                return -1;
                            }
                        }
                    });

                    // Render all the synonyms into HTML and display them.
                    var index = 0;
                    synonyms.forEach(function(synonym) {
                        index++;

                        // Get the variables we stored.
                        var name = synonym.name;
                        var url = synonym.url;
                        var type = synonym.type;
                        var score = synonym.score;
                        var source = synonym.source;

                        // Set the name and details in the synonymListItem.
                        var synonymItem = display.synonymDisplay.synonymListItem.clone();
                        $("#name", synonymItem).text(name);

                        /*
                         * Adds details about the synonym item. We don't need
                         * this for now.
                         * 
                        var detailsItem = $("#details", synonymItem);
                        detailsItem.html("<div style='width:100%; text-align: center'>" + score + "&nbsp;checklist(s) <a target='_blank' style='color: rgb(230, 250, 230);' href='" + url + "'>on GBIF</a></div>");
                        detailsItem.hide();

                        if(type == 'accepted') {
                            // Something to distinguish this would be nice,
                            // but (1) it doesn't seem to come up often, and
                            // (2) bold just looks ugly.
                            // synonymItem.css('font-weight', 'bold');
                        }

                        */ 
                        
                        // Figure out where to place commas and 'and's.
                        if(index == 1) {
                            // Don't display anything before the first item.
                        } else if(index == synonyms.length) {
                            display.synonymDisplay.synonymList.append(" and ");
                        } else {
                            display.synonymDisplay.synonymList.append(", ");
                        }

                        // Add this to the synonym list.
                        display.synonymDisplay.synonymList.append(synonymItem);

                        // Search for this synonym by expanding the current 
                        // search. Increment the synonym_search_counter so we
                        // know that we are doing synonym searches.
                        self.synonym_search_counter++;
                        self.bus.fireEvent(
                            new mol.bus.Event(
                                'search',
                                {
                                    'term': name
                                }
                            )
                        );
                    });

                    // Set the searched name and GO!
                    display.synonymDisplay.searchedName.text(name);
                    display.synonymDisplay.show();
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

            // Set layer results in display.
             _.each(
                this.display.setResults(this.getLayersWithIds(layers)), 
                function(result) {
                    result.source.click(
                        function(event) {
                            self.bus.fireEvent(
                                new mol.bus.Event(
                                    'metadata-toggle',
                                    {params : { 
                                        dataset_id: $.data(result[0],'layer')
                                            .dataset_id,
                                        title: $.data(result[0],'layer')
                                            .dataset_title 
                                    }}
                                    
                                )
                            );
                            event.stopPropagation();
                            event.cancelBubble = true;
                        }
                    );
                    result.type.click(
                        function(event) {
                            self.bus.fireEvent(
                                new mol.bus.Event(
                                    'metadata-toggle', 
                                    {
                                        params : { 
                                            type: $.data(result[0],'layer')
                                                .type,
                                            title: $.data(result[0],'layer')
                                                .type_title,
                                        }
                                    }
                                )
                            );
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
         * Displays a message when no results are returned 
         * from the search query.
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

        showFilters: function(results) {
            var display = this.display,
                filters = this.filters,
                self = this;
            
            
            
            //parse result to fill in the filter values
            _.each(
                _.keys(filters),
                //each filter runs on a layer property
                function(filter) {
                    //first clear out any old filter content
                    filters[filter].values ={};
                    _.each(
                        results,
                        //for each property, set a filter with a title
                        function(row) {    
                            if(row[filter]) {                 
                                filters[filter]
                                    .values[row[filter].replace(/ /g, '_')] 
                                    =  row[filters[filter].title_field];
                            }
                        }
                    );
                }     
            );
            
            display.clearFilters();

            // Set options in each filter.
            _.each(
                _.keys(filters),
                function(filter) {
                    _.each(
                        display.setOptions(
                            filters[filter].title, 
                            filter, 
                            filters[filter].values, 
                            filters[filter].hasIcon
                        ),
                        function(option) {
                            if(option.click) {
                                option.click(
                                    self.optionClickCallback(
                                        option, 
                                        filter
                                    )
                                );
                            }
                        }
                    );
                }
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
                self.updateFilters(option, filterName)
                self.updateResults();
            };
        },
        /*
         *  Creates an array of strings that define the current filter state.
         *  ['type-range,',]
         */
        getSelectedFilters: function() {
            var filters = [];
            _.each(
                $(this.display.filters).find('.filter'),
                function(group) {
                    var options= [];
                    _.each(
                        $(group).find('.selected'),
                        function(filter) {
                            _.each(
                                _.keys($(filter).data()),
                                function(key) {
                                    options.push(
                                        '.{0}-{1}'.format(
                                            key, 
                                            $(filter).data(key)
                                        )
                                    );
                                }
                            );
                        }
                    );
                    if(options.length>0) {
                        filters.push(options.join(', '));
                    }
                }
            );
            return filters;
        },
        /*
         *  Updates the result list based on the selected filters.
         */
        updateResults: function() {
            var filters = this.getSelectedFilters(),
                results = $(this.display).find('.resultContainer'),
                newResults = []; 
            
            if(filters.length > 0) {
                //hide it all
                results.hide()
                //apply the filters
                _.each(
                    filters,
                    function(filter) {
                        results = results.filter(filter);
                    }
                )
                results.show();
             } else {
                results.show();
            }
            
        },
        /*
         *  Keeps the 'All' filter toggle states current.
         */
        updateFilters: function(option, filterName) {
            if(option.hasClass('selected')&&$.trim(option.text())!='All') {
                option.removeClass('selected');
                if(this.display
                       .find('.filter .options .{0}'.format(filterName))
                       .not('.all')
                       .filter('.selected')
                       .length == 0
                  ) {
                        this.display
                            .find('.filter .options .{0}'.format(filterName))
                            .filter('.all')
                            .addClass('selected');
                }
            } else {
                if($.trim(option.text())=='All') {
                    $(this.display.filters)
                        .find('.{0}'.format(filterName))
                        .removeClass('selected'); 
                } else {
                    $(this.display.filters)
                        .find('.{0} .all'.format(filterName))
                        .removeClass('selected');
                }
                option.addClass('selected');
            }
        }
    });

    /**
     * The main display for search results. Contains a search box, a search
     * results list, and search result filters. This is the thing that gets
     * added to the map as a control.
     */
    mol.map.results.ResultsDisplay = mol.mvp.View.extend({
        init: function() {
            var html = '' +
                '<div class="mol-LayerControl-Results">' +
                    '<div class="filters"></div>' +
                    '<div class="searchResults widgetTheme">' +
                        '<div class="results">' +
                            '<div class="resultHeader">' +
                                'Results' +
                                '<a href="#" class="selectNone">none</a>' +
                                '<a href="#" class="selectAll">all</a>' +
                                '<div class="synonymDisplay" style="display: none; padding-top: 5px; padding-bottom: 5px; border-bottom: 1px solid rgba(11, 11, 11, 0.298)">' +
                                    'Search<span class="synonymSearchInProgress">ing</span><span class="synonymSearchEnded">ed</span> for <span class="searchedName" style="font-style: italic">The name you searched for</span> and these known alternative names: <span class="synonymList"></span>.' +
                                '</div>' +
                            '</div>' +
                            '<ol class="resultList"></ol>' +
                            '<div class="pageNavigation">' +
                                '<button class="addAll">' +
                                    'Map Selected Layers' +
                                '</button>' +
                                '<button class="clearResults">' +
                                    'Clear Results' +
                                '</button>' +
                            '</div>' +
                        '</div>' +
                        '<div class="noresults">' +
                            '<h3>No results found.</h3>' +
                            '<div class="synonymSearchInProgress" style="display: none">' +
                                'Searching for synonyms and associated data ...' +
                            '</div>' +
                            '<div class="synonymDisplay" style="display: none">' +
                                '<div class="break" style="clear:both"></div>' + 
                                '<span class="searchedName" style="font-style: italic">The name you searched for</span> is also known as <span class="synonymList"></span><span class="synonymSearchInProgress">.</span><span class="synonymSearchEnded" style="display:none">, but we do not have data for any of those names.</span>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>';

            // What does one single synonym name entry look like? Some
            // alternatives are given below.
            var synonymListItem = "<em><span id='name'></span></em>";
            // var synonymListItem = "<span><em><span id='name'></span></em><sup><a id='url' target='_blank' style='font-size: 0.9em; color: rgb(230, 250, 230);' href='#'>ref</a></sup></span>";
            // var synonymListItem = "<span><em><a id='url' target='_blank' style='color: rgb(230, 250, 230);' href='#'><span id='name'></span></a>&nbsp;<img src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAVElEQVR42n3PgQkAIAhEUXdqJ3dqJ3e6IoTPUSQcgj4EQ5IlUiLE0Jil3PECXhcHGBhZ8kg4hwxAu3MZeCGeyFnAXp4hqNQPnt7QL0nADpD6wHccLvnAKksq8iiaAAAAAElFTkSuQmCC'></span>";
            // var synonymListItem = "<span><a id='url' href='#' target='_blank' style='color: rgb(230, 250, 230);'><em><span id='name'></span></em></a><span id='details'> (More details go here)</span></span>";

            // Separates direct search results from synonym search results.
            var synonymBar = "<div class='resultContainer'><center>Synonyms</center></div><div class='break'></div>"

            // Store some HTML elements in the display object so we can refer
            // to them directly.
            this._super(html);
            this.resultList = $(this).find('.resultList');
            this.filters = $(this).find('.filters');
            this.selectAllLink = $(this).find('.selectAll');
            this.selectNoneLink = $(this).find('.selectNone');
            this.addAllButton = $(this).find('.addAll');
            this.clearResultsButton = $(this).find('.clearResults');
            this.results = $(this).find('.results');
            this.noResults = $(this).find('.noresults');

            this.synonymSearchInProgress = $(this).find('.synonymSearchInProgress');
            this.synonymSearchEnded = $(this).find('.synonymSearchEnded');
            this.synonymBar = $(synonymBar);
            this.synonymDisplay = $(this).find('.synonymDisplay');
            this.synonymDisplay.searchedName = $(this.synonymDisplay).find('.searchedName');
            this.synonymDisplay.synonymList = $(this.synonymDisplay).find('.synonymList');
            this.synonymDisplay.synonymListItem = $(synonymListItem);
        },

        clearResults: function() {
            this.resultList.html('');
        },

        clearFilters: function() {
            this.filters.html('');
        },

        toggleSelections: function(showOrHide) {
            $(this).find('.checkbox').each(
                function() {
                    $(this).attr('checked', showOrHide);
                }
            );
        },

        /**
         * Returns an array of layer objects from results that are checked.
         */
        getChecked: function() {
            var checked = [];
            _.each(
                this.find('.resultContainer').filter(':visible'),
                function(result) {
                    if ($(result).find('.checkbox').attr('checked')) {
                        checked.push($(result).data('layer'));
                    } 
                }
            );
            return checked;
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
         * Sets the options for a filter and returns an array of jQuery objects.
         */
        setOptions: function(filterName, filterType, optionNames, hasIcon) {
            var self = this,
                filter = new mol.map.results.FilterDisplay(
                    filterType, 
                    filterName
                ),
                options = [filter.find('.all')];
           
            _.each(
                _.keys(optionNames),
                function(name) {
                    var option = new mol.map.results.OptionDisplay(
                        name, filterType, optionNames[name], hasIcon);
                    filter.options.append(option);
                    options.push(option);
                }
            );
            
            filter.attr('id', filterName);
            this.filters.append(filter);
            return(options);
        },

 
    });
    /**
     * The display for a single search result that lives in the result list.
     *
     * @param parent the .resultList element in search display
     */
    mol.map.results.ResultDisplay = mol.mvp.View.extend(
        {
            init: function(layer) {
                var self=this, html = '' +
                     //add filtertype-value as a class for filtering
                    '<div class="' +
                    '   resultContainer name-{1} source_type-{3} type-{4}">' +
                    '   <ul id="{0}" class="result">' +
                    '       <div class="resultSource">' +
                    '          <button>' +
                    '              <img class="source" ' +
                    '                  title="Layer Source: {8}" ' +
                    '                  src="/static/maps/search/{3}.png">' +
                    '          </button>' +
                    '       </div>' +
                    '       <div class="resultType">' +
                    '           <button>'+
                    '               <img class="type" ' +
                    '               title="Layer Type: {7}" ' +
                    '               src="/static/maps/search/{4}.png">' +
                    '           </button>' +
                    '       </div>' +
                    '       <div class="resultName">' +
                    '           <div class="resultRecords">{6}</div>' +
                    '           <div class="resultNomial">{2}</div>' +
                    '           <div class="resultEnglishName" title="{5}">' +
                    '               {5}' +
                    '           </div>' +
                    '           <div class="resultAuthor"></div>' +
                    '       </div>' +
                    '       <label class="buttonContainer">' +
                    '           <input type="checkbox" checked="checked" class="checkbox" />' +
                    '           <span class="customCheck"></span>' +
                    '       </label> ' +
                    '       </ul>' +
                    '   <div class="break"></div>' +
                    '</div>';

                
                this._super(
                    html.format(
                        layer.id,
                        layer.name.replace(/ /g, '_'),
                        layer.name, 
                        layer.source_type, 
                        layer.type, 
                        layer.names, 
                        (layer.feature_count != null) ? 
                            '{0}'.format(layer.feature_count) : '', 
                        layer.type_title, 
                        layer.source_title
                    )
                );
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
     * The display for a single search result filter. Allows you to select
     * a name, source, or type and see only matching search results.
     */
    mol.map.results.FilterDisplay = mol.mvp.View.extend(
        {
            init: function(type, title) {
                var html = '' +
                    '<div class="filter widgetTheme {0}">' +
                    '    <div class="filterName">{1}</div>' +
                    '    <div class="options"></div>' +
                    '</div>';

                this._super(html.format(type, title));
                this.name = $(this).find('.filterName');
                this.options = $(this).find('.options');
                this.allOption = new mol.map.results.OptionDisplay(
                    'all',
                     type,
                    'All', 
                    false
                );
                this.allOption.addClass('selected');
                this.options.append(this.allOption);
            }
        }
    );


    mol.map.results.OptionDisplay = mol.mvp.View.extend({
        init: function(name, type, value, hasIcon) {
            var base_html = '' +
                '<div class="option {0}"></div>',
                button_html = '' +
                '<button>' +
                '   <img src="/static/maps/search/{0}.png">'+
                '</button>',
                label_html = '' +
                '   <span class="option_text">{0}</span>';
                
            if(name != undefined && value != undefined) {    
                this._super(base_html.format(type));
                if(name != 'all') {
                    this.data(type, name); 
                } else {
                    this.addClass('all')
                }
                if(hasIcon) {
                    this.append($(button_html.format(name)));
                }
                this.append($(label_html.format(value)));
            }
            
        }
    });
}
