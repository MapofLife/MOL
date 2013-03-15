mol.modules.map.feature = function(mol) {
    
    mol.map.feature = {};
    
    mol.map.feature.FeatureEngine = mol.mvp.Engine.extend({
        init : function(proxy, bus, map) {
            this.proxy = proxy;
            this.bus = bus;
            this.map = map;
            //TODO add
            this.url = 'http://mol.cartodb.com/api/v2/sql?callback=?&q={0}';
            //TODO add
            this.sql = "SELECT * FROM " + 
                       "get_map_feature_metadata({0},{1},{2},{3},'{4}')";
            this.mesql = "SELECT {5} as timestamp,* FROM " + 
                       "get_feature_presence({0},{1},{2},{3},'{4}')";           
            
            this.clickDisabled = true;
            this.makingRequest = false;
            this.mapMarker;
            this.activeLayers = [];
            
            this.lastRequestTime;        },

        start : function() {
            this.addEventHandlers();
        },
        
        addEventHandlers : function () {
            var self = this;
            
            this.bus.addHandler(
                'layer-click-toggle',
                function(event) {
                    if(event.disable) {
                      self.clickDisabled = event.disable;  
                        
                      self.map
                        .setOptions(
                          { 
                            draggableCursor: 
                            'url(' + 
                            'http://maps.google.com/mapfiles/' + 
                            'openhand.cur' + 
                            '), move' 
                          }
                        ); 
                    } 
                }
            );
            
            this.bus.addHandler(
                'add-layers',
                function(event) {
                    var newLays = _.map(event.layers, 
                                        function(l) { 
                                          var o = {id:l.id, op:l.opacity};
                                          
                                          return o });
                    
                    self.activeLayers = _.compact(
                                            _.union(
                                                newLays, 
                                                self.activeLayers));                              
                }
            );
            
            this.bus.addHandler(
                'remove-layers',
                function(event) {
                    var oldLays = _.map(event.layers, 
                                        function(l) { 
                                            var o = {id:l.id, op:l.opacity};
                                            return o;
                                        });                       
                                                
                    _.each(oldLays, function(e) {
                        self.activeLayers = _.reject(
                                                self.activeLayers, 
                                                function(ol) {
                                                    return ol.id == e.id;
                                                });
                    });                                                                      
                }
            );
            
            this.bus.addHandler(
                'layer-toggle',
                function(event) {
                    _.each(self.activeLayers, function(al) {
                        if(al.id == event.layer.id) {
                            al.op = event.showing ? 1 : 0;
                        }  
                    });             
                }
            );
            
            this.bus.addHandler(
                'layer-clicking-toggle',
                function(event) {
                    self.clickDisabled = event.disable;
                    
                    if(!self.clickDisabled) {
                      self.map
                        .setOptions({ draggableCursor: 'pointer' }); 
                    } else {
                      self.map
                        .setOptions(
                          { 
                            draggableCursor: 
                            'url(' + 
                            'http://maps.google.com/mapfiles/' + 
                            'openhand.cur' + 
                            '), move' 
                          }
                        ); 
                    }    
                }
            );
            
            /* might use later for cursor management
             * 
             * Google Maps doesn't make the cursor change until the mouse
             * moves again, so if you change the cursor programmatically
             * it isn't reflected on the map until the user moves the mouse
             * again, making it look like there's a weird jerky lag in cursor
             * change.
             */
            
            /*
            this.bus.addHandler(
                'map-mouse-stop',
                function(event) {
                    var d;
                    
                    if(!self.clickDisabled && self.activeLayers.length > 0) {
                        var tolerance = 2,
                            sqlLayers,
                            sql;
                        
                        sqlLayers =  _.pluck(_.reject(
                                                self.activeLayers, 
                                                function(al) {
                                                    return al.op == 0;
                                                }), 'id');         
                              
                        d = new Date();
                        
                        self.lastRequestTime = d.getTime()      
                                
                        sql = self.mesql.format(
                                event.latLng.lng(),
                                event.latLng.lat(),
                                tolerance,
                                self.map.getZoom(),
                                sqlLayers.toString(),
                                self.lastRequestTime
                        );
                        
                        $.getJSON(
                            self.url.format(sql),
                            function(data, textStatus, jqXHR) {
                                if(data.rows[0]["timestamp"] == d.getTime()) {
                                    
                                }
                                
                                if(data.rows[0]["get_feature_presence"]) {
                                  self.map
                                    .setOptions({ draggableCursor: 'pointer' }); 
                                } else {
                                  self.map
                                    .setOptions(
                                      { 
                                        draggableCursor: 
                                        'url(' + 
                                        'http://maps.google.com/mapfiles/' + 
                                        'openhand.cur' + 
                                        '), move' 
                                      }
                                    ); 
                                }                                                            
                            }
                        );  
                      
                    }  
                }  
            );
            */
            
            /* might use this later for cursor management
            google.maps.event.addListener(
                self.map,
                'mousemove',
                function (mouseevent) {
                    if(!self.clickDisabled && self.activeLayers.length > 0) {
                       if(self.lastMapMoveEnd) {
                           if(self.lastMapMoveEnd.readyState == 4) {
                              self.lastMapMoveEnd.abort();
                           }
                       }
                    }
                }  
            );
            */
                
            //may want to wait to add this until ready
            google.maps.event.addListener(
                self.map,
                "click",
                function (mouseevent) {
                    var tolerance = 2,
                        sqlLayers,
                        sql,
                        sym;
                        
                    if(!self.clickDisabled && self.activeLayers.length > 0) {
                        if(self.makingRequest) {
                            alert('Please wait for your feature metadata ' + 
                              'request to complete before starting another.');
                        } else {
                            self.makingRequest = true;
                          
                            if(self.display) {
                                if(self.display.dialog("isOpen")) {
                                    self.display.dialog("close");
                                }
                            }   
                            
                            sqlLayers =  _.pluck(_.reject(
                                            self.activeLayers, 
                                            function(al) {
                                                return al.op == 0;
                                            }), 'id');         
                            
                            sql = self.sql.format(
                                    mouseevent.latLng.lng(),
                                    mouseevent.latLng.lat(),
                                    tolerance,
                                    self.map.getZoom(),
                                    sqlLayers.toString()
                            );
                            
                            self.bus.fireEvent(new mol.bus.Event(
                                'show-loading-indicator',
                                {source : 'feature'}));
                                
                            sym = {
                                    path: google.maps.SymbolPath.CIRCLE,
                                    scale: 6,
                                    strokeColor: 'black',
                                    strokeWeight: 3,
                                    fillColor: 'yellow',
                                    fillOpacity: 1,
                                  };     
                            
                            $.getJSON(
                                self.url.format(sql),
                                function(data, textStatus, jqXHR) {
                                    var results = {
                                            latlng: mouseevent.latLng,
                                            response: data
                                        },
                                        e;
                                        
                                    if(!data.error && data.rows.length != 0) {
                                        self.mapMarker = new google.maps.Marker(
                                            {
                                                map: self.map,
                                                icon: sym,
                                                position: mouseevent.latLng,
                                                clickable: false
                                            }
                                        );
                                        
                                        self.processResults(data.rows);
                                                                     
                                        e = new mol.bus.Event(
                                                'feature-results', 
                                                results
                                            );    
                                            
                                        self.bus.fireEvent(e);
                                    }  
                                        
                                    self.makingRequest = false;    
                                    
                                    self.bus.fireEvent(
                                        new mol.bus.Event(
                                          'hide-loading-indicator',
                                          {source : 'feature'})); 
                                }
                            );
                        }  
                    }
                }
            );
            
            this.bus.addHandler(
                'feature-results',
                function(event) {
                    self.showFeatures(event);
                }
            );
        },
        
        processResults: function(rows) {
            var self = this,
                o,
                vs,
                all,
                allobj,
                head,
                sp,
                myLength,
                content,
                entry,
                inside;

            self.display = new mol.map.FeatureDisplay();

            _.each(rows, function(row) {
                var i,
                    j,
                    k;
                    
                o = JSON.parse(row.layer_features);
                all = _.values(o)[0];
                allobj = all[0];
                                
                
                head = _.keys(o)[0].split("--");
                sp = head[1].replace("_", " ");
                sp = sp.charAt(0).toUpperCase() + sp.slice(1);
                
                content = '' + 
                        '<h3>' + 
                        '  <a href="#">' + 
                             sp +
                        '    <button ' + 
                                'class="source" ' + 
                                'title="Layer Source: ' 
                                + allobj["Source"] + '">' +
                        '      <img src="/static/maps/search/' + head[3] + '.png">' +
                        '    </button>' +
                        '    <button ' + 
                                'class="type" ' + 
                                'title="Layer Type: ' 
                                + allobj["Type"] + '">' + 
                        '      <img src="/static/maps/search/' + head[2] + '.png">' +  
                        '    </button>' + 
                        '  </a>' + 
                        '</h3>';

                //TODO try a stage content display
                myLength = (all.length > 100) ? 100 : all.length; 
                
                if(myLength == 1) {
                    entry = '<div>' + all.length + " record found.";
                } else {
                    entry = '<div>' + all.length + " records found.";
                }
                
                if(all.length > 100) {
                    entry+=' Displaying first 100 records. Please zoom in before querying again to reduce the number of records found.</div>';  
                } else {
                    entry+='</div>';
                }    
                
                for(j=0;j<myLength;j++) {
                    vs = all[j];
                    inside = ''; 
                      
                    for(i=0;i < _.keys(vs).length; i++) {
                        k = _.keys(vs)[i];
                        inside+='<div class="itemPair">' + 
                                '  <div class="featureItem">' + k + ': </div>' + 
                                '  <div class="featureData">' + vs[k] + '</div>' + 
                                '</div>';          
                    }
                     
                    if(j!=0) {
                        entry+="<div>&nbsp</div>";  
                    }
                     
                    entry+=inside;  
                }

                content+='<div>' + entry + '</div>';
                
                $(self.display).find('#accordion').append(content);
                
                $(self.display).find('.source').click(
                    function(event) {
                          self.bus.fireEvent(
                              new mol.bus.Event(
                                  'metadata-toggle',
                                  {params : {
                                      dataset_id: head[4],
                                      title: allobj["Source"]
                                  }}
                              )
                          );
                          event.stopPropagation();
                          event.cancelBubble = true;
                      }
                );
                
                $(self.display).find('.type').click(
                    function(event) {
                          self.bus.fireEvent(
                              new mol.bus.Event(
                                  'metadata-toggle',
                                  {params : {
                                      type: head[2],
                                      title: allobj["Type"]
                                  }}
                              )
                          );
                          event.stopPropagation();
                          event.cancelBubble = true;
                      }
                );
            });
        },
        
        showFeatures: function(params) {
            var self = this,
                latHem = (params.latlng.lat() > 0) ? 'N' : 'S',
                lngHem = (params.latlng.lng() > 0) ? 'E' : 'W';

            $(self.display)
                .find('#accordion')
                    .accordion({autoHeight: false, 
                                clearStyle: true});                 
                 
            self.display.dialog({
                autoOpen: true,
                width: 350,
                minHeight: 250,
                dialogClass: 'mol-Map-FeatureDialog',
                modal: false,
                title: 'Near ' +
                       Math.abs(Math.round(
                           params.latlng.lat()*1000)/1000) +
                           '&deg;&nbsp;' + latHem + '&nbsp;' +
                       Math.abs(Math.round(
                           params.latlng.lng()*1000)/1000) +
                           '&deg;&nbsp;' + lngHem,
                beforeClose: function(evt, ui) {
                    self.mapMarker.setMap(null);
                }
            });            
        }
    });
    
    mol.map.FeatureDisplay = mol.mvp.View.extend({
        init : function(names) {
            var className = 'mol-Map-FeatureDisplay',
                html = '' +
                    '<div class="' + className + '">' +
                        '<div id="accordion" ></div>' +
                    '</div>';
                //in-line div height     

            this._super(html);
        }
    });
}

