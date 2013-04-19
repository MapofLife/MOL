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
                       "get_map_feature_metadata_test({0},{1},{2},{3},'{4}')";
            
            this.clickDisabled = false;
            this.makingRequest = false;
            this.mapMarker;
            this.activeLayers = [];

            this.lastRequestTime;
            google.maps.event.clearListeners(this.map,'click');
                this.map.setOptions({
                draggableCursor: 'auto'
            });
            google.maps.event.addListener(
                this.map,
                "click",
                this.featureclick.bind(this)
            );
        },

        start : function() {
            this.addEventHandlers();
        },

        addEventHandlers : function () {
            var self = this;

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
                'clear-map',
                function(event) {
                    if (self.mapMarker) {
                        self.mapMarker.remove();
                    }
                    self.map.setOptions({scrollwheel:true});
                }
            );

            this.bus.addHandler(
                'layer-click-action',
                function(event) {
                    var action = event.action;

                    self.clickDisabled = (action == 'info') ? false: true;



                    if(self.clickDisabled == false) {
                        google.maps.event.clearListeners(self.map,'click');
                        self.map.setOptions({
                            draggableCursor: 'auto'
                        });
                        google.maps.event.addListener(
                            self.map,
                            "click",
                            self.featureclick.bind(self)
                        );

                        //self.bus.fireEvent(
                        //    new mol.bus.Event('update-grid',{toggle: true}));
                    }
                }
            );
        },
        featureclick : function (mouseevent) {
            var tolerance = 4,
                sqlLayers,
                sql,
                sym,
                self = this;

            if(!this.clickDisabled && this.activeLayers.length > 0) {
                if(this.display) {
                    this.display.remove();
                }

                sqlLayers =  _.pluck(_.reject(
                                this.activeLayers,
                                function(al) {
                                    return al.op == 0;
                                }), 'id');

                sql = this.sql.format(
                        mouseevent.latLng.lng(),
                        mouseevent.latLng.lat(),
                        tolerance,
                        this.map.getZoom(),
                        sqlLayers.toString()
                );

                this.bus.fireEvent(new mol.bus.Event(
                    'show-loading-indicator',
                    {source : 'feature'}));



                $.getJSON(
                    this.url.format(sql),
                    function(data, textStatus, jqXHR) {
                        var results = {
                                latlng: mouseevent.latLng,
                                response: data
                            },
                            e;

                        if(!data.error && data.rows.length != 0) {
                            self.processResults(data.rows);
                            self.showFeatures(results)
                        }

                        self.makingRequest = false;

                        self.bus.fireEvent(
                            new mol.bus.Event(
                              'hide-loading-indicator',
                              {source : 'feature'}));
                    }
                );
            }
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
            self.display.mousemove(
                function(event) {
                    self.map.setOptions({scrollwheel:false})
                }
            );
            self.display.mouseout(
                function(event) {
                    self.map.setOptions({scrollwheel:true})
                }
            );


            self.featurect = 0;
            _.each(rows, function(row) {
                var i,
                    j,
                    k,
                    layerId,
                    icon,
                    contentHtml = '' +
                        '<h3>' +
                            '<a class="{5}" href="javascript:">' +
                                '<table width="100%"><tbody><tr>' +
                                '<td class="name">{0}</td>' +
                                '<td class="icons">' +
                                    '<span class="stylerContainer"></span>' +
                                    '<button ' +
                                        'class="type" ' +
                                        'title="Layer Type: {3}">' +
                                        '<img src="/static/maps/search/{4}.png">' +
                                    '</button>' +
                                    '<button ' +
                                        'class="source" ' +
                                        'title="Layer Source: {1}">' +
                                        '<img src="/static/maps/search/{2}.png">' +
                                    '</button>' +
                                '</td></tr></tbody></table>' +
                            '</a>' +
                        '</h3>';

                o = JSON.parse(row.get_map_feature_metadata_test);
                all = _.values(o)[0];
                allobj = all[0];
                layerId =  _.keys(o)[0];
                head = layerId.split("--");
                sp = mol.core.decode(head[1]).replace(/_/g, ' ');
                sp = sp.charAt(0).toUpperCase() + sp.slice(1);

                content = contentHtml.format(
                    sp,
                    allobj["Source"],
                    head[5],
                    allobj["Type"],
                    head[2],
                    layerId
                );

                //TODO try a stage content display
                myLength = (all.length > 100) ? 100 : all.length;
                self.featurect+=(all.length);

                if(myLength == 1) {
                    entry = '<div>{0} record found.'.format(all.length);
                } else {
                    entry = '<div>{0} records found.'.format(all.length);
                }

                if(all.length > 100) {
                    entry+=' Displaying first 100 records. Please zoom in '+
                        'before querying again to reduce the number of ' +
                        'records found.</div>';
                } else {
                    entry+='</div>';
                }

                for(j=0;j<myLength;j++) {
                    vs = all[j];
                    inside = '';

                    for(i=0;i < _.keys(vs).length; i++) {
                        k = _.keys(vs)[i];
                        if(k!=null && vs[k] != null && k!='' && vs[k] != '') {
                            inside+='<div class="itemPair">' +
                                '<b>{0}:&nbsp;</b>{1}</div>'
                                    .format(k,vs[k]);
                        }
                    }

                    if(j!=0) {
                        entry+="<div>&nbsp</div>";
                    }

                    entry+=inside;
                }

                content+='<div>{0}</div>'.format(entry);

                $(self.display).find('.accordion').append(content);
                icon = $('.layers #{0} .styler'.format(
                            mol.core.encode(layerId))).clone()
                $(icon).attr('title','');
                $(self.display).find(
                    '.{0} .stylerContainer'.format(mol.core.encode(layerId))
                ).append(icon);
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
                lngHem = (params.latlng.lng() > 0) ? 'E' : 'W',
                options = {
                    autoHeight: false,
                    collapsible: (params.response.total_rows > 1) ? true: false,
                    change: function (event, ui) {
                        self.mapMarker.draw();
                    },
                    animated: false
                },
                zoom = parseInt(self.map.getZoom()),
                tolerance = 3,
                radius = Math.round(
                    tolerance*40075000/(256*1000*Math.pow(2,zoom))
                ),
                infoHtml = '' +
                    '<span>' +
                        '{0} feature{1} from {2} layer{3} found within<br>' +
                        '{4} km of {5}&deg;{6}, {7}&deg;{8}' +
                    '</span>';

            if(params.response.total_rows > 1) {
                options.active = false;
            }

            info = $(infoHtml.format(
                        self.featurect,
                        ((self.featurect>1) ? 's' : ''),
                        params.response.total_rows,
                        ((params.response.total_rows>1) ? 's' : ''),
                        radius,
                        Math.round(params.latlng.lat()*1000)/1000,
                        latHem,
                        Math.round(params.latlng.lng()*1000)/1000,
                        lngHem
            ));

            $(self.display).find('.info').append(info);
            $(self.display).find('.accordion').accordion(options);

            self.display.close.click(
                function(event) {
                    event.stopPropagation();
                    self.mapMarker.remove();
                    self.map.setOptions({scrollwheel:true});
                }
            );
            self.mapMarker = new mol.map.FeatureMarker(
                params.latlng,
                self.map,
                self.display[0]
            );
        }
    });

    mol.map.FeatureDisplay = mol.mvp.View.extend({
        init : function(d, lat,NS,lng,EW) {
            var className = 'mol-Map-FeatureDisplay',
                html = '' +
                    '<div class="cartodb-popup">' +
                        '<a class="cartodb-popup-close-button close">x</a>' +
                        '<div class="mol-Map-FeatureDisplay ">' +
                            '<div class="contents">' +
                                '<div class="info"></div>' +
                                '<div class="accordion"></div>' +
                            '</div>'+
                        '</div>' +
                        '<div class="cartodb-popup-tip-container"></div>' +
                    '</div>';
            this._super(html);
            this.close = $(this).find('.close');
        }
    });

    //
    //Classes for a google maps info window overlay.
    //
    mol.map.FeatureMarker = function(latlng, map, div) {
            this.latlng_ = latlng;
            this.init_ = false;
            this.div_ = div;
            this.setMap(map);
    }
    mol.map.FeatureMarker.prototype = new google.maps.OverlayView();
    mol.map.FeatureMarker.prototype.draw = function () {
        var self = this,
            div = this.div_,
            panes,
            point;

        if (!this.init_) {
            // Then add the overlay to the DOM
            panes = this.getPanes();
            panes.overlayImage.appendChild(div);
            this.init_ = true;
            // catch mouse events and stop them propogating to the map
            google.maps.event.addDomListener(
                this.div_,
                'mousedown',
                this.stopPropagation_
            );
            google.maps.event.addDomListener(
                this.div_,
                'dblclick',
                this.stopPropagation_
            );

            google.maps.event.addDomListener(
                this.div_,
                'DOMMouseScroll',
                this.stopPropagation_
            );
            google.maps.event.addDomListener(
                this.div_,
                'click',
                function(e) {
                    google.maps.event.trigger(self, 'click')
                    self.stopPropagation_(e);
            });
        }
        // Position the overlay
        point = this.getProjection().fromLatLngToDivPixel(this.latlng_);
        if (point && div) {

            try {
                $(div).css('left',((point.x -28)+'px'));
                $(div).css('top',(point.y - $(div).height()-5) + 'px');
                if($(div).offset().top<0) {
                    this.map.panBy(0,$(div).offset().top-10);
                }
            } catch (e) {
                console.log(e);
            }
        }
    };
    mol.map.FeatureMarker.prototype.remove = function() {
        if (this.div_) {
          if (this.div_.parentNode) {
            this.div_.parentNode.removeChild(this.div_);
          }
          this.div_ = null;

        }
    };
    mol.map.FeatureMarker.prototype.getPosition = function() {
       return this.latlng_;
    };
    mol.map.FeatureMarker.prototype.getDOMElement = function() {
       return this.div_;
    };
    mol.map.FeatureMarker.prototype.stopPropagation_ = function(e) {
      if(navigator.userAgent.toLowerCase().indexOf('msie') != -1 &&
        document.all) {
        window.event.cancelBubble = true;
        window.event.returnValue = false;
      } else {
        e.stopPropagation();
      }
    }
}

