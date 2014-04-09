mol.modules.map.query = function(mol) {

    mol.map.query = {};

    mol.map.query.QueryEngine = mol.mvp.Engine.extend({
        init : function(proxy, bus, map) {

            this.proxy = proxy;
            this.bus = bus;
            this.map = map;
            this.seenHint = false;
            this.url = '' +
                'http://mol.cartodb.com/' +
                'api/v2/sql?callback=?&q={0}';
            // TODO: Docs for what this query does.
            this.list_url = 'list?dsid={0}&lon={1}&lat={2}&radius={3}&taxa={4}';
            this.sql = '' +
                "SELECT * FROM get_species_list('{0}',{1},{2},{3},'{4}')";
             // TODO: Docs for what this query does.
            this.csv_sql = '' +
                "SELECT * FROM get_species_list_csv('{0}',{1},{2},{3},'{4}')";
            this.queryct=0;
            this.overlayView = new google.maps.OverlayView();
            this.overlayView.draw = function () {};

            try {
                this.overlayView.setMap(map);
            } catch(e) {
                console.log('couldnt set overlayview');
            }

        },

        start : function() {
            var mode = unescape(
                window.location.pathname
                    .replace(/\//g, '')
                    .replace(/\+/g, ' ')
                    .replace(/_/g, ' ')
                );
            if (mode == 'lists') {
                this.enabled == true;
                this.addQueryDisplay();
                this.addEventHandlers();
                this.registerClick();
            }
        },

        toggleMapClicks : function(toggle) {
            var action = (toggle==true) ? 'list' : '';
            this.bus.fireEvent(
                new mol.bus.Event(
                    'layer-click-action',
                    {action: action}
                )
            );
        },

        /*
         *  Add the species list tool controls to the map.
         */
        addQueryDisplay : function() {
            var params = {
                    display: null,
                    slot: mol.map.ControlDisplay.Slot.TOP,
                    position: google.maps.ControlPosition.TOP_RIGHT
                },
                self = this;
                
            

            this.enabled=true;
            this.features={};
            this.display = new mol.map.QueryDisplay();
            params.display = this.display;
            this.bus.fireEvent(new mol.bus.Event(
                'add-map-control', params));
        },
        registerClick : function () {
            var self = this;

            this.map.setOptions({draggableCursor: 'pointer'});

            google.maps.event.addListener(
                this.map,
                "click",
                function(event) {
                    var params = {
                            gmaps_event : event,
                            map : self.map
                    };
                    self.bus.fireEvent(
                        new mol.bus.Event('species-list-query-click',params)
                    );
                }
            );
        },
        /*
         *  Method to build and submit an AJAX call that retrieves species
         *  at a radius around a lat, long.
         */
        getList: function(lat, lng, listradius, dataset_id, className) {
            var self = this,
                //hardcode class for now
                _class = self.display.dataset_id
                    .find('option:selected').data('class'),
                list_url = this.list_url.format(
                    dataset_id,
                    Math.round(lng*100)/100,
                    Math.round(lat*100)/100,
                    listradius.radius,
                    _class),
                zooms = {
                    "50000": 5,
                    "100000": 4,
                    "300000": 3
                },
                csv_sql = escape(
                    this.csv_sql.format(
                        dataset_id,
                        Math.round(lng*100)/100,
                        Math.round(lat*100)/100,
                        listradius.radius,
                        _class));

		    if ((lng > -16 || lat < 14) && dataset_id == 'iucn_reptiles') {
            	alert('Reptile species lists are currently only available for North America.');
            	listradius.setMap(null);
            	this.bus.fireEvent(new mol.bus.Event(
                            'hide-loading-indicator',
                            {source : 'listradius'}));
            	return;
            }
            if ((lat < 25.5 || lng > -16) && dataset_id == 'na_fish') {
            	alert('Fish species lists are currently only available for North America.');
            	listradius.setMap(null);
            	this.bus.fireEvent(new mol.bus.Event(
                            'hide-loading-indicator',
                            {source : 'listradius'}));
            	return;
            }
            if ((lat < 25.5 || lng > -16) && dataset_id == 'na_trees') {
            	alert('Tree species lists are currently only available for North America.');
            	listradius.setMap(null);
            	this.bus.fireEvent(new mol.bus.Event(
                            'hide-loading-indicator',
                            {source : 'listradius'}));
            	return;
            }
         


            if (self.queryct > 0) {
                alert('Please wait for your last species list request to ' +
                'complete before starting another.');
                listradius.setMap(null);
            } else {
            
            	self.map.panTo(new google.maps.LatLng(lat, lng))
            	if (self.map.getZoom() < zooms[listradius.radius]) {
                	self.map.setZoom(zooms[listradius.radius]);
            	}
            	self.map.panBy($(window).width()/4,0);
                self.queryct++;
                $.getJSON(
                    list_url,
                    function(data, textStatus, jqXHR) {
                        var results = {
                            listradius:listradius,
                            dataset_id: dataset_id,
                            _class: _class,
                            className : className,
                            response:data,
                            sql:csv_sql
                        },
                        e = new mol.bus.Event('species-list-query-results',
                            results);
                        self.queryct--;
                        self.bus.fireEvent(e);
                    }
                );
            }
        },
        clearLists: function() {
            _.each(
                this.features,
                function(feature) {
                    if(feature.listWindow) {
                        feature.listWindow.dialog("close");
                    }
                    if(feature.listradius) {
                        feature.listradius.setMap(null);
                    }
                    
                }
            );
            this.features={};
            this.queryct=0;
            try{
                this.overlayView.setMap(null)
            } catch(e) {};
            this.overlayView = new google.maps.OverlayView();
            this.overlayView.draw = function () {};

            try {
                this.overlayView.setMap(map);
            } catch(e) {
                console.log('couldnt set overlayview');
            }
        },

        addEventHandlers : function () {
            var self = this;
            /*
             * Attach some rules to the ecoregion /
             * range button-switch in the controls.
             */
            _.each(
                $('button',$(this.display.types)),
                function(button) {
                    $(button).click(
                        function(event) {
                            $('button',$(self.display.types))
                                .removeClass('selected');
                            $(this).addClass('selected');
                            if ($(this).hasClass('range') &&
                                self.display.dataset_id.val().
                                    toLowerCase().indexOf('reptil') > 0) {
                                alert('Available for North America only.');
                            }
                        }
                    );
                }
            );
			this.display.click(
				function(event){
					$(this).qtip('destroy');
				}
					
			);
            
            this.bus.addHandler(
                'clear-lists',
                function(event) {
                    self.clearLists();
                }
            );
            this.bus.addHandler(
                'list-local',
                function(event) {
                    var dataset_id = (event.dataset_id != undefined) ? 
                        event.dataset_id : 'jetz_maps',
                        className = (event.className != undefined) ? 
                        event.className : 'Aves';
                    $(self.display).find('.dataset_id').val(dataset_id);
                    self.bus.fireEvent(
                        new mol.bus.Event(
                            'show-loading-indicator', {source: 'geoloc'}));
                    
                    navigator.geolocation.getCurrentPosition(
                        
                        function(loc) {
                            self.bus.fireEvent(
                                new mol.bus.Event(
                                    'hide-loading-indicator', 
                                    {source: 'geoloc'}
                                )
                            );
                            self.bus.fireEvent(
                                new mol.bus.Event(
                                    'species-list-tool-toggle',
                                    {visible: true}
                                )
                            );
                            self.bus.fireEvent(
                                new mol.bus.Event(
                                    'species-list-query-click',
                                    {
                                        gmaps_event: {
                                            latLng: new google.maps.LatLng(
                                                loc.coords.latitude,
                                                loc.coords.longitude
                                            )
                                        },
                                        dataset_id:dataset_id,
                                        class_name: className
                                    }
                                )
                            );
                        
                        },
                        function(noloc) {
                            var lat = prompt(
                                'We could not determine your location.' +
                                'Please click a location on the map.');
                            
                        }
                    );
                }
            );
            this.bus.addHandler(
                'list-random',
                function(event) {
                    var dsid = (event.group != undefined) ? 
                        event.group : 'jetz_maps',
                        group_name = (event.group_name != undefined) ? 
                        event.group_name : 'Birds';
 
                    $.getJSON(
                        'http://mol.cartodb.com/api/v1/sql?q=' +
                        'SELECT ST_X(g) as lon, ST_Y(g) as lat ' +
                        'FROM ' +
                            '(SELECT ST_Centroid(the_geom) as g ' +
                             'FROM randland ' +
                             'LIMIT 1 ' +
                             'OFFSET ' +
                                'round(' +
                                    'random()*(SELECT count(*) FROM randland)' +
                                ')'+
                             ') c',
                         function(result) {
                            self.bus.fireEvent(
                                new mol.bus.Event(
                                    'species-list-tool-toggle',
                                    {visible: true}
                                )
                            );
                            self.bus.fireEvent(
                                new mol.bus.Event(
                                    'species-list-query-click',
                                    {
                                        gmaps_event: {
                                            latLng: new google.maps.LatLng(
                                                result.rows[0].lat,
                                                result.rows[0].lon
                                            )
                                        }
                                    }
                                )
                            );
                        
                        }
                    );
                }
            );
            
            this.bus.addHandler(
                'show-list-hint',
                function(event) {
                    if(!self.seenHint) {
                        $(self.display).qtip({
                            content: {
                                text: '' +
                                '<div class="mol-hint">'+
                                	'Click on the map to get a list of species. ' +
                                	'Use this control to change radius or group.' +
                            	'</div>'
                            },
                            position: {
                                my: 'top right',
                                at: 'bottom left'
                            },
                            show: {
                                event: false,
                                ready: true
                            },
                            hide: {
                                fixed: false,
                                event: 'unfocus'
                            }
                        });
                    }
                    self.seenHint = true
                }
            );

            /*
             *  Map click handler that starts a list tool request.
             */
            this.bus.addHandler(
                'species-list-query-click',
                function (event) {
                    var listradius, overlayPane,
                        datasetID = (event.dataset_id == null) ? 
                            $("option:selected",
                                $(self.display.dataset_id)).data(
                                    $('.selected',$(self.display.types)).val()
                                ): event.dataset_id,
                        className = (event.class_name == null)?  $("option:selected",
                            $(self.display.dataset_id)).text(): event.class_name;

                    if($(self.display).data('qtip')) {
                        $(self.display).qtip('destroy');
                    }
                    
                   
                    
                    if (self.enabled) {
                            listradius = new google.maps.Circle(
                            {
                                map: self.map,
                                radius: parseInt(
                                    self.display.radiusInput.val())*1000,
                                    // 50 km
                                center: event.gmaps_event.latLng,
                                strokeWeight: 3,
                                strokeColor: 'darkred',
                                clickable: true,
                                fillOpacity:0,
                                zIndex:0

                            }
                        );
                        

                        self.bus.fireEvent(new mol.bus.Event(
                            'show-loading-indicator',
                            {source : 'listradius'}));

                       
                        self.clearLists();
                        
                        self.getList(
                            event.gmaps_event.latLng.lat(),
                            event.gmaps_event.latLng.lng(),
                            listradius,
                            datasetID,
                            className);
                    }
                }
            );

            /*
             *  Assembles HTML for an species list given results from
             *  an AJAX call made in getList.
             */
            this.bus.addHandler(
                'species-list-query-results',
                function (event) {
                    var className,
                        listradius  = event.listradius,
                        latHem,
                        lngHem,
                        listRowsDone;

                    if (!event.response.error) {
                        className = event.className;
                        latHem = (listradius.center.lat() > 0) ? 'N' : 'S';
                        lngHem = (listradius.center.lng() > 0) ? 'E' : 'W';

                        listRowsDone = self.processListRows(
                                            listradius,
                                            className,
                                            latHem,
                                            lngHem,
                                            event.response.rows,
                                            event.sql);

                        self.displayListWindow(
                            listradius,
                            listRowsDone.speciestotal,
                            className,
                            latHem,
                            lngHem,
                            event.response.rows,
                            listRowsDone.content,
                            listRowsDone.dlContent,
                            listRowsDone.iucnContent);
                    } else {
                        listradius.setMap(null);
                       

                        delete(
                            self.features[listradius.center.toString()+
                                          listradius.radius]);
                    }
                    self.bus.fireEvent(
                        new mol.bus.Event(
                            'hide-loading-indicator',
                            {source : 'listradius'}));
                }
            );
            this.bus.addHandler(
                'hide-list',
                function(event, params) {
                    $(self.display).hide();
                }
            );
            this.bus.addHandler(
                'show-list',
                function(event, params) {
                    $(self.display).show();
                }
            );
            this.bus.addHandler(
                'species-list-tool-toggle',
                function(event, params) {
                    if (self.listradius) {
                        self.listradius.setMap(null);
                      
                    }

                    if (self.enabled == true) {
                        _.each(
                            self.features,
                            function(feature) {
                                //feature.listradius.setMap(self.map);
                                //feature.listWindow.setMap(self.map);
                            }
                        );

                        $(self.display.queryButton).addClass('selected');
                        $(self.display.queryButton).html("ON");
                        self.toggleMapClicks(true);
                    } else {
                         self.map.setOptions({draggableCursor: 'auto'});

                        _.each(
                            self.features,
                            function(feature) {
                                if(feature.listWindow) {
                                    feature.listWindow.dialog("close");
                                }
                                feature.listradius.setMap(null);
                                $(self.overlayPane.firstChild.firstChild).hide();

                            }
                        );

                        self.toggleMapClicks(false);
                    }
                }
            );

            this.display.radiusInput.blur(
                function(event) {
                    if (this.value > 1000) {
                        this.value = 1000;
                        alert(
                            'Please choose a radius between 50 km and 1000 km.'
                        );
                    }
                    if (this.value < 50) {
                        this.value = 50;
                        alert(
                            'Please choose a radius between 50 km and 1000 km.'
                        );
                    }
                }
            );

            this.display.dataset_id.change(
                function(event) {
                    if ($(this).val().toLowerCase().indexOf('fish') > 0) {
                        $(self.display.types).find('.ecoregion')
                            .toggle(false);
                        $(self.display.types).find('.ecoregion')
                            .removeClass('selected');
                        $(self.display.types).find('.range')
                            .toggle(false);
                        if ($(self.display.types).find('.range')
                            .hasClass('selected')) {
                                alert('Available for North America only.');
                        };
                    } else if ($(this).val().toLowerCase()
                        .indexOf('reptil') > 0) {
                        $(self.display.types).find('.ecoregion')
                            .toggle(true);
                        $(self.display.types).find('.ecoregion')
                            .removeClass('selected');
                        $(self.display.types).find('.range')
                            .toggle(true);
                        if ($(self.display.types).find('.range')
                            .hasClass('selected')) {
                                alert('Available for North America only.');
                        };
                    } else {
                        $(self.display.types).find('.ecoregion')
                            .toggle(false);
                        $(self.display.types).find('.range')
                            .toggle(false);
                        $(self.display.types).find('.range')
                            .addClass('selected');
                    }
                }
            );
        },

        /*
         * Processes response content for List dialog
         */
        processListRows: function(listrad, clnm, latH, lngH, rows, sqlurl) {
            var self = this,
                listradius = listrad,
                className = clnm,
                latHem = latH,
                lngHem = lngH,
                tablerows = [],
                providers = [],
                scientificnames = {},
                years = [],
                redlistCt = {},
                stats,
                speciestotal = 0,
                speciesthreatened = 0,
                speciesdd = 0;

            _.each(
                rows,
                function(row) {
                    var english = (row.english != null) ?
                            _.uniq(row.english.split(',')).join(',') : '',
                        year = (row.year_assessed != null) ?
                            _.uniq(row.year_assessed.split(',')).join(',') : '',
                        redlist = (row.redlist != null) ?
                            _.uniq(row.redlist.split(',')).join(',') : '',
                        tclass = "";

                    //create class for 3 threatened iucn classes
                    switch(redlist) {
                        case "VU":
                            tclass = "iucnvu";
                            break;
                        case "EN":
                            tclass = "iucnen";
                            break;
                        case "CR":
                            tclass = "iucncr";
                            break;
                    }

                    //list row header
                    tablerows.push(""+
                        "<tr class='master " + tclass + "'>" +
                        "   <td class='arrowBox'>" +
                        "       <div class='arrow'></div>" +
                        "   </td>" +
                        "   <td>" + ((row.sequenceid != null) ?
                                        row.sequenceid : '') +
                        "   </td>" +
                        "   <td class='wiki sci' value='" +
                                row.thumbsrc + "'>" +
                                row.scientificname +
                        "   </td>" +
                        "   <td class='wiki english' value='" +
                                row.imgsrc + "' eol-page='" +
                                row.eol_page_id + "'>" +
                                ((english != null) ? english : '') +
                        "   </td>" +
                        "   <td class='wiki'>" +
                                ((row.family != null) ?
                                    row.family : '') +
                        "   </td>" +
                        "   <td>" + ((row.ed != null) ?
                                        (+row.ed.toFixed(2)) : '') +
                        "   </td>" +
                        "   <td>" + ((row.edr != null) ?
                                        (+row.edr.toFixed(2)) : '') +
                        "   </td>" +
                        "   <td class='iucn' data-scientificname='" +
                                row.scientificname + "'>" +
                                ((redlist != null) ? redlist : '') +
                        "   </td>" +
                        "</tr>");

                    //list row collapsible content
                    tablerows.push("" +
                        "<tr class='tablesorter-childRow'>" +
                        "   <td colspan='7' value='" +
                                row.scientificname + "'>" +
                        "   </td>" +
                        "</tr>");

                    providers.push(
                        ('<a class="type {0}">{1}</a>, ' +
                         '<a class="provider {2}">{3}</a>')
                            .format(
                                row.type,
                                row.type_title,
                                row.provider,
                                row.provider_title));
                    if (year != null && year != '') {
                        years.push(year);
                    }
                    scientificnames[row.scientificname]=redlist;
                }
            );
            years = _.uniq(years);
            tablerows = _.uniq(tablerows);
            providers = _.uniq(providers);

            years = _.sortBy(_.uniq(years), function(val) {
                    return val;
                }
            );

            years[years.length-1] = (years.length > 1) ?
                ' and ' + years[years.length-1] : years[years.length-1];

            _.each(
                scientificnames,
                function(red_list_status) {
                    speciestotal++;
                    speciesthreatened +=
                        ((red_list_status.indexOf('EN')>=0) ||
                         (red_list_status.indexOf('VU')>=0) ||
                         (red_list_status.indexOf('CR')>=0) ||
                         (red_list_status.indexOf('EX')>=0) ||
                         (red_list_status.indexOf('EW')>=0) )  ?
                            1 : 0;
                    speciesdd +=
                        (red_list_status.indexOf('DD')>0)  ?
                            1 : 0;
                }
            );

            stats = (speciesthreatened > 0) ?
                ('(' + speciesthreatened + ' considered threatened by ' +
                '<a href="http://www.iucnredlist.org" ' +
                'target="_iucn">IUCN</a> '+years.join(',')+')') : '';

            if (speciestotal > 0) {
                content = $('' +
                    '<div class="mol-Map-ListQueryInfo">' +
                    '   <div class="mol-Map-ListQuery">' +
                           'Data type/source:&nbsp;' +
                           providers.join(', ') +
                           '.&nbsp;All&nbsp;seasonalities.<br>' +
                    '   </div> ' +
                    '   <div class="mol-Map-ListQueryInfoWindow"> ' +
                    '       <table class="listtable">' +
                    '           <thead>' +
                    '               <tr>' +
                    '                   <th></th>' +
                    '                   <th>Taxon Rank</th>' +
                    '                   <th>Scientific Name</th>' +
                    '                   <th>English Name</th>' +
                    '                   <th>Family</th>' +
                    '                   <th class="qtip-info" qtip-info-title="ED" ' + 
                    '                       qtip-info-body="Evolutionary Distinctness, ' + 
                    '                           the evolutionary history that a species ' + 
                    '                           contributes to the avian tree of life">ED (MY)'+
                    '                   </th>' +
                    '                   <th class="qtip-info" qtip-info-title="EDR" ' + 
                    '                       qtip-info-body="Evolutionary Distinctness Rarity, ' + 
                    '                       the spatial concentration of a species’ evolutionary' + 
                    '                       history">EDR (MY)'+
                    '                   </th>' +
                    '                   <th>IUCN&nbsp;&nbsp;</th>' +
                    '               </tr>' +
                    '           </thead>' +
                    '           <tbody class="tablebody">' +
                                    tablerows.join('') +
                    '           </tbody>' +
                    '       </table>' +
                    '   </div>' +
                    '</div>');

                dlContent = $('' +
                    '<div class="mol-Map-ListQuery">' +
                    '   <div>' +
                    '       <a href="' +
                                this.url.format(sqlurl) + '&format=csv"' +
                    '           class="mol-Map-ListQueryDownload">' +
                    '               download csv</a>' +
                    '   </div> ' +
                    '</div>');

                iucnContent = $('' +
                    '<div class="mol-Map-ListQuery mol-Map-ListQueryInfo">' +
                    '    <div id="iucnChartDiv"></div>'+
                    '    <div class="iucn_stats">' + stats + '</div>' +
                    '</div>');
            } else {
                content = $(''+
                    '<div class="mol-Map-ListQueryEmptyInfoWindow">' +
                    '   <b>No ' + className.replace(/All/g, '') +
                            ' species found within ' +
                            listradius.radius/1000 + ' km of ' +
                            Math.abs(
                                Math.round(
                                    listradius.center.lat()*1000)/1000) +
                                    '&deg;&nbsp;' + latHem + '&nbsp;' +
                            Math.abs(
                                Math.round(
                                    listradius.center.lng()*1000)/1000) +
                                    '&deg;&nbsp;' + lngHem +
                    '   </b>' +
                    '</div>');

                dlContent = $('' +
                    '<div class="mol-Map-ListQueryEmptyInfoWindow">' +
                    '    <b>No list to download.</b>' +
                    '</div>');

                iucnContent = $('' +
                    '<div class="mol-Map-ListQueryEmptyInfoWindow">' +
                    '    <b>No species found.</b>' +
                    '</div>');
            }

            return {speciestotal: speciestotal,
                    content: content,
                    dlContent: dlContent,
                    iucnContent: iucnContent};
        },

        /*
         * Displays and Manages the List dialog
         */

        displayListWindow: function(listrad, sptot, clname, latH, lngH,
                                    rows, con, dlCon, iuCon) {
            var self = this,
                listradius = listrad,
                listWindow,
                listTabs,
                speciestotal = sptot,
                className = clname,
                latHem = latH,
                lngHem = lngH,
                content = con;
                dlContent = dlCon,
                iucnContent = iuCon;

            listWindow = new mol.map.query.listDisplay();

            self.features[listradius.center.toString()+listradius.radius] = {
                listradius : listradius,
                listWindow : listWindow
            };

            listWindow.dialog({
                autoOpen: true,
                position: "center",
                width: 680,
                height: 415,
                dialogClass: 'mol-Map-ListDialog',
                modal: false,
                title: speciestotal + ' species of ' + className +
                       ' within ' + listradius.radius/1000 + ' km of ' +
                       Math.abs(Math.round(
                           listradius.center.lat()*1000)/1000) +
                           '&deg;&nbsp;' + latHem + '&nbsp;' +
                       Math.abs(Math.round(
                           listradius.center.lng()*1000)/1000) +
                           '&deg;&nbsp;' + lngHem
            });

            $(".mol-Map-ListDialog").parent().bind("resize", function() {
                $(".mol-Map-ListQueryInfoWindow")
                    .height($(".mol-Map-ListDialog").height()-125);

                $("#gallery")
                    .height($(".mol-Map-ListDialog").height()-125);
            });
            $(".mol-Map-ListDialog").animate({
                    left: '{0}px'.format($(window).width() / (7 / 4) - 200)
                }, 'slow');

            //tabs() function needs document ready to
            //have been called on the dialog content
            $(function() {
                var mmlHeight;

                //initialize tabs and set height
                listTabs = $("#tabs").tabs();

                $("#tabs > #listTab").html(content[0]);
                $("#tabs > #dlTab").html(dlContent[0]);
                $("#tabs > #iucnTab").html(iucnContent[0]);

                $(".mol-Map-ListQueryDownload").button();
                mmlHeight = $(".mol-Map-ListDialog").height();
                $(".mol-Map-ListQueryInfoWindow").height(mmlHeight-125);
                $("#gallery").height(mmlHeight-125);

                //list table creation
                self.createSpeciesListTable(listWindow);

                //chart creation
                if(speciestotal > 0 ) {
                    self.createIucnChart(rows, mmlHeight);
                }

                //image gallery creation
                self.createImageGallery(rows, speciestotal);

                listTabs.tabs("select", 0);
            });

            self.features[listradius.center.toString()+listradius.radius] = {
                listradius : listradius,
                listWindow : listWindow
            };

            $(listWindow).dialog({
               beforeClose: function(evt, ui) {
                   listTabs.tabs("destroy");
                   $(".mol-Map-ListDialogContent").remove();
                   listradius.setMap(null);

                   delete (
                       self.features[listradius.center.toString() +
                                     listradius.radius]);
               }
            });
        },

        /*
         * Bins the IUCN species for a list query request into categories
         * and returns an associate array with totals
         */
        getRedListCounts: function(rows) {

            var iucnListArray = [
                    ['IUCN Status', 'Count'],
                    ['LC',0],
                    ['NT',0],
                    ['VU',0],
                    ['EN',0],
                    ['CR',0],
                    ['EW',0],
                    ['EX',0]
                ], redlist;

            _.each(rows, function(row) {
                redlist = (row.redlist != null) ?
                    _.uniq(row.redlist.split(',')).join(',') : '';

                switch(redlist) {
                    case "LC":
                        iucnListArray[1][1]++;
                        break;
                    case "NT":
                        iucnListArray[2][1]++;
                        break;
                    case "VU":
                        iucnListArray[3][1]++;
                        break;
                    case "EN":
                        iucnListArray[4][1]++;
                        break;
                    case "CR":
                        iucnListArray[5][1]++;
                        break;
                    case "EW":
                        iucnListArray[6][1]++;
                        break;
                    case "EX":
                        iucnListArray[7][1]++;
                        break;
                }
            });

            return iucnListArray;
        },

        /*
         * Creates List Table
         */
        createSpeciesListTable: function(lw) {
            var self = this;

            //$("table.listtable tr:odd").addClass("master");
            $("table.listtable tr:not(.master)").hide();
            $("table.listtable tr:first-child").show();
            $("table.listtable tr.master td.arrowBox").click(
                function() {
                    $(this).parent().next("tr").toggle();
                    $(this).parent().find(".arrow").toggleClass("up");

                    if(!$(this).parent().hasClass('hasWiki')) {
                        $(this).parent().addClass('hasWiki');
                        self.callWiki($(this).parent());
                    }
                }
            );
            $(".listtable", $(lw)).tablesorter({
                sortList: [[1,0]]
            });
            $('.qtip-info').qtip({
                            content: {
                                text: function(api) {
                                    return '<div>' + $(this).attr('qtip-info-body') +
                                        '<br/><a href="http://www.mol.org/projects/ED"' + 
                                        ' target="_blank">More info</a></div>';
                                },
                                title: function(api) {
                                    return $(this).attr('qtip-info-title');
                                }
                            },
                            position: {
                                my: 'bottom right',  
                                at: 'top right', 
                                target: $('.qtip-info') 
                            },
                            hide: {
                                fixed: true,
                                delay: 500
                            }
                        });

            _.each(
                $('.wiki',$(lw)),
                function(wiki) {
                    $(wiki).click(
                        function(event) {
                            var win = window.open(
                                'http://en.wikipedia.com/wiki/'+
                                $(this).text().split(',')[0]
                                    .replace(/ /g, '_')
                            );
                            win.focus();
                        }
                    );
                }
            );

            _.each(
                $('.iucn',$(lw)),
                function(iucn) {
                    if ($(iucn).data('scientificname') != '') {
                        $(iucn).click(
                            function(event) {
                                var win = window.open(
                                    'http://www.iucnredlist.org/' +
                                    'apps/redlist/search/external?text='
                                    +$(this).data('scientificname')
                                );
                                win.focus();
                            }
                        );
                    }
                }
            );
        },

        /*
         * Creates IUCN pie chart
         */
        createIucnChart: function(rows, mHeight) {
            var self = this,
                iucnlist,
                iucndata,
                options,
                chart;

            $("#iucnChartDiv").height(mHeight-140);

            iucnlist = self.getRedListCounts(rows);
            iucndata = google.visualization.arrayToDataTable(iucnlist);

            options = {
                width: 605,
                height: $("#iucnChartDiv").height(),
                backgroundColor: 'transparent',
                title: 'Species by IUCN Status',
                colors: ['#006666',
                         '#88c193',
                         '#cc9900',
                         '#cc6633',
                         '#cc3333',
                         '#FFFFFF',
                         '#000000'],
                pieSliceText: 'none',
                chartArea: {left:125, top:25, width:"100%", height:"85%"}
            };

            chart = new google.visualization.PieChart(
                document.getElementById('iucnChartDiv'));
            chart.draw(iucndata, options);
        },

        /*
         * Creates and populates image gallery tab
         */
        createImageGallery: function (rows, sptotal) {
            var hasImg = 0,
                english
                self = this;

            _.each(
               rows,
                function(row) {
                    english = (row.english != null) ?
                        _.uniq(row.english.split(',')).join(',') : '';

                    if(row.thumbsrc != null) {
                        $("#gallery").append('' +
                            '<li><a class="eol_img" href="http://eol.org/pages/' +
                            row.eol_page_id +
                            '" target="_blank"><img src="' +
                            row.thumbsrc +
                            '" title="' +
                            english +
                            '" sci-name="' +
                            row.scientificname + '"/></a></li>');

                        hasImg++;
                    } else {
                        $("#gallery").append('' +
                            '<li><div style="width:91px; height:68px"' +
                            'title="' + english +
                            '" sci-name="' + row.scientificname +
                            '">No image for ' +
                            english + '.</div></li>');
                    }
                }
            );

            $('#gallery').ppGallery({thumbWidth: 91, maxWidth: 635});
            $('#imgTotals').html('' +
                                'Images are available for ' +
                                hasImg + ' of ' + sptotal +
                                ' species. ');

            $('#gallery li a img').qtip({
                content: {
                    text: function(api) {
                        return '<div>' + $(this).attr('oldtitle') +
                            '<br/><button class="mapButton" value="' +
                            $(this).attr('sci-name') +
                            '">Map</button>' +
                            '<button class="eolButton" value="' +
                            $(this).parent().attr('href') +
                            '">EOL</button></div>';
                    }
                },
                hide: {
                    fixed: true,
                    delay: 500
                },
                events: {
                    visible: function(event, api) {
                        $("button.mapButton").click(
                            function(event) {
                                window.location.href = '/{0}'.format(
                                	event.target.value
                                );
                                //self.bus.fireEvent(
                                //    new mol.bus.Event(
                                //        'search',
                                //        {term : $.trim(event.target.value)}
                                //    )
                                //);
                            }
                        );

                        $('button.eolButton').click(
                            function(event) {
                                var win = window.open(
                                    $.trim(event.target.value)
                                );
                                win.focus();
                            }
                        );
                    }
                }
            });
            $('.eol_img').mouseup(
                function(event) {
                    if(event.ctrlKey) {
                      //
                    }
                }
            );

            $('#gallery li div').qtip({
                content: {
                    text: function(api) {
                        return '<div>' + $(this).attr('title') +
                            '<br/><button class="mapButton" value="' +
                            $(this).attr('sci-name') +
                            '">Map</button></div>';
                    }
                },
                hide: {
                    fixed: true,
                    delay: 500
                },
                events: {
                    visible: function(event, api) {
                        $("button.mapButton").click(function(event) {
                            self.bus.fireEvent(new mol.bus.Event('search', {
                                term : $.trim(event.target.value)
                            }));
                        });
                    }
                }
            });
        },

        /*
         * Callback for Wikipedia Json-P request
         */
        wikiCallback: function(data, row,q,qs,eolimg,eolpage) {

            var wikidata,
                wikiimg,
                prop,
                a,
                imgtitle,
                req,
                reqs,
                i,
                e,
                self = this;


            for(e in data.query.pages) {
                if(e != -1) {
                    prop = data.query.pages[e];
                    wikidata = prop.extract
                        .replace('...','')
                        .replace('<b>','<strong>')
                        .replace('<i>','<em>')
                        .replace('</b>','</strong>')
                        .replace('</i>','</em>')
                        .replace('<br />',"")
                        .replace(/<p>/g,'<div>')
                        .replace(/<\/p>/g,'</div>')
                        .replace(/<h2>/g,'<strong>')
                        .replace(/<\/h2>/g,'</strong>')
                        .replace(/<h3>/g,'<strong>')
                        .replace(/<\/h3>/g,'</strong>')
                        .replace(/\n/g,"")
                        .replace('</div>\n<div>'," ")
                        .replace('</div><div>'," ")
                        .replace('</div><strong>'," <strong> ")
                        .replace('</strong><div>'," </strong> ");

                    $(row).next().find('td').html(wikidata);
                    $(row).next().find('td div br').remove();

                    a = prop.images;

                    for(i=0;i < a.length;i++) {
                        imgtitle = a[i].title;

                        req = new RegExp(q, "i");
                        reqs = new RegExp(qs, "i");

                        if(imgtitle.search(req) != -1 ||
                           imgtitle.search(reqs) != -1) {
                            wikiimg = imgtitle;
                            break;
                        }
                    }
                }

                if(eolimg != "null") {
                    $('<a href="http://eol.org/pages/' +
                        eolpage +
                        '" target="_blank"><img src="' +
                        eolimg +
                        '" style="float:left; margin:0 4px 0 0;"/>' +
                        '</a>').prependTo($(row).next().find('td'));
                    $(row).next().find('td div:last').append('' +
                        '... (Text Source:' +
                        '<a href="http://en.wikipedia.com/wiki/' +
                        qs.replace(/ /g, '_') +
                        '" target="_blank">Wikipedia</a>;' +
                        ' Image Source:<a href="http://eol.org/pages/' +
                        eolpage +
                        '" target="_blank">EOL</a>)' +
                        '<p><button class="mapButton" value="' +
                        qs + '">Map</button></p>');
                } else if(wikiimg != null) {
                    //get a wikipedia image if we have to
                    $.getJSON(
                        'http://en.wikipedia.org/w/api.php?' +
                        'action=query' +
                        '&prop=imageinfo' +
                        '&format=json' +
                        '&iiprop=url' +
                        '&iilimit=10' +
                        '&iiurlwidth=91' +
                        '&iiurlheight=68' +
                        '&titles={0}'.format(wikiimg) +
                        '&callback=?'
                    ).success(
                        function(data) {
                            self.wikiImgCallback(data, qs, wikiimg)
                        }
                    );
                }

                //check for link to eol, if true, add button
                if(eolpage != "null") {
                    $(row).next().find('td p:last').append('' +
                    '<button class="eolButton" ' +
                    'value="http://eol.org/pages/' +
                    eolpage + '">Encyclopedia of Life</button>');

                    $('button.eolButton[value="http://eol.org/pages/' +
                        eolpage + '"]').click(function(event) {
                        var win = window.open($.trim(event.target.value));
                        win.focus();
                    });
                }

                $(row).find('td.arrowBox').html("<div class='arrow up'></div>");
            }


            $("button.mapButton").click(
                function(event) {
                    window.location.href = '/{0}'.format(
                    	event.target.value
                    );
                    //self.bus.fireEvent(
                    //    new mol.bus.Event(
                    //        'search',
                    //        {term : $.trim(event.target.value)}
                    //    )
                    //);
                }
            );
        },

        /*
         *  Callback for Wikipedia image json-p request.
         */
        wikiImgCallback: function(data, qs, wikiimg) {

            var imgurl,
                x,
                z;

            for(x in data.query.pages) {
                z = data.query.pages[x];
                imgurl = z.imageinfo[0].thumburl;

                $('<a href="http://en.wikipedia.com/wiki/' +
                    qs.replace(/ /g, '_') +
                    '" target="_blank"><img src="' +
                    imgurl +
                    '" style="float:left; margin:0 4px 0 0;"/>')
                   .prependTo($(row).next().find('td'));
                $(row).next().find('td div:last')
                    .append('' +
                    '... (Text Source:' +
                    '<a href="http://en.wikipedia.com/wiki/' +
                    qs.replace(/ /g, '_') +
                    '" target="_blank">Wikipedia</a>;' +
                    ' Image Source:' +
                    '<a href="http://en.wikipedia.com/wiki/' +
                    wikiimg +
                    '" target="_blank">Wikipedia</a>)' +
                    '<p><button class="mapButton" value="' +
                    qs +
                    '">Map</button></p>');
            }
        },

        /*
         *  Put html in saying information unavailable...
         */
        wikiError: function(row) {
            $(row).find('td.arrowBox').html("<div class='arrow up'></div>");
            $(row).next().find('td').html('<p>Description unavailable.</p>');
        },

        /*
         * Function to call Wikipedia and EOL image
         */
        callWiki: function(row) {
            var q,
                qs,
                eolimg,
                eolpage,
                self = this;

            $(row).find('td.arrowBox').html('' +
                '<img src="/static/loading-small.gif" width="' +
                $(row).find('td.arrowBox').height() +'" height="' +
                $(row).find('td.arrowBox').width() + '" />');

            q = $(row).find('td.english').html();
            qs = $(row).find('td.sci').html();
            eolimg = $(row).find('td.sci').attr('value');
            eolpage = $(row).find('td.english').attr('eol-page');

            $.getJSON(
                "http://en.wikipedia.org/w/api.php?" +
                "action=query" +
                "&format=json" +
                "&callback=test" +
                "&prop=extracts|images" +
                "&imlimit=10" +
                "&exlimit=1" +
                "&redirects=" +
                "exintro=" +
                "&iwurl=" +
                "&titles=" + qs +
                "&exchars=275" +
                '&callback=?'
            ).success (
                function(data) {
                    self.wikiCallback(data, row,q,qs,eolimg,eolpage)
                }
            ).error(
                function(data) {
                    self.wikiError(row);
                }
            );
        }
    });

    mol.map.QueryDisplay = mol.mvp.View.extend({
        init : function(names) {
            var className = 'mol-Map-QueryDisplay',
                html = '' +
                    '<div title=' +
                    '  "Use this control to select species group and radius."' +
                    ' class="' + className +
                    '  widgetTheme">' +
                    '  <div class="speciesDisplay" >' +
                         'Radius </span>' +
                    '    <select class="radius">' +
                    '      <option selected value="50">50 km</option>' +
                    '      <option value="100">100 km</option>' +
                    '      <option value="300">300 km</option>' +
                    '    </select>' +
                         'Group ' +
                    '    <select class="dataset_id" value="">' +
                    '      <option selected value="jetz_maps" data-range="jetz_maps" ' +
                    '        data-class="Aves" >' +
                    '        Birds</option>' +
                    '      <option value="na_fish" data-range="na_fish"' +
                    '        data-class="Fishes" >' +
                    '        NA Freshwater Fishes</option>' +
                    '      <option value="iucn_reptiles" data-range="iucn_reptiles" ' +
                    '        data-regionalchecklist="ecoregion_species" ' +
                    '        data-class="Reptilia" >' +
                    '        NA Reptiles</option>' +
                    '      <option value="iucn_amphibians" data-range="iucn_amphibians"' +
                    '        data-class="Amphibia" >' +
                    '        Amphibians</option>' +
                    '      <option value="iucn_mammals" data-range="iucn_mammals" ' +
                    '        data-class="Mammalia" >' +
                    '        Mammals</option>' +
                    '    </select>' +
                    '    <span class="types">' +
                    '      <button class="range selected" ' +
                             'value="range">' +
                    '        <img title="Click to use Expert range maps' +
                               ' for query."' +
                    '          src="/static/maps/search/range.png">' +
                    '      </button>' +
                    '      <button class="ecoregion" ' +
                    '        value="regionalchecklist">' +
                    '        <img title="Click to use Regional' +
                               ' checklists for query." ' +
                               'src="/static/maps/search/ecoregion.png">' +
                    '      </button>' +
                    '    </span>' +
                    '  </div>' +
                    '</div>';

            this._super(html);
            this.resultslist=$(this).find('.resultslist');
            this.radiusInput=$(this).find('.radius');
            this.dataset_id=$(this).find('.dataset_id');
            this.types=$(this).find('.types');
            this.queryButton=$(this).find('#speciesListButton');
            this.speciesDisplay = $(this).find('.speciesDisplay');
            $(this.types).find('.ecoregion').toggle(false);
            $(this.types).find('.range').toggle(false);
        }
    });

    mol.map.QueryResultDisplay = mol.mvp.View.extend({
        init : function(scientificname) {
            var className = 'mol-Map-QueryResultDisplay', html = '{0}';
            this._super(html.format(scientificname));
        }
    });

    mol.map.query.listDisplay = mol.mvp.View.extend({
        init : function() {
            var html = '' +
                '<div class="mol-Map-ListDialogContent ui-tabs" id="tabs">' +
                '   <ul class="ui-tabs-nav">' +
                '      <li><a href="#listTab">List</a></li>' +
                '      <li><a href="#imagesTab">Images</a></li>' +
                '      <li><a href="#iucnTab">IUCN</a></li>' +
                '      <li><a href="#dlTab">Download</a></li>' +
                '   </ul>' +
                '   <div id="listTab" class="ui-tabs-panel">Content.</div>' +
                '   <div id="imagesTab" class="ui-tabs-panel">' +
                '       <div>' +
                '           <span id="imgTotals"></span>' +
                            'Source: <a href="http://eol.org/" ' +
                            'target="_blank">Encyclopedia of Life</a> ' +
                '       </div>' +
                '       <ul id="gallery" style="overflow: auto;"></ul></div>' +
                '   <div id="iucnTab" class="ui-tabs-panel">IUCN.</div>' +
                '   <div id="dlTab" class="ui-tabs-panel">Download.</div>' +
                '</div>';
            this._super(html);
        }
    });
};
