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
            
            this.clickDisabled = false;
            this.makingRequest = false;
            this.mapMarker;
        },

        start : function() {
            this.addEventHandlers();
        },
        
        addEventHandlers : function () {
            var self = this;
            
            this.bus.addHandler(
                'layer-click-toggle',
                function(event) {
                    self.clickDisabled = event.disable;
                }
            );
                
            //may want to wait to add this until ready
            google.maps.event.addListener(
                self.map,
                "click",
                function (mouseevent) {
                    var reqLays = [],
                        tolerance = 5,
                        sql,
                        sym;
                        
                    if(!self.clickDisabled && 
                        self.map.overlayMapTypes.length > 0) {
                          
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
    
                            self.map.overlayMapTypes.forEach(
                                function(mt) {
                                    if(mt.opacity != 0) {
                                        reqLays.push(mt.name);
                                    }
                                }  
                            );       
                            
                            sql = self.sql.format(
                                    mouseevent.latLng.lng(),
                                    mouseevent.latLng.lat(),
                                    tolerance,
                                    self.map.getZoom(),
                                    reqLays.toString()
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
                                
                            self.mapMarker = new google.maps.Marker(
                                {
                                    map: self.map,
                                    icon: sym,
                                    position: mouseevent.latLng,
                                    clickable: false
                                }
                            );    
                            
                            $.getJSON(
                                self.url.format(sql),
                                function(data, textStatus, jqXHR) {
                                    var results = {
                                            latlng: mouseevent.latLng,
                                            response: data
                                        },
                                        e;
                                        
                                    console.log("results");
                                    console.log(data);    
                                        
                                    if(!data.error) {
                                        self.processResults(data.rows);
                                                                     
                                        e = new mol.bus.Event(
                                                'feature-results', 
                                                results
                                            );    
                                            
                                        self.bus.fireEvent(e);
                                    } else {
                                        self.mapMarker.setMap(null);
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
                head,
                sp,
                myLength,
                content,
                src,
                entry,
                inside;

            self.display = new mol.map.FeatureDisplay();

            _.each(rows, function(row) {
                var i,
                    j,
                    k;

                o = JSON.parse(row.layer_features);
                all = _.values(o)[0];
                
                src = all[0];
                
                head = _.keys(o)[0].split("--");
                sp = head[1].replace("_", " ");
                sp = sp.charAt(0).toUpperCase() + sp.slice(1);
                
                content = '' + 
                        '<h3>' + 
                        '  <a href="#">' + sp + " - " + src["Source"] + '</a>' + 
                        '</h3>';
                
                entry = '';
                
                //TODO replace with a limit on the query to how many records
                //are returned
                myLength = (all.length > 10) ? 10 : all.length;        
                
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
            });
        },
        
        showFeatures: function(params) {
            var self = this;

            $(self.display).find('#accordion').accordion({
                                                    autoHeight: false, 
                                                    clearStyle: true});
                 
            self.display.dialog({
                autoOpen: true,
                width: 350,
                minHeight: 250,
                dialogClass: 'mol-Map-FeatureDialog',
                modal: false,
                title: 'At ' +
                       Math.round(params.latlng.lat()*1000)/1000 +
                       ', ' +
                       Math.round(params.latlng.lng()*1000)/1000,
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

