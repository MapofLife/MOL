/**
 *  Plugin which uses the Google AJAX Feed API for creating feed content
 *  @author:  M. Alsup (malsup at gmail dot com)
 *  @version: 1.0.2 (5/11/2007)
 *  Documentation and examples at: http://www.malsup.com/jquery/gfeed/
 *  Free beer and free speech. Enjoy!
 *
 *  We use this code on the homepage (mappinglife.org/about) to display
 *  feeds from our Github repos.
 */
(function($) {

if (!window.google)  {
    alert('You must include the Google AJAX Feed API script');
    return;
}    

if (!google.feeds) google.load("feeds", "1");

$.fn.gFeed = function(options) {
    var opts = jQuery.extend({
        target: this,
        max:   5   // max number of items per feed
    }, options || {});
    
    var g = new google.feeds.FeedControl();

    this.each(function() {
        var url = this.href || opts.url;
        var title = opts.title || this.title || $(this).text();
        g.addFeed(url, title);
        g.setNumEntries(opts.max);
    });
    
    $(opts.target).each(function() {
        g.draw(this, opts.tabs ? { drawMode: google.feeds.FeedControl.DRAW_MODE_TABBED } : null );
    });
    
    return this;
};

})(jQuery);
