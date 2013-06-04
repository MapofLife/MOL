function getURLParameter(name) {
    return decodeURI((RegExp(name + '=' + '(.+?)(&|$)')
    .exec(location.search)||[,null])[1]);
}
function getRandom() {
    $.getJSON(
        'http://mol.cartodb.com/api/v1/sql',
        {
            q: 'SELECT binomial FROM modis_prefs_join m join ee_assets ee on m.binomial = ee.scientificname  limit 1 offset 33834*RANDOM()'
        },
        function (result) {
            //$('.search').val(getEE_ID(result.rows[0].binomial));
            getEE_ID(result.rows[0].binomial);
        }
    )
}
function init() {
        $('.search').keypress(function(e) {
            if(e.which == 13) {
                getEE_ID($(this).val());
                setTimeout(2000,"$('.search').autocomplete('close');");
            }
        });

        $('.search').autocomplete({
            minLength: 3,
            source: function(request, response) {
                $.getJSON(
                    'http://mol.cartodb.com/api/v1/sql?q=' +
                    'SELECT n, v FROM ac_mar_8_2013 ac ' +
                    ' LEFT JOIN elevandhabitat e ' +
                    'ON ac.n = e.scientific ' + 
                    ' LEFT JOIN modis_prefs_join m ' +
                    ' ON ac.n = m.binomial ' + 
                    "where (m.modisprefs is not null OR e.habitatprefs is not null) AND (n~*'\\m{TERM}' OR v~*'\\m{TERM}')"
                        .replace(/{TERM}/g, request.term),
                    function (json) {
                        var names = [],scinames=[];
                        $.each (
                            json.rows,
                            function(row) {
                                var sci, eng;
                                if(json.rows[row].n != undefined){
                                    sci = $.trim(json.rows[row].n);
                                    eng = (json.rows[row].v == null ||
                                        json.rows[row].v == '') ?
                                            '' :
                                            ', ' +
                                                json.rows[row].v.replace(
                                                    /'S/g, "'s"
                                                
                                            );
                                    names.push({
                                        label:'<div class="sci">'+sci+'</div>' +
                                              '<div class="eng">'+eng +'</div>',
                                        value:sci
                                    });
                                    scinames.push(sci);
                               }
                           }
                        );
                        response(names);
                        
                     },
                     'json'
                );
            },
       
            select: function(event, ui) {
                getEE_ID(ui.item.value);
            },
            close: function(event,ui) {

            },
            search: function(event, ui) {
                //getEE_ID(ui.item.value);
                
            },
            open: function(event, ui) {
                
                
            }
      });
      $('.mode').change(
          function() {
              if(chartData.length > 0) {
                  chartHandler(chartData)
              }
          }
      )
    if(getURLParameter("name")!='null') {
        getEE_ID(getURLParameter("name"));
    } else {
        $('.working').hide();
        $('.visualization').html('');
        getRandom();
    }
}

function getEE_ID(name) {
    var sql = '' + 
         'SELECT DISTINCT ' +
                'l.scientificname as scientificname, ' +
                'CASE when e.habitatprefs is null then m.modisprefs else e.habitatprefs end as modis_habitats, ' +
                "CASE WHEN e.finalmin is null OR e.finalmin = 'DD' then '-1000' else e.finalmin end as mine, " +
                "CASE WHEN e.finalmax is null OR e.finalmax = 'DD' then '10000' else e.finalmax end as maxe, " +
                'ee.ee_id as ee_id, ' +
                'CONCAT(n.v,\'\') as names, ' +
                'ST_xmin(l.extent_4326) as minx, ' +
                'ST_ymin(l.extent_4326) as miny, ' +
                'ST_xmax(l.extent_4326) as maxx, ' +
                'ST_ymax(l.extent_4326) as maxy, ' +
                'CASE when eol.good then eolthumbnailurl else null end as eolthumbnailurl, ' +
                'CASE when eol.good then eolmediaurl else null end as eolmediaurl, ' +
                'initcap(t.class) as _class, initcap(family) as family, initcap(_order) as _order ' +
            'FROM layer_metadata_mar_8_2013 l ' +
            ' LEFT JOIN taxonomy t ON ' +
            'l.scientificname = t.scientificname ' +
            ' LEFT JOIN ee_assets ee ON ' +
            ' l.scientificname = ee.scientificname ' +
            'LEFT JOIN ac_mar_8_2013 n ON ' +
                'ee.scientificname = n.n ' +
            'LEFT JOIN elevandhabitat e ON ' +
                'ee.scientificname = e.scientific ' +
            'LEFT JOIN modis_prefs_join m' +
            ' ON ee.scientificname = m.binomial ' +
            'LEFT JOIN eol ON ' +
            ' ee.scientificname = eol.scientificname ' +
            "where (m.modisprefs is not null OR e.habitatprefs is not null) AND (n.n~*'\\m{TERM}' OR n.v~*'\\m{TERM}') " +
                 " and ee.dataset_id ILIKE'%iucn%' " +
                 " and ee.ee_id is not null " +
            ' LIMIT 1',
         term = name,
         source = (getURLParameter("source") != "null") ? 
            getURLParameter("source") : 'iucn',
         params = {q : sql.replace(/{TERM}/g,term).replace(/{SOURCE}/g,source)};
         
    map = new google.maps.Map($('.map_container')[0],map_options);
    
    chartData = [];

    $('.modeContainer').hide();
    $('.visualization').html('<img height=40 width=40 style="position:absolute; left:205px; top:205px;" src="/static/loading.gif">');
    
    $.getJSON('http://mol.cartodb.com/api/v2/sql', params, function(response) {
        
        if (response.total_rows == 0) {
            $('.working').hide();
            $('.info').hide();
            $('.image').empty();
            $('.visualization').html('There are no range maps or habitat preference data for this species.');
            return;
        } else {
            $('.msg').html('');
        }
        
        
        $('.info').hide();
        var bounds = new google.maps.LatLngBounds(
            new google.maps.LatLng(response.rows[0].miny, response.rows[0].minx),
            new google.maps.LatLng(response.rows[0].maxy, response.rows[0].maxx)
        );
        map.fitBounds(bounds);
        var habitats = response.rows[0].modis_habitats.split(','),
            elev = [
                (response.rows[0].mine == 'DD') ? 
                    -1000 : response.rows[0].mine,
                (response.rows[0].maxe == 'DD') ? 
                    9000 : response.rows[0].maxe],
                ee_id = response.rows[0].ee_id,
            mod_params = {
                habitats : response.rows[0].modis_habitats,
                elevation : elev.join(','),
                ee_id : ee_id
            };
        scientificname = response.rows[0].scientificname;
        commonnames = ' (' + response.rows[0].names + ')';
        if(response.rows[0].eolthumbnailurl!=null) {
            $('.image').empty()
            $('.image').append($('<img class="specimg" src="'+response.rows[0].eolmediaurl+'">'));
            if($('.specimg').width()>$('.specimg').height()) {
                $('.specimg').width(250);
            } else {
                $('.specimg').height(250);
            }
            
        } else {
             $('.image').html('');
        }
        
        $('.sciname').html(response.rows[0].scientificname);
        $('.common').html(response.rows[0].names.replace(/,.*/,''));
        if(response.rows[0]._class!=null) {        
            $('._class').html('Class: ' + response.rows[0]._class);
        } else {
            
        }
        
        $('.family').html('Family: ' + response.rows[0].family);
        $('._order').html('Order: ' + response.rows[0]._order);
        if(elev[0] != '-1000' && elev[1] != '10000') {
            $('.elev_range').html('Elevation range: '+ elev[0]+' to '+elev[1]+' meters');
        } else {
            $('.elev_range').html('');
        }
        $('.suitable .modis_class').hide();
        $('.unsuitable .modis_class').show();
        $.each(
            habitats,
            function(i) {
                $('.suitable .modis_class.'+habitats[i]).show();
                
                $('.unsuitable .modis_class.'+habitats[i]).hide();
            }
        );
        $('.info').show();
        
        $.getJSON('ee_modis_change', 
            mod_params, 
            function(response) {
                chartHandler(response);
            }
        );
        mod_params.get_area = 'false';
        $.getJSON('ee_modis_change', mod_params, function(response) {
            loadLayers(response);
        });
    }).error(function() {
        $('.working').hide();
        $('.visualization').html(
            "There are no range maps or " + 
            "habitat preference data for this species.");
    });
    
}
function chartHandler(response) {
    var pct_change = [['Year','% of 2001 Area']],
        vals = response.slice(1);
    chartData = response;
    $('.working').hide();
    
    $('.msg').html('');
    $.each(
        vals,
        function(row) {
            pct_change.push([vals[row][0],100*(vals[row][1])/vals[0][1]]);
        }
    )
    
    if ($('.mode').val() == 'pct') {
        drawVisualization(pct_change, '% 2001 Habitat Area');
    } else {
        drawVisualization(response, 'Area (sq km)');
    }


}
function drawVisualization(viz_response, title) {
    // Create and populate the data table.
    var data = google.visualization.arrayToDataTable(viz_response), 
    chart = new google.visualization.ScatterChart($('.visualization')[0]);

    $('.modeContainer').show();
    chart.draw(data, {
        title: 'Suitable habitat for {NAME} {COMMON}'
            .replace(/{NAME}/g, scientificname)
            .replace(/{COMMON}/g, commonnames),
        width: 450,
        height: 400,
        //theme: "maximized",
        vAxis: {
            title : title,
            titleTextStyle : {
                color : "green"
            },
            visibleInLegend: false,
            viewWindowMode: 'pretty'
        },
        hAxis: {
            title: "YEAR",
            titleTextStyle: {
                color: "green"
            },
            format: '####',
            viewWindowMode: 'pretty'
        },
        series: {0:{ visibleInLegend: false}},
        trendlines: {
            0 : {
                color: 'orange',
                lineWidth: 10,
                opacity: 0.2,
                pointSize: 0,
                selectable: false,
                visibleInLegend: true
            }
        },
        legend: {
            position: 'top'
        },
        pointSize: 17,
        
    });
    //chart.setSelection()
    google.visualization.events.addListener(
        chart, 'select', 
        function() {selectHandler(chart, data)});
}

function selectHandler(chart, data) {
    try {
        map.overlayMapTypes.setAt(
            0,
            modis_maptypes[
                'modis_'+ data.getValue(chart.getSelection()[0].row,0)
                ]
        );
    } catch (e) {
        console.log(data, chart);
    }
        
    //;
}

function loadLayers(modis_layers) {
    $.each(
        modis_layers,
        function(year) {
            modis_maptypes[year] = new google.maps.ImageMapType({
                getTileUrl: function(coord, zoom) {
                    return modis_layers[year]
                        .replace(/{X}/g, coord.x)
                        .replace(/{Y}/g, coord.y)
                        .replace(/{Z}/g, zoom)
                },
                tileSize: new google.maps.Size(256, 256)
            });
        }
    )
    map.overlayMapTypes.setAt(0,modis_maptypes['modis_2001']);
    
}
