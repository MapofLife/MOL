mol.modules.map.dashboard = function(mol) {

    mol.map.dashboard = {};

    mol.map.dashboard.DashboardEngine = mol.mvp.Engine.extend(
        {
            init: function(proxy, bus) {
                this.proxy = proxy;
                this.bus = bus;
                this.url = "http://mol.cartodb.com/api/v2/sql?callback=?&q={0}";
                this.summary_sql = '' +
                    'SELECT DISTINCT * ' +
                    'FROM get_dashboard_summary()';
                this.dashboard_sql = '' +
                    'SELECT DISTINCT * ' +
                    'FROM dash_cache ' +
                    'ORDER BY provider, classes;';
                this.summary = null;
                this.types = {};
                this.sources = {};

            },
            start: function() {
                this.initDialog();
            },

            addEventHandlers: function() {
                var self = this;

                /**
                 * Callback that toggles the dashboard display visibility.
                 *
                 * @param event mol.bus.Event
                 */
                this.bus.addHandler(
                    'taxonomy-dashboard-toggle',
                    function(event) {
                        var params = null,
                            e = null;


                        if (event.state === undefined) {
                            if(self.display.dialog('isOpen')) {
                                self.display.dialog('close');
                            } else {
                                self.display.dialog('open');
                            }
                        } else {
                            self.display.dialog(event.state);
                        }

                    }
                );

                _.each(
                    this.display.datasets,
                    function(dataset) {
                        var provider = $(dataset).find('.provider')
                               .attr('class').replace('provider','').trim(),
                            type = $(dataset).find('.type')
                                .attr('class').replace('type','').trim(),
                            _class = $(dataset).find('.class')
                                .attr('class').replace('class','').trim(),
                            dataset_title = $(dataset).find('.table')
                                .attr('class').replace('table','').trim();

                        $(dataset).find('.provider').click (
                            function(event) {
                                self.bus.fireEvent(
                                    new mol.bus.Event(
                                        'metadata-toggle',
                                        {params:
                                            {provider: provider,
                                             type: type,
                                             _class: _class,
                                             text: dataset_title}}));

                            }
                        );

                    }
                );
                _.each(
                    this.display.datasets.find('.type'),
                    function(td) {
                         var type = $(td).attr('class')
                                .replace('type','').trim();
                         $(td).click (
                                function(event) {
                                    var _class = $(this)
                                            .attr('class')
                                                .replace('class','').trim();
                                    self.bus.fireEvent(
                                        new mol.bus.Event(
                                            'metadata-toggle',
                                            {params:{type: type}}));
                                }
                         );
                    }
                )
            },

            /**
             * Fires the 'add-map-control' event. The mol.map.MapEngine handles
             * this event and adds the display to the map.
             */
            initDialog: function() {
                var self = this;

                $.getJSON(
                    this.url.format(this.dashboard_sql),
                    function(response) {
                        self.display = new mol.map.dashboard.DashboardDisplay(
                            response.rows, self.summary
                        );
                        self.display.dialog(
                            {
                                autoOpen: false,
                                width: 946,
                                height: 600,
                                minHeight: 300,
                                stack: true,
                                dialogClass: "mol-Dashboard",
                                title: 'Dashboard - ' +
                                'Statistics for Data Served by the Map of Life',
                                open: function(event, ui) {
                                     $(".mol-Dashboard-TableWindow")
                                        .height(
                                            $(".mol-Dashboard").height()-95);
                                     
                                     //need this to force zebra on the table   
                                     self.display.dashtable
                                        .trigger("update", true);
                                }
                            }
                        );
                        
                        $(".mol-Dashboard").parent().bind("resize", function() {
                            $(".mol-Dashboard-TableWindow")
                                .height($(".mol-Dashboard").height()-95);
                        });

                        self.addEventHandlers();
                    }
                );
                
                $.getJSON(
                    this.url.format(this.summary_sql),
                    function(response) {
                        self.summary = response.rows[0];
                        if(self.display) {
                            self.display.fillSummary(self.summary);
                        }
                    }
                );
            }
        }
    );

    mol.map.dashboard.DashboardDisplay = mol.mvp.View.extend(
        {
            init: function(rows, summary) {
                var html = '' +
                    '<div id="dialog">' +
                    '  <div >' +
                    '    <div class="summary">' +
                    '      <span class="label">' + 
                             'Data sources:' + 
                    '      </span>' +
                    '      <span class="providers">' + 
                    '      </span>' +
                    '      <span class="label">' + 
                             'Datasets:' + 
                    '      </span>' +
                    '      <span class="datasets">' + 
                    '      </span>' +
                    '      <span class="label">' + 
                             'Species names in source data:' + 
                    '      </span>' +
                    '      <span class="names">' + 
                    '      </span>' +
                    '      <span class="label">' + 
                             'Names in MOL taxonomy:' + 
                    '      </span>' +
                    '      <span class="taxon_total">' + 
                    '      </span>' +
                    '      <span class="label">' + 
                             'Names matching MOL taxonomy:' + 
                    '      </span>' +
                    '      <span class="all_matches">' + 
                    '      </span>' + 
                    '      <br>' +
                    '      <span class="label">' + 
                             'Names matching MOL taxonomy directly:' + 
                    '      </span>' +
                    '      <span class="direct_matches">' + 
                    '      </span>' +
                    '      <span class="label">' + 
                            'Names matching MOL taxonomy' + 
                            ' through a known synonym:' + 
                    '      </span>' +
                    '      <span class="syn_matches">' + 
                    '      </span>' +
                    '      <span class="label">' + 
                             'Total records:' + 
                    '      </span>' +
                    '      <span class="records_total">' + 
                    '      </span>' +
                    '    </div>' +
                    
                    
                    /* list filtering on hold for now
                    '  <div id="dashTypeFilter" class="typeFilters">' +
                    '    <div id="dashTitle" class="title">' +
                            'Datasets' +
                    '    </div><br/>' +
                    //taxa filter
                    '    <div class="class">' +
                    '      <span class="filterHeader">Filter by Class</span>' +
                    '    </div>' +
                    '    <br/>' +
                    '    <br/>' +
                    //type filter
                    '    <div class="type">' +
                    '      <span class="filterHeader">Filter by Type</span>' +
                    '    </div>' +
                    '  </div>' +
                    */
                   
                   
                   
                    '    <div class="mol-Dashboard-TableWindow">' +
                    '      <table class="dashtable">' +
                    '       <thead>' +
                    '        <tr>' +
                    '          <th><b>Dataset</b></th>' +
                    '          <th><b>Type</b></th>' +
                    '          <th><b>Source</b></th>' +
                    '          <th><b>Taxon</b></th>' +
                    '          <th><b>Species Names</b></th>' +
                    '          <th><b>Records</b></th>' +
                    '          <th><b>% Match</b></th>' +
                    '        </tr>' +
                    '       </thead>' +
                    '       <tbody class="tablebody"></tbody>' +
                    '      </table>' +
                    '    </div>' +
                    '  <div>' +
                    '</div>  ',
                    self = this;
                    //this.numsets = 0;

                this._super(html);
                _.each(
                    rows,
                    function(row) {
                        self.fillRow(row);
                    }
                )

                //list filtering on hold for now
                //$(this).find('#dashTitle')
                    //.html(this.numsets + ' Datasets Shown');

                this.dashtable = $(this).find('.dashtable');
                this.dashtable.tablesorter({
                                sortList: [[1,1]],
                                widthFixed: true,
                                theme: "blue",
                                widgets: ["filter","zebra"]
                                });
                this.datasets = $(this).find('.dataset');

                this.dashtable.find("tr.master")
                    .click(function() {
                        $(this).parent().find('tr').each(
                            function(index, elem) {
                                $(elem).find('td').each(
                                    function(index, el) {
                                        if($(el).hasClass('selectedDashRow')) {
                                            $(el).removeClass('selectedDashRow');
                                        }
                                    }
                                )
                            }
                        )

                        $(this).find('td').each(
                            function(index, elem) {
                                $(elem).addClass('selectedDashRow');
                            }
                        )
                    }
                );
                
                /* list filtering on hold for now
                $(this).find("input:checkbox").change(
                    function(event) {}
                );
                */
                 
                if(summary!=null) {
                    self.fillSummary(summary);
                }
            },

            fillRow:  function(row) {
                var self = this;
                
                /* list filtering on hold for now
                
                this.numsets++;
                
                this.fillFilter('type',row.type_id, row.type);
                this.fillFilter('provider',row.provider_id, row.provider);

                _.each(
                    row.classes.split(','),
                    function(taxa) {
                        self.fillFilter('class', taxa, taxa);
                    }
                );
                
                */

                $(this).find('.tablebody').append(
                    new mol.map.dashboard.DashboardRowDisplay(row));
            },
            
            fillSummary: function(summary) {
                var self = this;
                _.each(
                    _.keys(summary),
                    function(stat){
                        $(self).find('.{0}'.format(stat)).text(summary[stat]);
                    }
                )
            },
            
            fillFilter: function(type, name, value) {
                if($(this).find('.{0} .{1}'.format(type, name)).length==0) {
                    $(this).find('.typeFilters .{0}'.format(type)).append(
                        new mol.map.dashboard.DashboardFilterDisplay(
                            type, 
                            name, 
                            value)
                    );
                }
            }
        }
    );
    
    mol.map.dashboard.DashboardRowDisplay = mol.mvp.View.extend(
        {
            init: function(row) {
                var html = '' +
                    '    <tr class="master dataset">' +
                    '      <td class="table {8}">{8}</td>' +
                    '      <td class="type {0}">{1}</td>' +
                    '      <td class="provider {2}">{3}</td>' +
                    '      <td class="class {4}">{5}</td>' +
                    '      <td class="spnames">{6}</td>' +
                    '      <td class="records">{7}</td>' +
                    '      <td class="pctmatch">{9}</td>' +
                    '    </tr>';    
                    
                this._super(
                    html.format(
                        row.type_id,
                        row.type,
                        row.provider_id,
                        row.provider,
                        row.classes.split(',').join(' '),
                        row.classes.split(',').join(', '),
                        this.format(row.species_count),
                        this.format(row.feature_count),
                        row.dataset,
                        row.pct_in_tax
                    )
                );
            },
            
            format: function(number, comma, period) {                
                var reg = /(\d+)(\d{3})/;
                var split = number.toString().split('.');
                var numeric = split[0];
                var decimal;
                
                comma = comma || ',';
                period = period || '.';
                decimal = split.length > 1 ? period + split[1] : '';
                
                while (reg.test(numeric)) {
                  numeric = numeric.replace(reg, '$1' + comma + '$2');
                }
                
                return numeric + decimal;
            }
         }
    );
    
    mol.map.dashboard.DashboardFilterDisplay = mol.mvp.View.extend(
        {
            init: function(type, name, value) {

                var html = '' +
                    '<div class="chkAndLabel filter {1}">' +
                    '   <input type="checkbox" checked="checked" ' +
                            'name="{1}" class="filters {0} {1}"/>' +
                    '   <label for="{1}">{2}</label>' +
                    '</div>';

                this._super(html.format(type, name, value));
                $(this).find('input').data('type', type);
                $(this).find('input').data('name', name);

            }
        }
    );

};