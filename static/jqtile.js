(function( $ ){
  var methods = {
    init : function( options ) { 
        var w = 256;
        var h = 256;
        if (options) {
            if (options['width']) {w = options['width']};
            if (options['height']) {h = options['height']};
        }
        //not ie safe yet, need excanvas.js
        var canvas = ($('<canvas>').attr({'width':w,'height':h}).css({'position':'absolute','top':'0','left':'0','display':'none'}).prependTo($('body'))[0])
        var ctx = canvas.getContext('2d')
        var imgd = ctx.createImageData(w,h);
        var pix = imgd.data;
        // Loop over each pixel and set a transparent red.
        for (var i = 0; n = pix.length, i < n; i += 4) {
          pix[i  ] = 255; // red channel
          pix[i+3] = 126; // alpha channel
        }
        ctx.putImageData(imgd, 0,0);
        var src = canvas.toDataURL("image/png");
        
         var $this = $(this),
             data = $this.data('newTile'),
             newTile = $('<div />', {
               src : src,
               width: w,
               height: h
             });
         
         // If the plugin hasn't been initialized yet
         if ( ! data ) {
           $(this).data('newTile', {
               target : $this,
               src : src,
               width: w,
               height: h
           });
        }
    }
  };
  
  $.fn.newTile = function( method ) {
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
