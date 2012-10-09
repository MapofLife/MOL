mol.modules.map.query = function(mol) {

    mol.map.query = {};

    mol.map.query.QueryEngine = mol.mvp.Engine.extend({
        init : function(proxy, bus, map) {
            this.proxy = proxy;
            this.bus = bus;
            this.map = map;
            this.url = '' +
                'http://dtredc0xh764j.cloudfront.net/' +
                'api/v2/sql?callback=?&q={0}';
            // TODO: Docs for what this query does.
            this.sql = '' +
                'SELECT DISTINCT '+
                '    p.scientificname as scientificname, '+
                '    t.common_names_eng as english, '+
                '    initcap(lower(t._order)) as order, ' +
                '    initcap(lower(t.Family)) as family, ' +
                '    t.red_list_status as redlist, ' +
                '    initcap(lower(t.class)) as className, ' +
                '    dt.title as type_title, ' +
                '    pv.title as provider_title, ' +
                '    dt.type as type, ' +
                '    pv.provider as provider, ' +
                '    t.year_assessed as year_assessed, ' +
                '    s.sequenceid as sequenceid, ' +
                '    eolthumbnailurl as eol_thumb_url, ' +
                '    page_id as eol_page_id ' +
                'FROM {3} p ' +
                'LEFT JOIN eol e ' +
                '    ON p.scientificname = e.scientificname ' +
                'LEFT JOIN synonym_metadata n ' +
                '    ON p.scientificname = n.scientificname ' +
                'LEFT JOIN taxonomy t ' +
                '    ON (p.scientificname = t.scientificname OR ' +
                '        n.mol_scientificname = t.scientificname) ' +
                'LEFT JOIN sequence_metadata s ' +
                '    ON t.family = s.family ' +
                'LEFT JOIN types dt ON ' +
                '    p.type = dt.type ' +
                'LEFT JOIN providers pv ON ' +
                '    p.provider = pv.provider ' +
                'WHERE ' +
                '    ST_DWithin(p.the_geom_webmercator,ST_Transform' +
                //radius test
                '    (ST_PointFromText(\'POINT({0})\',4326),3857),{1}) ' +
                '    {2} ' + //other constraints
                'ORDER BY s.sequenceid, p.scientificname asc';
             // TODO: Docs for what this query does.
            this.csv_sql = '' +
                'SELECT DISTINCT '+
                '    p.scientificname as "Scientific Name", '+
                '    t.common_names_eng as "Common Name (English)", '+
                '    initcap(lower(t._order)) as "Order", ' +
                '    initcap(lower(t.Family)) as "Family", ' +
                '    t.red_list_status as "IUCN Red List Status", ' +
                '    initcap(lower(t.class)) as "Class", ' +
                '    dt.title as "Type", ' +
                '    pv.title as "Source", ' +
                '    t.year_assessed as "Year Assessed", ' +
                '    s.sequenceid as "Sequence ID" ' +
                'FROM {3} p ' +
                'LEFT JOIN synonym_metadata n ' +
                '    ON p.scientificname = n.scientificname ' +
                'LEFT JOIN taxonomy t ' +
                '    ON (p.scientificname = t.scientificname OR ' +
                '        n.mol_scientificname = t.scientificname) ' +
                'LEFT JOIN sequence_metadata s ' +
                '    ON t.family = s.family ' +
                'LEFT JOIN types dt ' +
                '    ON p.type = dt.type ' +
                'LEFT JOIN providers pv ' +
                '    ON p.provider = pv.provider ' +
                'WHERE ' +
                '    ST_DWithin(p.the_geom_webmercator,ST_Transform' +
                //radius test
                '   (ST_PointFromText(\'POINT({0})\',4326),3857),{1}) ' +
                '    {2} ' + //other constraints
                'ORDER BY "Sequence ID", "Scientific Name" asc';
            this.queryct=0;
        },

        start : function() {
            this.addQueryDisplay();
            this.addEventHandlers();
        },

        /*
         *  Add the species list tool controls to the map.
         */
        addQueryDisplay : function() {
            var params = {
                display: null,
                slot: mol.map.ControlDisplay.Slot.BOTTOM,
                position: google.maps.ControlPosition.RIGHT_BOTTOM
            };
            this.bus.fireEvent(new mol.bus.Event('register-list-click'));
            this.enabled=true;
            this.features={};
            this.display = new mol.map.QueryDisplay();
            params.display = this.display;
            this.bus.fireEvent(new mol.bus.Event('add-map-control', params));
        },
        /*
         *  Method to build and submit an AJAX call that retrieves species
         *  at a radius around a lat, long.
         */
        getList: function(lat, lng, listradius, constraints, className) {
            var self = this,
                sql = this.sql.format(
                    (Math.round(lng*100)/100+ ' ' +Math.round(lat*100)/100),
                    listradius.radius,
                    constraints,
                    'polygons'),
                csv_sql = escape(
                    this.csv_sql.format(
                        (Math.round(lng*100)/100+' '+Math.round(lat*100)/100),
                        listradius.radius,
                        constraints,
                        'polygons')),
                params = {
                    sql:sql,
                    key: '{0}'.format(
                        (lat+'-'+lng+'-'+listradius.radius+constraints))
                };

            if (self.queryct > 0) {
                alert('Please wait for your last species list request to ' +
                'complete before starting another.');
            } else {
                self.queryct++;
                $.getJSON(
                    self.url.format(sql),
                    function(data, textStatus, jqXHR) {
                        var results = {
                            listradius:listradius,
                            constraints: constraints,
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
                                self.display.classInput.val().
                                    toLowerCase().indexOf('reptil') > 0) {
                                alert('Available for North America only.');
                            }
                        }
                    );
                }
            );
            /*
             *  Map click handler that starts a list tool request.
             */
            this.bus.addHandler(
                'species-list-query-click',
                function (event) {
                    var listradius,
                        constraints = $(self.display.classInput).val() +
                            $(".selected", $(self.display.types)).val(),
                        className =  $("option:selected",
                            $(self.display.classInput)).text();

                    if (self.enabled) {
                        listradius = new google.maps.Circle(
                            {
                                map: event.map,
                                radius: parseInt(
                                    self.display.radiusInput.val())*1000,
                                    // 50 km
                                center: event.gmaps_event.latLng,
                                strokeWeight: 3,
                                strokeColor: 'darkred',
                                clickable:false,
                                fillOpacity:0,

                            }
                        );
                        self.bus.fireEvent(new mol.bus.Event(
                            'show-loading-indicator',
                            {source : 'listradius'}));

                        _.each(
                            self.features,
                            function(feature) {
                                if(feature.listWindow) {
                                    feature.listWindow.dialog("close");
                                }
                            }
                        )

                        self.getList(
                            event.gmaps_event.latLng.lat(),
                            event.gmaps_event.latLng.lng(),
                            listradius,
                            constraints,
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
                'species-list-tool-toggle',
                function(event) {
                    self.enabled = !self.enabled;
                    if (self.listradius) {
                        self.listradius.setMap(null);
                    }
                    if (self.enabled == true) {
                        $(self.display).show();
                        _.each(
                            self.features,
                            function(feature) {
                                feature.listradius.setMap(self.map);
                                feature.listWindow.setMap(self.map);
                            }
                        );
                    } else {
                        $(self.display).hide();
                        _.each(
                            self.features,
                            function(feature) {
                                if(feature.listWindow) {
                                    feature.listWindow.dialog("close");
                                }
                                feature.listradius.setMap(null);
                            }
                        );
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

            this.display.classInput.change(
                function(event) {
                    if ($(this).val().toLowerCase().indexOf('fish') > 0) {
                        $(self.display.types).find('.ecoregion')
                            .toggle(false);
                        $(self.display.types).find('.ecoregion')
                            .removeClass('selected');
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
                        if ($(self.display.types).find('.range')
                            .hasClass('selected')) {
                                alert('Available for North America only.');
                        };
                    } else {
                        $(self.display.types).find('.ecoregion')
                            .toggle(false);
                        $(self.display.types).find('.range')
                            .toggle(true);
                        $(self.display.types).find('.range')
                            .addClass('selected');
                    }
                }
            );
        },

        /*
         * Processes response content for List dialog
         */
        processListRows: function(listrad, latH, lngH, rows, sqlurl) {
            var self = this,
                listradius = listrad,
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
                        "<tr class='" + tclass + "'>" +
                        "   <td class='arrowBox'>" +
                        "       <div class='arrow'></div>" +
                        "   </td>" +
                        "   <td class='wiki sci' value='" +
                                row.eol_thumb_url + "'>" +
                                row.scientificname +
                        "   </td>" +
                        "   <td class='wiki english' value='" +
                                row.eol_media_url + "' eol-page='" +
                                row.eol_page_id + "'>" +
                                ((english != null) ? english : '') +
                        "   </td>" +
                        "   <td class='wiki'>" +
                                ((row.order != null) ?
                                    row.order : '') +
                        "   </td>" +
                        "   <td class='wiki'>" +
                                ((row.family != null) ?
                                    row.family : '') +
                        "   </td>" +
                        "   <td>" + ((row.sequenceid != null) ?
                                        row.sequenceid : '') +
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
                    '                   <th>Scientific Name</th>' +
                    '                   <th>English Name</th>' +
                    '                   <th>Order</th>' +
                    '                   <th>Family</th>' +
                    '                   <th>Rank&nbsp;&nbsp;&nbsp;</th>' +
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
                    '       <a href="http://mol.cartodb.com/api/v2/sql?q=' +
                                sqlurl + '&format=csv"' +
                    '           class="mol-Map-ListQueryDownload">' +
                    '               download csv</a>' +
                    '   </div> ' +
                    '</div>');

                iucnContent = $('' +
                    '<div class="mol-Map-ListQuery mol-Map-ListQueryInfo ">' +
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
                    '    <b>No list to download</b>' +
                    '</div>');

                iucnContent = $('' +
                    '<div class="mol-Map-ListQueryEmptyInfoWindow">' +
                    '    <b>No species found.</b>' +
                    '</div>');
            }

            return {speciestotal: speciestotal,
                    content: content,
                    dlContent: dlContent,
                    iucnContent: iucnContent}
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
                self.createIucnChart(rows, mmlHeight);

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

            $("table.listtable tr:odd").addClass("master");
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
                sortList: [[5,0]]
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

                    if(row.eol_thumb_url != null) {
                        $("#gallery").append('' +
                            '<li><a class="eol_img" href="http://eol.org/pages/' +
                            row.eol_page_id +
                            '" target="_blank"><img src="' +
                            row.eol_thumb_url +
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
                                self.bus.fireEvent(
                                    new mol.bus.Event(
                                        'search',
                                        {term : $.trim(event.target.value)}
                                    )
                                );
                            }
                        );

                        $('button.eolButton').click(
                            function(event) {
                                var win = window.open($.trim(event.target.value));
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
            )

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
                    self.bus.fireEvent(
                        new mol.bus.Event(
                            'search',
                            {term : $.trim(event.target.value)}
                        )
                    );
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
                    '   "Use this control to select species group and radius.' +
                    '   Then right click (Mac Users: \'control-click\')' +
                    '   on focal location on map." class="' + className +
                    '   widgetTheme">' +
                    '   <div class="controls">' +
                    '       Search Radius ' +
                    '       <select class="radius">' +
                    '           <option selected value="50">50 km</option>' +
                    '           <option value="100">100 km</option>' +
                    '           <option value="300">300 km</option>' +
                    '       </select>' +
                    '       Group ' +
                    '       <select class="class" value="">' +
                    '           <option selected' +
                    '               value=" AND p.polygonres=100 ">' +
                    '               Birds</option>' +
                    '           <option value=" AND p.provider=\'fishes\' ">' +
                    '               NA Freshwater Fishes</option>' +
                    '           <option value=" AND p.class=\'reptilia\' ">' +
                    '               Reptiles</option>' +
                    '           <option value=" AND p.class=\'amphibia\' ">' +
                    '               Amphibians</option>' +
                    '           <option value=" AND p.class=\'mammalia\' ">' +
                    '               Mammals</option>' +
                    '       </select>' +
                    '       <span class="types">' +
                    '           <button class="range selected" ' +
                    '               value=" AND p.type=\'range\'">' +
                    '               <img ' +
                    '                   title="Click to use Expert range maps' +
                    '                       for query."' +
                    '                   src="/static/maps/search/range.png">' +
                    '           </button>' +
                    '           <button class="ecoregion" ' +
                    '               value=" AND p.type=\'ecoregion\' ">' +
                    '               <img ' +
                    '                   title="Click to use Regional' +
                    '                       checklists for query." ' +
                    '                   src="/static/maps/search/' +
                                            'ecoregion.png">' +
                    '           </button>' +
                    '       </span>'+
                    '   </div>' +
                    '</div>';

            this._super(html);
            this.resultslist=$(this).find('.resultslist');
            this.radiusInput=$(this).find('.radius');
            this.classInput=$(this).find('.class');
            this.types=$(this).find('.types');
            $(this.types).find('.ecoregion').toggle(false);
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
