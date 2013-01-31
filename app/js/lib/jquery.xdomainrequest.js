// jQuery.XDomainRequest.js
// Author: Jason Moon - @JSONMOON
// IE8+
if (!jQuery.support.cors && window.XDomainRequest) {
  var httpRegEx = /^https?:\/\//i,
    getOrPostRegEx = /^get|post$/i,
    sameSchemeRegEx = new RegExp("^" + location.protocol, "i"),
    jsonRegEx = /\/json/i,
    xmlRegEx = /\/xml/i;
  jQuery.ajaxTransport("text html xml json", function(e, t, n) {
    if (e.crossDomain && e.async && getOrPostRegEx.test(e.type) && httpRegEx.test(t.url) && sameSchemeRegEx.test(t.url)) {
      var r = null,
        i = (t.dataType || "").toLowerCase();
      return {
        send: function(n, s) {
          r = new XDomainRequest, /^\d+$/.test(t.timeout) && (r.timeout = t.timeout), r.ontimeout = function() {
            s(500, "timeout")
          }, r.onload = function() {
            var e = "Content-Length: " + r.responseText.length + "\r\nContent-Type: " + r.contentType,
              t = {
                code: 200,
                message: "success"
              },
              n = {
                text: r.responseText
              };
            try {
              if (i === "json" || i !== "text" && jsonRegEx.test(r.contentType)) try {
                n.json = $.parseJSON(r.responseText)
              } catch (o) {
                t.code = 500, t.message = "parseerror"
              } else if (i === "xml" || i !== "text" && xmlRegEx.test(r.contentType)) {
                var u = new ActiveXObject("Microsoft.XMLDOM");
                u.async = !1;
                try {
                  u.loadXML(r.responseText)
                } catch (o) {
                  u = undefined
                }
                if (!u || !u.documentElement || u.getElementsByTagName("parsererror").length) throw t.code = 500, t.message = "parseerror", "Invalid XML: " + r.responseText;
                n.xml = u
              }
            } catch (a) {
              throw a
            } finally {
              s(t.code, t.message, n, e)
            }
          }, r.onerror = function() {
            s(500, "error", {
              text: r.responseText
            })
          };
          var o = t.data && $.param(t.data) || "";
          r.open(e.type, e.url), r.send(o)
        },
        abort: function() {
          r && r.abort()
        }
      }
    }
  })
};