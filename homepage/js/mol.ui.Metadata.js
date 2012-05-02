MOL.modules.Metadata = function(mol) { 
    
    mol.ui.Metadata = {};

    /**
     * 
     *      
     */
    mol.ui.Metadata.Engine = mol.ui.Engine.extend(
        {
            /**
             * Constucts a new Map Engine.
             *
             * @param api the mol.ajax.Api for server communication
             * @param bus the mol.events.Bus for event handling 
             * @constructor
             */
            init: function(api, bus) {
                this._api = api;
                this._bus = bus;  
                this._collections = {};
                this._collectionIds = {};
            },            
            _showMetadata: function(id) {
                var display = this._display,
                    self = this,
                    api = this._api,
                    ActionCallback = mol.ajax.ActionCallback,
                    LayerAction = mol.ajax.LayerAction;
                
                var par = display.find('li div');
                for (p in par){
                    par[p].removeStyleName('selected');
                }
                var itm = display.find('#'+id.replace(/\//g,"\\/"))[0];
                itm.addStyleName('selected');
                
                //display.getCollectionTitle().text(colText);
                //display.getItemTitle().text(itemText);
                
                var dat = display.findChild('.data');
                var mo = dat.find('.meta-object');
                for (m in mo) {
                    mo[m].removeStyleName('selected');
                }
                var meta = dat.findChild('#'+id.replace(/\//g,"\\/"));
                
                //console.log(meta.getId());
                if (meta.attr('id') != null ) {
                    meta.addStyleName('selected');
                } else {
                    var action = new LayerAction('metadata-item', {key_name:id});
                    var callback = new ActionCallback(
                        function(response) {
                            self._addMetadataResult(response);
                        },

                        function(error) {
                            mol.log.error(error);
                        }
                    );
                    api.execute(action, callback);  
                }
            },
            _addMetadataResult: function(result) {
                var display = this._display,
                    dat = display.findChild('.data'),
                    id = result.key_name,
                    item = true,
                    imgUrl = null,
                    meta = null;
                    
                if (result.key_name.indexOf('collection') === 0) {
                    item = false;
                    imgUrl = "http://maps.google.com/maps/api/staticmap?zoom=0&center=20,0&size=256x128&sensor=false";
                } else {
                    imgUrl = "/data/overview?w=256&h=128&key_name="+result.key_name;
                }
                meta = display.addNewMeta(id);
                meta.addStyleName('selected');
                
                meta.getSource().text(result.data.source + ": ");
                meta.getType().text(result.data.type);
                meta.getName().text(result.data.name);
                
                if (result.data.url) {
                    //result.data.url
                    meta.getUrl().text("original data");
                    meta.getUrl().attr('href',result.data.url);
                }
                if ( result.data.description ){
                    meta.getDescription().text("Description: " + result.data.description);
                }              
                if ( result.data.agreements ){
                    for ( a in result.data.agreements) {
                        meta.newAgreement().text( result.data.agreements[a] );
                    }
                }       
                if ( result.data.references ){
                    for ( r in result.data.references) {
                        meta.newReference().text(
                            result.data.references[r].authors + " " +
                            result.data.references[r].year + ". " +
                            result.data.references[r].title + ". " +
                            result.data.references[r].publication 
                        );
                    }
                }
                if (result.data.spatial) {
                    meta.getSpatialText().text(result.data.spatial.crs.extent.text);
                    meta.getWest().text(result.data.spatial.crs.extent.coordinates[0].toFixed(4));
                    meta.getSouth().text(result.data.spatial.crs.extent.coordinates[1].toFixed(4));
                    meta.getEast().text(result.data.spatial.crs.extent.coordinates[2].toFixed(4));
                    meta.getNorth().text(result.data.spatial.crs.extent.coordinates[3].toFixed(4));
                    
                    meta.overviewImg(imgUrl);
                }
                for (n in result.data.variables) {
                    meta.newVariable(result.data.variables[n].name,result.data.variables[n].value);
                }
                
                if (result.data.storage){
                    meta.getFileDate().text(result.data.storage.uploadDate);
                    meta.getFileLocation().text(result.data.storage.location);
                    meta.getFileFormat().text(result.data.storage.format);
                }
            },
            _itemCallback: function(e) {
                var display = this._display,
                    stE = new mol.ui.Element(e.target);
                var id = stE.attr('id');
                //var itm = display.find('#'+id.replace(/\//g,"\\/"))[0];
                //var col = itm.getParent().getParent().getParent();
                //var colText = col.findChild('.collection').text() + ": ";
                //var itemText = itm.text();
                this._showMetadata(id);
            },
            _collCallback: function(e) {
                var stE = new mol.ui.Element(e.target);
                var id = stE.attr('id');
                this._showMetadata(id); //, stE.text(), " ");
            },

            _deleteDataset: function(layerId) {
                var collectionId = this._collectionIds[layerId],
                    collection = null;
                if (collectionId in this._collections) {
                    collection = this._display.getCollection(collectionId);
                    collection.remove();
                    delete this._collections[collectionId];
                }
            },

            _addDataset: function(layer) {
                var itemId = layer.getKeyName(),
                    itemName = layer.getName(),
                    collectionName = layer.getSubName(),
                    display = this._display,
                    self = this,
                    tmp = ['foo', 'bar'], //itemId.split("/"),
                    collectionId = "collection/" + tmp[0] + "/" + tmp[1] + "/latest",
                    c = null,
                    it = null;
                
                if (! (collectionId in this._collections)){
                    console.log(collectionId);
                    c = display.getNewCollection(collectionId);
                    c.getName().text(collectionName);
                    
                    c.getName().click( function(e) { self._collCallback(e); } );
                    
                    this._collections[collectionId] = {items: {}};
                    this._collectionIds[layer.getId()] = collectionId;
                }
                    
                if (!(itemId in this._collections[collectionId].items)){
                    it = display.getNewItem(itemId,collectionId);
                    it.getName().text(itemName);
                    it.getName().click(function(event){self._itemCallback(event);});
                    this._collections[collectionId].items[itemId] = 0;
                }
            },
            
            /**
             * Starts the engine and provides a container for its display.
             * 
             * @param container the container for the engine display 
             * @override mol.ui.Engine.start
             */
            start: function(container) {
                this._bindDisplay(new mol.ui.Metadata.Display());
            },
             
            /**
             * Binds the display.
             */
            _bindDisplay: function(display, text) {  
                var self = this,
                    bus = this._bus,
                    LayerEvent = mol.events.LayerEvent,
                    LayerControlEvent = mol.events.LayerControlEvent,
                    widget = null;
                    
                this._display = display;
                display.setEngine(this); 
                
                bus.addHandler(
                    LayerControlEvent.TYPE,
                    function(event) {
                        var act = event.getAction(),
                            layerId = event.getLayerId();
                        switch (act) {    
                        case 'delete-click':
                            self._deleteDataset(layerId);
                            break;
                        }
                    }
                );

                bus.addHandler(
                    LayerEvent.TYPE, 
                    function(event) {
                        var act = event.getAction(),
                            layer = null,
                            colText = null,
                            itemText = null;
                        switch (act) {    
                        case 'add':
                            layer = event.getLayer();
                            self._addDataset(layer);
                            break;
                        case 'view-metadata':
                            layer = event.getLayer();
                            colText = layer.getSubName() + ": ";
                            itemText = layer.getName();
                            self._showMetadata(layer.getKeyName(), colText, itemText );
                            document.getElementById('metadata').scrollIntoView(true);
                            widget = self._display.getMapLink();
                            widget.click(
                                function(event) {
                                    bus.fireEvent(new MOL.env.events.LocationEvent({}, 'get-url', true));
                                }
                            );
                            break;                            
                        }
                    }
                );
                
            }
        }
    );

    /**
     * The Meta Object.
     */
    mol.ui.Metadata.Meta = mol.ui.Display.extend(
        {
            init: function(id) {
                this._id = id;
                this._spatial = null;
                this._super('<div class="meta-object" id="'+this._id+'">'+
                            '   <div class="object-title">' +
                            '       <span class="src-path"></span>' +
                            '       <span class="arrow">   </span>' +
                            '       <span class="type-path"></span>' +
                            '   </div>' +
                            '   <div class="name-path"></div>' +
                            '   <a href="" class="url"></a>' +
                            '   <div class="description"></div>' +
                            '   <div class="spatial"></div>' +
                            '   <div class="small-left"></div>' +
                            '   <div class="small-right"></div>' +
                            '   <div class="agreements"> </div>' +
                            '   <div class="references"> </div>' +
                            '</div>');
            },
            _fileInit: function() {
                this._file = new mol.ui.Element();
                this._file.setStyleName('file-data');
                this._file.setInnerHtml('<div class="label">Format:</div>' + 
                                        '   <div class="file-format"></div>' + 
                                        '   <div class="label">Download:</div>' + 
                                        '   <a href="" class="file-location"></a>' + 
                                        '   <div class="label">File date:</div>' + 
                                        '   <div class="file-upload-date">' +
                                        '</div>');
                this.findChild('.small-right').append(this._file);
                return this._file;
            },
            _temporalInit: function() {
                this._temporal = new mol.ui.Element('<div class="temporal">' +
                                 '   <div class="title">Temporal span:</div>' +
                                 '   <div class="start">n/a</div>' +
                                 '   <div class="bar"></div>' +
                                 '   <div class="end">n/a</div>' +
                                 '<div>');
                this.findChild('.small-left').append(this._temporal);
                return this._temporal;
            },
            _variablesInit: function() {
                this._variables = new mol.ui.Element();
                this._variables.setStyleName('variables');
                this._variables.setInnerHtml('<div class="title">Other info:</div>');
                this.findChild('.small-left').append(this._variables);
                return this._variables;
            },
            _spatialInit: function() {
                this._spatial = new mol.ui.Element();
                this._spatial.setInnerHtml('<div class="text">Geography: <span class="spatial-text"></span></div>' +
                                '<div class="spacolumn">' +
                                '  <div class="title">Bounding Box</div>' +
                                '  <div class="bounding-box">' +
                                '      <div class="north">90</div>' +
                                '      <div class="west">-180</div>' +
                                '      <div class="east">180</div>' +
                                '      <div class="south">-90</div>' +
                                '  </div>' +
                                '</div>' +
                                '<div class="spacolumn">' +
                                '  <div class="title">Overview</div>' +
                                '  <div class="map-overview">' +
                                '  </div>' +
                                '</div>');
                this.findChild('.spatial').append(this._spatial);
                return this._spatial;
            },
            getDescription: function() {
                var x = this._desc,
                    s = '.description';
                return x ? x : (this._desc = this.findChild(s));
            },
            newAgreement: function(){
                var s = '.agreements',
                    n = new mol.ui.Element();
                n.setStyleName('agreement-text');
                this.findChild(s).append(n);
                return n;                
            },
            newReference: function(){
                var s = '.references',
                    n = new mol.ui.Element();
                n.setStyleName('reference-text');
                this.findChild(s).append(n);
                return n;                
            },
            getFileFormat: function(){
                var fi = this._file ? this._file : this._fileInit(),
                    x = this._ff,
                    s = '.file-format';
                return x ? x : (this._ff = this.findChild(s));
            },
            getFileLocation: function(){
                var fi = this._file ? this._file : this._fileInit(),
                    x = this._fl,
                    s = '.file-location';
                return x ? x : (this._fl = this.findChild(s));
            },
            getFileDate: function(){
                var fi = this._file ? this._file : this._fileInit(),
                    x = this._fu,
                    s = '.file-upload-date';
                return x ? x : (this._fu = this.findChild(s));
            },
            newVariable: function(name,value){
                var vb = this._variables ? this._variables : this._variablesInit(),
                    x = new mol.ui.Element();
                    x.setStyleName('variable');
                    x.setInnerHtml('<div class="name">'+name+':</div>' +
                                   '<div class="value">'+value+'</div>');
                this.findChild('.variables').append(x);
                return x;
            },
            overviewImg: function(src) {
                var sp = this._spatial ? this._spatial : this._spatialInit(),
                    x = this._ovimg,
                    s = '.map-overview';
                if (x) {
                    return x;
                } else {
                    this._ovimg = new mol.ui.Element('<img class="overview-img"  src="'+src+'"/>');
                    this.findChild(s).append(this._ovimg);
                    return this._ovimg;
                }
            },
            getNorth: function() {
                var sp = this._spatial ? this._spatial : this._spatialInit(),
                    x = this._north,
                    s = '.north';
                return x ? x : (this._north = this.findChild(s));
            },
            getSouth: function() {
                var sp = this._spatial ? this._spatial : this._spatialInit(),
                    x = this._south,
                    s = '.south';
                return x ? x : (this._south = this.findChild(s));
            },
            getEast: function() {
                var sp = this._spatial ? this._spatial : this._spatialInit(),
                    x = this._east,
                    s = '.east';
                return x ? x : (this._east = this.findChild(s));
            },
            getWest: function() {
                var sp = this._spatial ? this._spatial : this._spatialInit(),
                    x = this._west,
                    s = '.west';
                return x ? x : (this._west = this.findChild(s));
            },
            getSpatialText: function() {
                var sp = this._spatial ? this._spatial : this._spatialInit(),
                    x = this._sptext,
                    s = '.spatial-text';
                return x ? x : (this._sptext = this.findChild(s));
            },
            getSource: function() {
                var x = this._src,
                    s = '.src-path';
                return x ? x : (this._src = this.findChild(s));
            },
            getType: function() {
                var x = this._type,
                    s = '.type-path';
                return x ? x : (this._type = this.findChild(s));
            },
            getName: function() {
                var x = this._name,
                    s = '.name-path';
                return x ? x : (this._name = this.findChild(s));
            },
            getUrl: function() {
                var x = this._url,
                    s = '.url';
                return x ? x : (this._url = this.findChild(s));
            }            
        }
    );
    /**
     * The Item.
     */
    mol.ui.Metadata.Item = mol.ui.Display.extend(
        {
            init: function(itemId) {
                this._id = itemId;
                this._super('<li id="container-'+this._id +'">' + 
                            '   <div id="'+this._id+'" class="item">item 1</div>' + 
                            '</li>');
            },
            getName: function() {
                var x = this._itemName,
                    s = '.item';
                return x ? x : (this._itemName = this.findChild(s));
            }
        }
    );
    /**
     * The Collection.
     */
    mol.ui.Metadata.Collection = mol.ui.Display.extend(
        {
            init: function(collectionId) {
                this._id = collectionId;
                this._super('<li id="container-' + this._id + '">' +
                        '<div id="' + this._id + '" class="collection">Collection 1</div>' +
                        '<ul class="item-list">' +
                        '</ul></li>');
            },
            getName: function() {
                var x = this._collectionName,
                    s = '.collection';
                return x ? x : (this._collectionName = this.findChild(s));
            },
            setSelected: function() {
                var s = '.collection';
                this.findChild(s).select();
            }
        }
    );
    /**
     * The Metadata Display <div> in the <body> element.
     */
    mol.ui.Metadata.Display = mol.ui.Display.extend(
        {

            /**
             * Constructs a new Metadata Display.
             * 
             * @param config the display configuration
             * @constructor
             */
            init: function(config) {
                this._id = 'metadata';
                this._super($('<div>').attr({'id': this._id}));
                $('body').append(this.getElement());
                this.setInnerHtml(this._html());
            },

            getCollection: function(collectionId) {
                console.log(collectionId);
                return this.findChild('#container-'+collectionId.replace(/\//g,"\\/"));
            },

            getNewCollection:  function(collectionId){
                var Collection = mol.ui.Metadata.Collection,
                    //Meta = mol.ui.Metadata.Meta,
                    r = new Collection(collectionId);
                    //mo = new Meta(collectionId);
                //this.findChild('.data').append(mo);
                this.findChild('.collection-list').append(r);
                return r;
            },
            getNewItem:  function(itemId,collectionId){
                var Item = mol.ui.Metadata.Item,
                    //Meta = mol.ui.Metadata.Meta,
                    r = new Item(itemId);
                //this.findChild('.data').append(mo);
                this.findChild('#container-'+collectionId.replace(/\//g,"\\/")).findChild('.item-list').append(r);
                return r;
            },
            addNewMeta: function(itemId) {
                var Meta = mol.ui.Metadata.Meta;
                var mo = new Meta(itemId);
                this.findChild('.data').append(mo);
                return mo;
            },
            getCollectionTitle: function(){
                var x = this._collectionTitle,
                    s = '.collection-path';
                return x ? x : (this._collectionTitle = this.findChild(s));
            },
            getItemTitle: function(){
                var x = this._itemTitle,
                    s = '.item-path';
                return x ? x : (this._itemTitle = this.findChild(s));
            },

            getMapLink: function() {
              var x = this._mapLink,
                  s = '.mapLink';
                return x ? x : (this._mapLink = this.findChild(s));
            },

            selectItem: function(id) {
                //TODO deselect all items/collections and select the one passed by ID
            },
                    
            _html: function(){
                return  '<div class="mol-Metadata">' +
						'    <div class="top-bar">' +
						'        <a class="mapLink" href="#">Back to Map</a>' +
						'        <div class="details-menu">' +
						'            <div class="view-option selected">basic</div>' +
						'            <div class="view-option">full</div>' +
						'            <div class="title">Metadata view:</div>' +
						'        </div>' +
						'    </div>' +
						'    <div class="object-menu">' +
						'        <div class="title">Mapped data</div>' +
						'        <ul class="collection-list">' +
						'        </ul>' +
						'    </div>' +
						'    <div class="object-viewer">' +
						'        <div class="details-window">' +
						'            <div class="title">Data:</div>' +
						'            <div class="data">' +
						'            </div>' +
						'        </div>' +
						'    </div>' +
						'</div>';
            }       
        }
    );
};
