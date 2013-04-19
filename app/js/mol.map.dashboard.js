mol.modules.map.dashboard = function(mol) {

    mol.map.dashboard = {};

    mol.map.dashboard.DashboardEngine = mol.mvp.Engine.extend(
        {
            init: function(proxy, bus) {
                this.proxy = proxy;
                this.bus = bus;
                this.summary_sql = '' +
                    'SELECT DISTINCT * ' +
                    'FROM get_dashboard_summary_beta()';
                this.dashboard_sql = '' +
                    'SELECT DISTINCT * ' +
                    'FROM dashboard_metadata_mar_8_2013 ' +
                    'ORDER BY dataset_title asc';
                this.summary = null;
                this.types = {};
                this.sources = {};

            },

            start: function() {
                this.initDialog();
                this.addDashboardMenuButton();
            },

            addDashboardMenuButton : function() {
               var html = '' +
                    '<div ' +
                        'title="Toggle dashboard." ' +
                        'id="dashboard" ' +
                        'class="widgetTheme dash button">' +
                        'Dashboard' +
                    '</div>',
                    params = {
                        button: html
                    },
                    event = new mol.bus.Event('add-dashboard-toggle-button', params);

               this.bus.fireEvent(event);
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
                        var provider = $(dataset).data('provider'),
                            type = $(dataset).data('type_id'),
                            dataset_id = $(dataset).data('dataset_id'),
                            dataset_title = $(dataset).data('dataset_title'),
                            type_title = $(dataset).data('type');

                        $(dataset).find('.table').click (
                            function(event) {
                                self.bus.fireEvent(
                                    new mol.bus.Event(
                                        'metadata-toggle',
                                        {params:
                                            {dataset_id: dataset_id,
                                             title: dataset_title}}
                                     )
                                 );
                            }
                        );
                        $(dataset).find('.type').click (
                                function(event) {
                                    self.bus.fireEvent(
                                        new mol.bus.Event(
                                            'metadata-toggle',
                                            {params:{type: type, title: type_title}}));
                                }
                         );
                    }
                );
            },

            /**
             * Fires the 'add-map-control' event. The mol.map.MapEngine handles
             * this event and adds the display to the map.
             */
            initDialog: function() {
                var self = this;

                $.getJSON(
                    mol.services.cartodb.sqlApi.json_url.format(this.dashboard_sql),
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
                    'http://mol.cartodb.com/api/v1/sql?q={0}'.format(this.summary_sql),
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
                             'Accepted species names:' +
                    '      </span>' +
                    '      <span class="all_matches">' +
                    '      </span>' +
                    '      <span class="label">' +
                             'Total records:' +
                    '      </span>' +
                    '      <span class="records_total">' +
                    '      </span>' +
                    '    </div>' +
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


                this._super(html);
                _.each(
                    rows,
                    function(row) {
                        self.fillRow(row);
                    }
                )

                this.dashtable = $(this).find('.dashtable');
                this.dashtable.tablesorter({
                    sortList: [[0,0]],
                    widthFixed: true,
                    theme: "blue",
                    widgets: ["filter","zebra","scroller"],
                    widgetOptions : {
                      scroller_height : 500,
                      scroller_barWidth : 17,
                      scroller_jumpToHeader: true,
                      scroller_idPrefix : 's_'
                    }
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

                if(summary!=null) {
                    self.fillSummary(summary);
                }
            },

            fillRow:  function(row) {
                var self = this;

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
            }
        }
    );

    mol.map.dashboard.DashboardRowDisplay = mol.mvp.View.extend(
        {
            init: function(row) {
                var html = '' +
                    '<tr class="master dataset">' +
                        '<td class="table {8}">{8}</td>' +
                        '<td class="type {0}">{1}</td>' +
                        '<td class="provider {2}">{3}</td>' +
                        '<td class="class {4}">{5}</td>' +
                        '<td class="spnames">{6}</td>' +
                        '<td class="records">{7}</td>' +
                        '<td class="pctmatch">{9}</td>' +
                    '</tr>',
                    self = this;

                self._super(
                    html.format(
                        row.type_id,
                        row.type,
                        row.dataset_id,
                        row.provider,
                        row.classes.split(',').join(' '),
                        row.classes.split(',').join(', '),
                        this.format(row.species_count),
                        this.format(row.feature_count),
                        row.dataset_title,
                        row.pct_in_tax
                    )
                );
                //store some data in each dataset/row
                 _.each(
                     _.keys(row),
                     function(key) {
                        $(self).data(key, row[key]);
                     }
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



};
