(function( $ ){
  var methods = {
    init : function( options ) {
       return this.each(function(){
         
         var $this = $(this),
             data = $this.data('bhlib')
         
         var settings = {
            'key'              : false,
          };
          // If options exist, lets merge them
          // with our default settings
         if ( options ) { 
            $.extend( settings, options );
          }

         // If the plugin hasn't been initialized yet
         if ( ! data ) {
         
           /*
             Do more setup stuff here
           */
           $(this).data('bhlib', {
               target : $this,
               settings: settings,
               SubjectTitles: [],
               TitleMetadata: [],
           });

         }
         
      });
    },
    destroy : function( ) {

       return this.each(function(){

         var $this = $(this),
             data = $this.data('bhlib');

         // Namespacing FTW
         $(window).unbind('.bhlib');
         data.bhlib.remove();
         $this.removeData('bhlib');

       })

    },
    GetTitleMetadata : function( titleid, oncomplete ) {
       this.each(function(){
         var $this = $(this)
         var key = $this.data('bhlib').settings.key;
         
         if (! key){console.log('You have not set your BHL API key')};
         
         var url = "http://www.biodiversitylibrary.org/api2/httpquery.ashx?op=GetTitleMetadata&titleid="+ titleid + "&items=t&format=json&apikey=" + key + "&callback=?";
         
         $.getJSON(url, function(data) {
              if (data.Status == "ok"){
                if (oncomplete) { oncomplete(data.Result) } else { return data.Result };
              }
         });
      })
    },
    _title : function(title){
        console.log(title);
        var _meta;
        var title = title;
        $this = $(this);
        var meta = function(options){
            if (! _meta){
                $.getJSON(url, function(data) {
                      if (data.Status == "ok"){
                        $this._meta = data.Result;
                      } else {
                          $this._meta = null;
                      }
                });
                return false;
            } else {
                return _meta;
            }
        };
        var url = function(options){
            if ( ! options ){
                return title.TitleUrl;
            }
        }
    },
    GetSubjectTitles : function( subject, options ) {
       //creates a list of ids/titles for a given subject
       this.each(function(){
         var $this = $(this)
         var key = $this.data('bhlib').settings.key;
         
         if (! key){console.log('You have not set your BHL API key')};
         
         var url = "http://www.biodiversitylibrary.org/api2/httpquery.ashx?op=GetSubjectTitles&format=json&subject=" + subject + "&apikey=" + key + "&callback=?";
         var results = false;
         
         $.getJSON(url, function(data) {
              if (data.Status == "ok"){
                for (var i = 0; i < data.Result.length; i++){
                    $this.data('bhlib').SubjectTitles.push( new methods._title([data.Result[i]]));
                }
              }
              if (options['oncomplete']) {
                options['oncomplete'](subject,data.Result);
              }
         });
         
         
         //var n = "http://www.biodiversitylibrary.org/api2/httpquery.ashx?op=GetTitleMetadata&titleid=1726&items=f&format=json&apikey=" + key + "&callback=?";
       })
    },
  };
  
  $.fn.bhLib = function( method ) {
    // Method calling logic
    if ( methods[method] ) {
      return methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));
    } else if ( typeof method === 'object' || ! method ) {
      return methods.init.apply( this, arguments );
    } else {
      $.error( 'Method ' +  method + ' does not exist on jQuery.tooltip' );
    }    
  
  };
  
})( jQuery );
