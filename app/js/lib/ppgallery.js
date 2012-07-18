//##################################################################################
//##################################################################################
//##################################################################################
// ppGallery by jason pham (www.ppplugins.com) Copyright 2010 Jason Pham
// ppGallery version 1.4
//
// ____  ____     ____  __    __ __   ___  __ __  __  __
// || \\ || \\    || \\ ||    || ||  // \\ || ||\ || (( \
// ||_// ||_//    ||_// ||    || || (( ___ || ||\\||  \\
// ||    ||       ||    ||__| \\_//  \\_|| || || \|| \_))
//
/*
 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
(function(a) {
    a.fn.ppGallery = function(d) {
        function r(b) {
            if(!b)
                b = window.event;
            if(b != "") {
                if(b.keyCode == 37) {
                    code = b.keyCode;
                    a(".previousButton").trigger("click")
                } else if(b.keyCode == 39 || b.keyCode == 32) {
                    code = b.keyCode;
                    a("#nextButtonBoxpp").trigger("click")
                }
                return false
            }
        }

        function s(b) {
            var e = d.thumbWidth * window.totalImages + window.totalImages * 10, f = e - b;
            e <= b ? a("#sliderpp").hide() : a("#sliderpp").css({
                width : "98%",
                margin : "0 auto"
            }).slider({
                min : 0,
                max : parseInt(f),
                slide : function(c, h) {
                    var i = h.value > f ? -f : -h.value;
                    a("#thumbImgpp").css({
                        position : "relative"
                    }).animate({
                        left : i
                    }, 10, function() {
                    })
                }
            })
        }

        function t() {
            var b = a(document).height(), e = a(document).width();
            document.documentElement.style.overflow = "hidden";
            document.body.scroll = "no";
            var f = parseInt(a(window).scrollTop());
            newImgW = 700;
            if(d.maxWidth != "")
                if(newImgW > d.maxWidth) {
                    newImgW = parseInt(d.maxWidth);
                    a(".borderBoxpp img").css({
                        width : d.maxWidth + "px"
                    })
                }
            a("#lightBoxGallerypp").css({
                left : "" + Math.floor(e / 2.1 - newImgW / 2) + "px",
                width : newImgW + 50 + "px",
                top : f + b / 30 + "px"
            });
            s(newImgW + 50);
            a("#playpp").html("Play");
            a("#coverpp").css({
                height : b,
                width : e
            });
            a("#coverpp").fadeTo("slow", d.screenFade);
            a("#cpanelpp").fadeIn();
            a("#lightBoxGallerypp").fadeIn();
            d.showTitle == 1 && a("#imageTitlepp").fadeIn();
            a(window).resize(function() {
                var c = a(document).height(), h = a(window).width(), i = a(".borderBoxpp img").attr("src"), m = new Image;
                m.src = i;
                newImgW = m.width;
                newImgH = m.height;
                if(newImgW < 700)
                    newImgW = 700;
                if(d.maxWidth != "")
                    if(newImgW > d.maxWidth) {
                        newImgH = Math.floor(parseInt(newImgH / (newImgW / d.maxWidth)));
                        newImgW = parseInt(d.maxWidth)
                    }
                a("#lightBoxGallerypp").css({
                    left : "" + Math.floor(h / 2.1 - newImgW / 2) + "px",
                    height : newImgH + 170 + "px"
                });
                a("#coverpp").css({
                    height : c,
                    width : h
                })
            });
            a("#thumbImgpp img").click(function() {
                a("#imageTitlepp").html("");
                var c = a(this).attr("thumbImageId");
                c = a(g + " li:nth-child(" + c + ") a").attr("href");
                k("stop");
                j(c)
            });
            a: {
                if(document.cookie.length > 0) {
                    c_start = document.cookie.indexOf("=");
                    if(c_start != -1) {
                        c_start = c_start + 0 + 1;
                        c_end = document.cookie.indexOf(";", c_start);
                        if(c_end == -1)
                            c_end = document.cookie.length;
                        b = unescape(document.cookie.substring(c_start, c_end));
                        break a
                    }
                }
                b = ""
            }
            if(b != 1) {
                a("#instructionspp").delay(1E3).slideDown(500).delay(3500).slideUp(500);
                n("show_instru", 1, 1E3)
            }
            a("#playpp").click(function() {
                k("play")
            });
            a("#closeBoxpp").click(function() {
                o()
            });
            a("#coverpp").click(function() {
                o()
            });
            a("#coverpp").mouseenter(function() {
                a("#cpanelpp div").delay(500).fadeOut(200)
            });
            a("#lightBoxGallerypp").mouseenter(function() {
                a("#cpanelpp div").delay(0).fadeIn(200)
            });
            return false
        }

        function n(b, e, f) {
            var c = new Date;
            c.setDate(c.getDate() + f);
            document.cookie = b + "=" + escape(e) + (f == null ? "" : ";expires=" + c.toUTCString())
        }

        function j(b) {
            a("#imageTitlepp").html("");
            a(".borderBoxpp img").fadeOut();
            a(".borderBoxpp").html('<img src="' + b + '" border="0" class="nextButton" style="display:none;">');
            a(window).width();
            a(window).height();
            a(document).width();
            parseInt(a(window).scrollTop());
            var e = a(g).find("li:last-child a").attr("numid"), f = parseInt(a(".thumbNail_1").css("margin-right")), c = parseInt(a(".thumbNail_1").css("margin-left"));
            a(".borderBoxpp img").one("load", function() {
                var h = a(".borderBoxpp img").attr("src"), i = new Image;
                i.src = h;
                newImgW = i.width;
                newImgH = i.height;
                a(".fadeLoaderpp").fadeOut(function() {
                    if(newImgW < 700)
                        newImgW = 700;
                    if(d.maxWidth != "")
                        if(newImgW > d.maxWidth) {
                            newImgH = Math.floor(parseInt(newImgH / (newImgW / d.maxWidth)));
                            newImgW = parseInt(d.maxWidth);
                            a(".borderBoxpp img").css({
                                width : d.maxWidth + "px"
                            })
                        }
                    a("#lightBoxGallerypp").animate({
                        height : newImgH + 170 + "px"
                    }, 500, function() {
                        p()
                    });
                    a("#cpanelpp").css({
                        width : newImgW + "px"
                    });
                    a(".borderBoxpp").css({
                        display : "block"
                    });
                    a("#imageTitlepp").css({
                        width : "99%"
                    });
                    a("#thumbImgpp").css({
                        width : e * d.thumbWidth + (f + c) * e + 10 + "px"
                    });
                    u(h, newImgW);
                    return false
                })
            }).each(function() {
                var h = a(".borderBoxpp img").attr("src"), i = new Image;
                i.src = h;
                i.complete ? a(this).trigger("load") : a(".fadeLoaderpp").show()
            });
            return false
        }

        function u(b) {
            a(".fadeLoaderpp").fadeOut();
            a("#coverpp").css("display") == "none" && t();
            a(window).width();
            a(".nextButton").unbind();
            a(".previousButton").unbind();
            window.location.hash = b;
            a(".previouspp").removeClass("previouspp");
            a(".activepp").removeClass("activepp");
            a(".nextpp").removeClass("nextpp");
            a("a[href=" + b + "]").addClass("activepp");
            b = a(g + " .activepp").attr("numid");
            var e = parseInt(b) + 1, f = parseInt(b) - 1;
            a(".aid_" + e).addClass("nextpp");
            a(".aid_" + f).addClass("previouspp");
            a(".borderBoxpp img").fadeIn(function() {
                a(".nextButton").bind("click", function() {
                    q();
                    k("stop")
                });
                a(".nextButton").bind("focus", function() {
                    q()
                });
                a(".previousButton").bind("click", function() {
                    k("stop");
                    a(".borderBoxpp img").hide();
                    var c = a(".previouspp").attr("href");
                    if(c == null || c == "" || c == "undefined") {
                        c = a(g).find("li:last-child a").attr("href");
                        j(c);
                        a(g).find("li:last-child").find("a").addClass("activepp");
                        a(g).find("li:last-child").find("a").addClass("previouspp");
                        c = a(g + " .activepp").attr("numid");
                        c = parseInt(c) + 1;
                        a(".aid_" + c).addClass("nextpp")
                    } else
                        j(c)
                });
                p()
            });
            v(b);
            b = a(".activepp").attr("numid");
            e = a(g).find("li:last-child a").attr("numid");
            a("#xofpp").html(b + " / " + e);
            b = a(".nextpp").attr("href");
            if(b != "" && b != null)
                l(b);
            else {
                b = a(g).find("li:first-child a").attr("href");
                l(b);
                b = a(g).find("li:last-child a").attr("href");
                l(b)
            }
            b = a(".previouspp").attr("href");
            b != "" && b != null && l(b);
            return false
        }

        function v(b) {
            a("#thumbImgpp img").unbind("mouseover, mouseout");
            var e = parseInt(a(".thumbNail_1").css("margin-right")), f = parseInt(a(".thumbNail_1").css("margin-left"));
            a("#thumbListpp").width();
            a("#thumbListpp").css("display") == "none" && a("#thumbListpp").fadeIn(1E3);
            var c = a("#lightBoxGallerypp").width();
            e = d.thumbWidth * window.totalImages + (e + f) * window.totalImages;
            f = (b - 1) * ((e - c) / (window.totalImages - 1));
            var h = a(".thumbNail_" + b).position(), i = a("#thumbImgpp").width();
            h = h.left < newImgW / 2 ? 0 : h.left > i - c / 1.8 ? -(i - c) : -h.left + newImgW / 2;
            if(e > c) {
                a("#sliderpp").slider("option", "value", f);
                a("#thumbImgpp").css({
                    position : "relative"
                }).animate({
                    left : h
                }, 700, function() {
                })
            }
            a("#thumbImgpp img").fadeTo("fast", 0.5);
            a(".activeThumb").removeClass("activeThumb");
            a(".thumbNail_" + b).addClass("activeThumb");
            a(".thumbNail_" + b).fadeTo(1, 1);
            a("#thumbImgpp img").bind("mouseover", function() {
                a(this).fadeTo(1, 1)
            });
            a("#thumbImgpp img:not(.activeThumb)").bind("mouseout", function() {
                a(this).fadeTo(400, 0.5)
            });
            return false
        }

        function p() {
            var b = a(".activepp").attr("title");
            b != "" && b != null ? a("#imageTitlepp").html(b) : a("#imageTitlepp").html("");
            return false
        }

        function l(b) {
            (new Image).src = b
        }

        function o() {
            a(".nextButton, .previousButton, #playpp, #thumbImgpp img, #lightBoxGallerypp").unbind();
            k("close");
            a("#cpanelpp, #cpanelpp div, #lightBoxGallerypp, #instructionspp").fadeOut();
            a("#instructionspp").hide();
            a("#coverpp").delay(300).fadeOut(function() {
                a("#coverpp").unbind();
                a("#closeBoxpp").unbind();
                document.documentElement.style.overflow = "auto";
                document.body.scroll = "yes";
                window.location.hash = g;
                a(".previouspp").removeClass("previouspp");
                a(".activepp").removeClass("activepp");
                a(".nextpp").removeClass("nextpp")
            });
            return false
        }

        d = a.extend({
            screenFade : 0.8,
            screenColor : "#000000",
            showTitle : 1,
            thumbWidth : 60,
            maxWidth : "",
            slideShowDelay : "3",
            showHiddenGalleryButton : "",
            autoOpen : 0
        }, d);
        var g = "#" + a(this).attr("id");
        if(d.showHiddenGalleryButton != "") {
            a(g).css({
                display : "none"
            });
            a(d.showHiddenGalleryButton).css({
                cursor : "pointer"
            })
        }
        /*
        a(document).ready(function() {
            window.onkeydown = function(c) {
                if(c.keyCode == 32)
                    return false
            };
            a(document).height();
            a(document).width();
            n("show_instru", 0, 1E3);
            d.slideShowDelay *= 1E3;
            a("body").append("<style> body img{ -moz-user-select: none; -khtml-user-select: none; } #coverpp{ background-color:" + d.screenColor + '; position:absolute; left:0px; top:0px; display:none; z-index:10; text-align:center; -moz-user-select: none; -khtml-user-select: none; } #lightBoxGallerypp div{ -moz-user-select: none; -khtml-user-select: none; }</style><div id="coverpp"></div><div id="lightBoxGallerypp" class="ui-corner-all" style="position:absolute; z-index:100; display:none; text-align:center; background-color:' + d.screenColor + ';"><div id="thumbListpp" style="position:relative; height:45px; overflow-y:hidden; overflow-x:hidden; display:none; border:5px solid ' + d.screenColor + "; background:" + d.screenColor + '; margin: 10px auto 0 auto; padding:0 0 5px 0;"><div id="thumbImgpp"></div></div><div id="sliderpp"></div><div style="clear:both; height:0px;"></div><div id="cpanelpp" style="margin: 5px auto 0 auto; height:30px;"><div id="closeBoxpp">Close</div><div id="playpp">Play</div><div id="nextButtonBoxpp" class="nextButton">Next &raquo;</div><div id="xofpp"></div><div id="previousButtonBoxpp" class="previousButton">&laquo; Previous</div></div><div style="clear:both; height:0px;"></div><div class="borderBoxpp" style="margin:0 auto; display:none; background:' + d.screenColor + ';"></div><div id="imageTitlepp" style="text-align:center; padding:5px 0 5px 0; height:20px"></div><div id="debug" style="display:none;"></div><div class="fadeLoaderpp" style="display:none; color:white; width:18px; margin:0 auto; text-align:center; height:18px;"><img src="http://ppplugins.com/demo/ppgallery/images/loading.gif"></div></div><div style="height:0; width:0; background-color:' + d.screenColor + '; width:100%; padding:10px; height:10px; z-index:300; color:#ccc; top: 0px; left: 0px; border-bottom:1px solid #333; display:none; position:fixed; text-align:center;" id="instructionspp">Tip: Use spacebar or right/left arrow keys to navigate.</div>');
            var b = 0;
            a(g + " li img").each(function() {
                var c = a(this).attr("src");
                b += 1;
                a("#thumbImgpp").append('<img src="' + c + '" style="margin:0 10px 0 0; cursor:pointer; width:' + d.thumbWidth + 'px;" class="thumbNail_' + b + '" thumbImageId="' + b + '" align="top">')
            });
            a("#lightBoxGallerypp").hide();
            a("#thumbListpp").hide();
            a("#instructionspp").hide();
            window.totalImages = b;
            var e = 1;
            a(g).find("li a").each(function() {
                a(this).attr("numid", e);
                a(this).addClass("aid_" + e);
                a(this).find("img").addClass("imgid_" + e);
                e += 1
            });
            a(d.showHiddenGalleryButton).click(function() {
                var c = a(g).find("li a").attr("href");
                j(c)
            });
            if(window.location.hash != "" && window.location.hash != g) {
                var f = window.location.hash.split("#");
                f[1] != null && f[1] != "" && j(f[1])
            } else if(d.autoOpen == 1) {
                f = a(g).find("li a").attr("href");
                j(f)
            }
            a(g).find("li a").click(function() {
                var c = a(this).attr("href");
                j(c);
                return false
            });
            document.onkeyup = r
        });
        */
        var q = function() {
            a(".borderBoxpp img").hide();
            var b = a(".nextpp").attr("href");
            if(b == null || b == "" || b == "undefined") {
                b = a(g).find("li:first-child a").attr("href");
                j(b);
                a(g).find("li:first-child").find("a").addClass("activepp");
                a(g).find("li:last-child").find("a").addClass("previouspp");
                b = a(g + " .activepp").attr("numid");
                b = parseInt(b) + 1;
                a(".aid_" + b).addClass("nextpp")
            } else
                j(b);
            return false
        }, k = function(b) {
            if(b == "close") {
                b = a("body").data("slideControl");
                clearInterval(b);
                a("body").data("slideControlactive", "0");
                a("#playpp").unbind(function() {
                    a("#playpp").fadeOut(function() {
                    })
                })
            } else if(b == "play") {
                b = setInterval("$('#nextButtonBoxpp').trigger('focus')", d.slideShowDelay);
                a("body").data("slideControl", b);
                a("body").data("slideControlactive", "1");
                a("#playpp").html("Stop");
                a("#playpp").unbind();
                a("#playpp").click(function() {
                    k("stop")
                })
            } else if(b == "stop") {
                b = a("body").data("slideControl");
                clearInterval(b);
                a("body").data("slideControlactive", "0");
                a("#playpp").html("Play");
                a("#playpp").unbind();
                a("#playpp").click(function() {
                    k("play")
                })
            }
            return false
        }
    }
})(jQuery); 