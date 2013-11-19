/*--------------------------------------------------------------------------.
|  Software: PhyloBox MAIN                                                  |
|   Version: 1.0                                                            |
|   Contact: andrewxhill@gmail.com || sander@digijoi.com                    |
| ------------------------------------------------------------------------- |
|     Admin: Andrew Hill (project admininistrator)                          |
|   Authors: Sander Pick, Andrew Hill                                    	|
| ------------------------------------------------------------------------- |
|   License: Distributed under the General Public License (GPL)             |
|            http://www.gnu.org/licenses/licenses.html#GPL                  |
| This program is distributed in the hope that it will be useful - WITHOUT  |
| ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or     |
| FITNESS FOR A PARTICULAR PURPOSE.                                         |
'--------------------------------------------------------------------------*/
var PhyloBox = {};
// constants
PhyloBox.API_TREE = '/lookup';
PhyloBox.API_GROUP = '/group';
PhyloBox.API_NEW = '/new';
PhyloBox.API_SAVE_TREE = '/save';
/*###########################################################################
###################################################################### SYSTEM
###########################################################################*/
PhyloBox.System = {
	init: function() {
		this.browser = this.searchString(this.dataBrowser()) || 'An unknown browser';
		this.version = this.searchVersion(navigator.userAgent)
			|| this.searchVersion(navigator.appVersion)
			|| 'an unknown version';
		this.OS = this.searchString(this.dataOS()) || 'an unknown OS';
	},
	searchString: function(data) {
		for (var i = 0; i < data.length; i++) {
			var dataString = data[i].string;
			var dataProp = data[i].prop;
			this.versionSearchString = data[i].versionSearch || data[i].identity;
			if (dataString) if (dataString.indexOf(data[i].subString) != -1) return data[i].identity;
			else if (dataProp) return data[i].identity;
		}
	},
	searchVersion: function(dataString) {
		var index = dataString.indexOf(this.versionSearchString);
		if (index == -1) return;
		return parseFloat(dataString.substring(index + this.versionSearchString.length + 1));
	},
	dataBrowser: function() {
		return [
			{ string: navigator.userAgent, subString: 'Chrome', identity: 'Chrome' },
			{ string: navigator.userAgent, subString: 'OmniWeb', versionSearch: 'OmniWeb/', identity: 'OmniWeb' },
			{ string: navigator.vendor, subString: 'Apple', identity: 'Safari', versionSearch: 'Version' },
			{ string: navigator.userAgent, subString: 'Opera', identity: 'Opera' },
			{ string: navigator.vendor, subString: 'iCab', identity: 'iCab' },
			{ string: navigator.vendor, subString: 'KDE', identity: 'Konqueror' },
			{ string: navigator.userAgent, subString: 'Firefox', identity: 'Firefox' },
			{ string: navigator.vendor, subString: 'Camino', identity: 'Camino' },
			{ string: navigator.userAgent, subString: 'Netscape', identity: 'Netscape' },
			{ string: navigator.userAgent, subString: 'MSIE', identity: 'Explorer', versionSearch: 'MSIE' },
			{ string: navigator.userAgent, subString: 'Gecko', identity: 'Mozilla', versionSearch: 'rv' },
			{ string: navigator.userAgent, subString: 'Mozilla', identity: 'Netscape', versionSearch: 'Mozilla' }
		];
	},
	dataOS: function() {
		return [
			{ string: navigator.platform, subString: 'Win', identity: 'Windows' },
			{ string: navigator.platform, subString: 'Mac', identity: 'Mac' },
			{ string: navigator.userAgent, subString: 'iPhone', identity: 'iPhone/iPod' },
			{ string: navigator.platform, subString: 'Linux', identity: 'Linux' }
		];
	}
};
/*###########################################################################
################################################################### INTERFACE
###########################################################################*/
PhyloBox.Interface = {
	// private vars
	_activeTree: null, _activeTool: null, _activeMenu: null,
	// constructor
	init: function() {
		// miscellaneous setup
		if (!window.console) window.console = { log: function() {} };
		$(window).load(function() {
			$('.menu').each(function(i) {
				$(this).css('left', $(this.parentNode).offset().left);
			});
		});
		// add resize events
		this._addResizeEvents();
		// add menu events
		this._addMenuEvents();
		// add tool event dispatching
		this._addToolEvents();
		// add property events
		this._addPropertyEvents();
	},
	// private methods
	_fit: function() {
		// size panels to fit window height
		$('.panel').each(function(i) {
			var h = $(window).height() - 76;
			$(this).height(h);
		});
		$('section').each(function(i) {
			var h = this.parentNode.id != 'trees' ? $(window).height() - 111 : $(window).height() - 101;
			$(this).height(h);
		});
		$('.handle > div').each(function(i) {
			var h = $(window).height() - 101;
			$(this).height(h);
		});
		$('.handle > div > img').each(function(i) {
			var t = ($(window).height() - 125) / 2;
			$(this).css('top', t);
		});
	},
	_killMenu: function(e) {
		if (e.target.nodeName != 'INPUT') {
			var __this = e.data.ref;
			$(document).unbind('click', __this._killMenu);
			$(__this._activeMenu).removeClass('menu-butt-active');
			$(__this._activeMenu.nextElementSibling).hide();
			__this._activeMenu = null;
		}
	},
	_addResizeEvents: function() {
		// save ref
		var __this = this;
		// set window and resizes
		$(window).resize(function() {
			// trigger handlers for all views
			$(document).trigger('pb-treeresize');
			// fit heights
			__this._fit();
		}); __this._fit();
		// resize panels
		$('.handle > div > img').bind('mousedown', function(e) {
			// prevent image drag behavior
			if (e.preventDefault) e.preventDefault();
			// save reference
			var pan = this.parentNode.parentNode.parentNode;
			var handle = this.parentNode.parentNode;
			var pan_w_orig = $(pan).width();
			var mouse_orig = __this._mouse(e);
			// detect parent panel
			if ($(pan).hasClass('panel-center')) {
				// get main for margins
				var main = this.parentNode.parentNode.parentNode.parentNode;
				if ($(handle).hasClass('handle-left')) {
					// get margin and sibling
					var main_m_orig = parseInt($(main).css('margin-left'));
					var sib = this.parentNode.parentNode.parentNode.parentNode.previousElementSibling.previousElementSibling.lastElementChild.previousElementSibling;
					var sib_w_orig = $(sib).width();
					// bind mouse move
					var movehandle = function(e) {
						// get mouse position
						var mouse = __this._mouse(e);
						// determine new values
						var pw = pan_w_orig - (mouse.x - mouse_orig.x);
						var mm = main_m_orig + (mouse.x - mouse_orig.x);
						var sw = sib_w_orig + (mouse.x - mouse_orig.x);
						// check max width
						if (pw < 700 || sw < 50) return false;
						// set widths
						$(pan).width(pw);
						$(main).css('margin-left', mm);
						$(sib).width(sw);
						// trigger handlers for all views
						$(this).trigger('pb-treeresize');
					};
					$(document).bind('mousemove', movehandle);
				} else {
					// get margin and sibling
					var main_m_orig = parseInt($(main).css('margin-right'));
					var sib = this.parentNode.parentNode.parentNode.parentNode.previousElementSibling.lastElementChild;
					var sib_w_orig = $(sib).width();
					// bind mouse move
					var movehandle = function(e) {
						// get mouse position
						var mouse = __this._mouse(e);
						// determine new values
						var pw = pan_w_orig + (mouse.x - mouse_orig.x);
						var mm = main_m_orig - (mouse.x - mouse_orig.x);
						var sw = sib_w_orig - (mouse.x - mouse_orig.x);
						// check max width
						if (pw < 700 || sw < 50) return false;
						// set widths
						$(pan).width(pw);
						$(main).css('margin-right', mm);
						$(sib).width(sw);
						// trigger handlers for all views
						$(this).trigger('pb-treeresize');
					};
					$(document).bind('mousemove', movehandle);
				}
			} else { // panel-left
				// get sibling
				var sib = this.parentNode.parentNode.parentNode.previousElementSibling;
				var sib_w_orig = $(sib).width();
				// bind mouse move
				var movehandle = function(e) {
					// get mouse position
					var mouse = __this._mouse(e);
					// determine new values
					var pw = pan_w_orig - (mouse.x - mouse_orig.x);
					var sw = sib_w_orig + (mouse.x - mouse_orig.x);
					// check max width
					if (pw < 50 || sw < 50) return false;
					// set widths
					$(pan).width(pw);
					$(sib).width(sw);
				};
				$(document).bind('mousemove', movehandle);
			}
			// bind mouse up
			$(document).bind('mouseup', function() {
				// remove all
				$(this).unbind('mousemove', movehandle).unbind('mouseup', arguments.callee);
				// add back tools events
				//__this._addToolEvents();
			});
		});
	},
	_addMenuEvents: function() {
		// save ref
		var __this = this;
		// menu events
		$('.menu-butt').live('click', function() {
			// set active
			__this._activeMenu = this;
			// add style and show menu
			$(this).addClass('menu-butt-active');
			$(this.nextElementSibling).show();
			// hide when click out
			$(document).bind('click', { ref: __this },__this._killMenu);
		});
		$('.menu-butt').live('mouseenter', function() {
			// check if active
			if (__this._activeMenu) {
				// remove first document listener
				$(document).unbind('click', __this._killMenu);
				// remove style and hide menu
				$(__this._activeMenu).removeClass('menu-butt-active');
				$(__this._activeMenu.nextElementSibling).hide();
				// set active
				__this._activeMenu = this;
				// add style and show menu
				$(this).addClass('menu-butt-active');
				$(this.nextElementSibling).show();
				// hide when click out
				$(document).bind('click', { ref: __this },__this._killMenu);
			}
		});
		// menu file events
		$('#file-menu-new-file').live('mouseenter', function() {
			$(this.nextElementSibling).addClass('menu-submit-hover');
		});
		$('#file-menu-new-file').live('mouseleave', function() {
			$(this.nextElementSibling).removeClass('menu-submit-hover');
		});
		$('#file-menu-new-file').live('mousedown', function() {
			$(this.nextElementSibling).addClass('menu-submit-active');
		});
		$('#file-menu-new-file').live('mouseup', function() {
			$(this.nextElementSibling).removeClass('menu-submit-active');
		});
		$('#file-menu-new-file').live('change', function() {
			// hide menu
			$(document).unbind('click', __this._killMenu);
			$(__this._activeMenu).removeClass('menu-butt-active');
			$(__this._activeMenu.nextElementSibling).hide();
			__this._activeMenu = null;
			// show loading gif

			// save ref to parent
			var parent = this.parentNode;
			// create an iframe
			var iframe = $("<iframe id='uploader' name='uploader' style='display:none;' />");
			// add to doc
		    iframe.appendTo('body');
			// iframe event handling
			var uploaded = function(e) {
				// remove load event
				$('#uploader').unbind('load', uploaded);
				// get data
                //eval("("+$("#uploader").contents().find("body").html()+")");
				var data = JSON.parse($('#uploader').contents().find('pre').html());
				// make a tree
				PhyloBox.Document.load(data);
				// clean up -- safari needs the delay
				setTimeout(function() {
					$('#uploader').remove();
					$('#file-form').remove();
				},1000);
			}
			// add load event to iframe
			$('#uploader').bind('load', uploaded);
			// create the upload form
			var form = "<form id='file-form' action='" + PhyloBox.API_NEW + "' enctype='multipart/form-data' encoding='multipart/form-data' method='post' style='display:none;'></form>";
			// add to doc
		    $(form).appendTo('body');
			// change form's target to the iframe (this is what simulates ajax)
		    $('#file-form').attr('target', 'uploader');
			// add the file input to the form
			$(this).appendTo('#file-form');
			// submit form
		    $('#file-form').submit();
			// re-attach input field
			$(this).prependTo(parent);
			// ensure single submit
			return false;
		});
		// save active tree
		$('#file-menu-save-tree').live('click', function() {
			// save active tree
			PhyloBox.Document.tree(__this._activeTree).save();
		});
		// sharing info
		// $("#share-menu-share-tree").live("click",function() {
		// 	$.fancybox({
		// 		content:$("#perma-link").html(),
		// 	});
		// 	return false;
		// });
	},
	_addToolEvents: function() {
		// save ref
		var __this = this;
		// tools
		$('.tool').live('click', function() {
			// check unavailable
			if ($(this).hasClass('tool-off')) return false;
			// check already active
			if ($(this).hasClass('tool-active')) return false;
			// clear styles
			$('.tool').each(function(i) { $(this).removeClass('tool-active'); });
			// add style
			$(this).addClass('tool-active');
			// set to active
			__this._activeTool = this.id;
		});
		$('.tool').live('mousedown', function(e) {
			// prevent image drag behavior
			if (e.preventDefault) e.preventDefault();
		});
		// get all
		var canvases = $('#trees canvas');
		// canvas tools
		canvases.live('click', function(e) {
			// set active if not
			if (this.id == PhyloBox.Document.tree(__this._activeTree).view().id()) return false;
			else {
				__this._activeTree = $(this).data('view').tree().age();
				// trigger mouseenter for cursor
				$(this).trigger('mouseenter');
				// set taxa list
				PhyloBox.Interface.setTaxa();
				// set properties
				PhyloBox.Interface.setProperties();
			}
		});
		canvases.live('mousedown', function(e) {
			// check if active
			if (this.id != PhyloBox.Document.tree(__this._activeTree).view().id()) return false;
			// save reference
			var canvas = $(this);
			// trigger event
			canvas.trigger('pb-' + __this._activeTool, ['mousedown', __this._viewMouse(e, canvas)]);
			// add move event
			canvas.bind('mousemove', function(e) {
				// trigger event
				canvas.trigger('pb-' + __this._activeTool, ['mousemove', __this._viewMouse(e, canvas)]);
			});
			// add up event
			$(document).bind('mouseup', function(e) {
				// unbind events
				canvas.unbind('mousemove');
				$(this).unbind('mouseup');
				// trigger event
				canvas.trigger('pb-' + __this._activeTool, ['mouseup', __this._viewMouse(e, canvas)]);
			});
		});
		canvases.live('mouseenter', function(e) {
			// check if active
			if (this.id != PhyloBox.Document.tree(__this._activeTree).view().id()) {
				$(this).css('cursor', 'default');
				return false;
			}
			// set cursor
			switch (__this._activeTool) {
				case 'select' :
					$(this).css('cursor', 'none');
					break;
				case 'translate' :
					$(this).css('cursor', 'url(static/gfx/tools/mouse-translate.png) 8 8, auto');
					break;
				case 'rotate' :
					$(this).css('cursor', 'url(static/gfx/tools/mouse-rotate.png) 8 8, auto');
					break;
				case 'zin' :
					$(this).css('cursor', 'url(static/gfx/tools/mouse-zin.png) 6 6, auto');
					break;
				case 'zout' :
					$(this).css('cursor', 'url(static/gfx/tools/mouse-zout.png) 6 6, auto');
					break;
			}
		});
		canvases.live('mouseleave', function(e) {
			// check if active
			if (this.id != PhyloBox.Document.tree(__this._activeTree).view().id()) return false;
			// refresh view
			PhyloBox.Document.tree(__this._activeTree).view().refresh();
		});
		canvases.live('mousemove', function(e) {
			// check if active
			if (this.id != PhyloBox.Document.tree(__this._activeTree).view().id()) return false;
			// save reference
			var canvas = $(this);
			// trigger event
			canvas.trigger('pb-' + __this._activeTool, ['mousesearch', __this._viewMouse(e, canvas)]);
		});
		canvases.live('dblclick', function(e) {
			// check if active
			if (this.id != PhyloBox.Document.tree(__this._activeTree).view().id()) return false;
			// clear selected
			__this._clearNode(true);
		});
	},
	_addPropertyEvents: function() {
		// save ref
		var __this = this;
		// editable cells
		$('.editable').live('click', function() {
			// save ref
			var __this = this;
			// return if already editing
			if ($(this).hasClass('editing')) return false;
			$(this).addClass('editing');
			// show input
			$(this).hide();
			$(this.nextElementSibling).show().focus();
			// exit
			var done = function() {
				$(document).unbind('click', done);
				$(__this.nextElementSibling).unbind('keyup', done);
				$(__this).removeClass('editing');
				$(__this).text($(__this.nextElementSibling).val());
				$(__this.nextElementSibling).hide();
				$(__this).show();
			}
			$(document).bind('click', done);
			$(this.nextElementSibling).bind('keyup', 'return', done);
		});
		// change background color
		$('#tree-prop-name').live('change', function() {
			PhyloBox.Document.tree(__this._activeTree).title($(this).val());
			PhyloBox.Document.tree(__this._activeTree).view().replot();
		});
		// change background color
		$('#tree-prop-bg').live('change', function() {
			PhyloBox.Document.tree(__this._activeTree).environment().color = $(this).val();
			PhyloBox.Document.tree(__this._activeTree).view().refresh();
		});
		// change branch width
		$('#tree-prop-bw').live('change', function() {
			PhyloBox.Document.tree(__this._activeTree).environment().width = $(this).val();
			PhyloBox.Document.tree(__this._activeTree).view().refresh();
		});
		// change node radius width
		$('#tree-prop-nr').live('change', function() {
			PhyloBox.Document.tree(__this._activeTree).environment().radius = $(this).val();
			PhyloBox.Document.tree(__this._activeTree).view().refresh();
		});
		// change tree type
		$('#tree-prop-vm').live('change', function() {
			PhyloBox.Document.tree(__this._activeTree).environment().viewmode = parseInt($(this).val());
			PhyloBox.Document.tree(__this._activeTree).view().replot();
		});
		// change branch length option
		$('#tree-prop-bl').live('change', function() {
			PhyloBox.Document.tree(__this._activeTree).environment().branchlenghts = !PhyloBox.Document.tree(__this._activeTree).environment().branchlenghts;
			PhyloBox.Document.tree(__this._activeTree).view().replot();
		});
		// change 3d option
		$('#tree-prop-3d').live('change', function() {
			PhyloBox.Document.tree(__this._activeTree).environment().threeD = !PhyloBox.Document.tree(__this._activeTree).environment().threeD;
			PhyloBox.Document.tree(__this._activeTree).view().replot();
		});
		// change boundaries option
		$('#tree-prop-bn').live('change', function() {
			PhyloBox.Document.tree(__this._activeTree).view().boundaries(!PhyloBox.Document.tree(__this._activeTree).view().boundaries());
			PhyloBox.Document.tree(__this._activeTree).view().refresh();
		});
		// leaf labels
		$('#tree-prop-ll').live('change', function() {
			PhyloBox.Document.tree(__this._activeTree).environment().leaflabels = !PhyloBox.Document.tree(__this._activeTree).environment().leaflabels;
			PhyloBox.Document.tree(__this._activeTree).view().refresh();
		});
		// htu labels
		$('#tree-prop-hl').live('change', function() {
			PhyloBox.Document.tree(__this._activeTree).environment().htulabels = !PhyloBox.Document.tree(__this._activeTree).environment().htulabels;
			PhyloBox.Document.tree(__this._activeTree).view().refresh();
		});
		// branch labels
		$('#tree-prop-bl').live('change', function() {
			PhyloBox.Document.tree(__this._activeTree).environment().branchlabels = !PhyloBox.Document.tree(__this._activeTree).environment().branchlabels;
			PhyloBox.Document.tree(__this._activeTree).view().refresh();
		});
		// hover node in list
		$('.taxa-link').live('mouseenter', function() {
			// get node
			var node = $(this).data('node');
			// set hover
			node.hover(true);
			// refresh view
			PhyloBox.Document.tree(__this._activeTree).view().refresh();
		});
		$('.taxa-link').live('mouseleave', function() {
			// get node
			var node = $(this).data('node');
			// set hover
			node.hover(false);
			// refresh view
			PhyloBox.Document.tree(__this._activeTree).view().refresh();
		});
		// click node in list
		$('.taxa-link').live('click', function() {
			// get node
			var node = $(this).data('node');
			// parse node properties
			__this.setNode(node);
		});
		// change clade color
		$('#node-prop-cl').live('change', function() {
			// get node
			var node = $('#node').data('node');
			// set color
			node.color($(this).val());
			// walk kids
			(function(n) {
				for (var c in n.children()) {
					n.children()[c].color(node.color());
	            	arguments.callee(n.children()[c]);
	        	}
			})(node);
			// refresh view
			PhyloBox.Document.tree(__this._activeTree).view().update_links(true);
			PhyloBox.Document.tree(__this._activeTree).view().refresh();
		});
		// clade toggle
		$('#node-prop-vb').live('change', function() {
			// get node
			var node = $('#node').data('node');
			// toggle
			node.visibility(!node.visibility());
			// walk kids
			(function(n) {
				for (var c in n.children()) {
					n.children()[c].visibility(node.visibility());
	            	arguments.callee(n.children()[c]);
	        	}
			})(node);
			// refresh view
			PhyloBox.Document.tree(__this._activeTree).view().update_links(true);
			PhyloBox.Document.tree(__this._activeTree).view().refresh();
		});
	},
	_mouse: function(e) {
		// get true mouse position
		var px = 0;
		var py = 0;
		if (!e) var e = window.event;
		if (e.pageX || e.pageY) {
			px = e.pageX;
			py = e.pageY;
		} else if (e.clientX || e.clientY) {
			px = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
			py = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
		}
		// format
		return { x: px, y: py };
	},
	_viewMouse: function(e,c) {
		// mouse
		var m = this._mouse(e);
		// coords
		vx = m.x - c.offset().left;
		vy = m.y - c.offset().top;
		// format
		return { x: vx, y: vy };
	},
	_navTo: function(n) {
		// go to it
		$('#taxa > section').scrollTo('#' + n.link().attr('id'), 100, { offset: -45 });
	},
	_clearNode: function(props) {
		// get selected
		var node = PhyloBox.Document.tree(this._activeTree).view().selected_node();
		// check exists
		if (!node) return false;
		// clear selected
		PhyloBox.Document.tree(this._activeTree).view().clearSelected();
		// clear style
		node.link().removeClass('taxa-link-selected');
		// clear child style
		$('.taxa-link').each(function(i) {
			$(this).css('padding-left', '0');
		});
		// clear node panel
		if (!props) return false;
		// refresh view
		var view = PhyloBox.Document.tree(this._activeTree).view();
		view.selecting(true);
		view.refresh();
		view.selecting(false);
		// title
		$('.panel-head', $('#node')).text('Node');
		// body
		$('#node > section').html("<h2 class='prop-title nodes-blank'>Select a node to see its properties.</h2>");
	},
	_error: function(e) { console.log('Interface: ' + e); },
	// public methods
	setTaxa: function() {
		// use active tree
		var node_list = PhyloBox.Document.tree(this._activeTree).node_list();
		// order nodes by id
		var nodes = [];
		for (var i = 0; i < node_list.length; i++) nodes[i] = node_list[i];
		nodes.sort(function(a,b) { return a.id() - b.id(); });
		// get taxa list
		var taxa = $('#taxa > section > ul');
		// empty taxa
		taxa.empty();
		// walk nodes
		for (var n in nodes) {
			var node = nodes[n];
			// get name
			var name = '';
			if (node.name()) name += node.name();
			else if (node.taxonomy())
				for (var i in node.taxonomy()) {
					if (name != '') name += ' | ';
					name += node.taxonomy()[i];
				}
			if (node.n_children() > 0) name = '(HTU) ' + name;
			name = '&mdash;&nbsp;&nbsp;' + node.id() + ':&nbsp;' + name;
			// color square
			var info = "<div class='taxa-right'>";
			info += "<div class='ex' style='" + (node.visibility() ? 'display:none' : '') + "'>x</div>";
			info += "<div class='dot' style='background:#" + node.color() + ";'></div>";
			info += '</div>';
			// add to doc
			taxa.append("<li><a href='javascript:;' id='nl-" + node.id() + "' class='taxa-link'>" + name + info + '</a></li>');
			// add node as data to link
			var l = $('#nl-' + node.id());
			l.data('node', node);
			// save link to node
			node.link(l);
		}
	},
	setNode: function(node,found) {
		// clear first
		this._clearNode();
		// set selected
		PhyloBox.Document.tree(this._activeTree).view().setSelected(node);
		// set style
		node.link().addClass('taxa-link-selected');
		// go to it
		if (found) this._navTo(node);
		// walk kids
		(function(n) {
			for (var c in n.children()) {
				n.children()[c].link().css('padding-left', '20px');
				arguments.callee(n.children()[c]);
			}
		})(node);
		// refresh view
		PhyloBox.Document.tree(this._activeTree).view().refresh();
		// save data
		$('#node').data('node', node);
		// set node title
		var title = node.link().text();
		$('.panel-head', $('#node')).text('Node - ' + title.substring(3, title.length - 1));
		// check parent
		var vis = node.parent() && node.parent().visibility() ? '' : "disabled='disabled'";
		// check kids
		var is_clade = node.n_children() > 0;
		// init html
		var clade, uri;
		// write clade table
		clade = '<table>';
		clade += '<caption>Clade Properties</caption>';
		clade += '<tbody>';
		clade +=	'<tr>';
		clade += "<td align='right'>color</td>";
		clade += '<td>';
		clade +=	"<span class='editable editable-prop'>" + node.color() + '</span>';
		clade +=	"<input type='text' class='editable-field editable-field-long' id='node-prop-cl' value='" + node.color() + "' />";
		clade +=	'</td>';
		clade +=	'</tr>';
		clade +=	'<tr>';
		clade += "<td align='right'>toggle</td>";
		clade += '<td>';
		clade +=	node.visibility() ? "<input type='checkbox' id='node-prop-vb' checked='checked' " + vis + ' />' : "<input type='checkbox' id='node-prop-vb' " + vis + ' />';
		clade +=	'</td>';
		clade +=	'</tr>';
		clade +=	"<tr><td colspan='2' class='empty'>&nbsp;</td></tr>";
		clade += '</tbody>';
		clade += '</table>';
		// write uri table
		uri = '<table>';
		uri += '<caption>URI Links</caption>';
		uri += '<tbody>';
		uri +=	'<tr>';
		uri += "<td align='right'>images</td>";
		uri += '<td>';
		uri +=	"<span class='uri-link'>n / a</span>";
		uri +=	'</td>';
		uri +=	'</tr>';
		uri +=	'<tr>';
		uri += "<td align='right'>videos</td>";
		uri += '<td>';
		uri +=	"<span class='uri-link'>n / a</span>";
		uri +=	'</td>';
		uri +=	'</tr>';
		uri +=	'<tr>';
		uri += "<td align='right'>wiki</td>";
		uri += '<td>';
		uri +=	"<span class='uri-link'>n / a</span>";
		uri +=	'</td>';
		uri +=	'</tr>';
		uri +=	"<tr><td colspan='2' class='empty'>&nbsp;</td></tr>";
		uri += '</tbody>';
		uri += '</table>';
		// add to doc
		if (is_clade) $('#node > section').html(clade + uri); else $('#node > section').html(uri);
	},
	setTree: function() {
		// permalink
		//$("#perma-link-address").val();
		// grid the trees
		$('.tree-holder').each(function(i) {
			$(this).css('height', (100 / PhyloBox.Document.trees().length) + '%');
		});
		// auto-fit
		$(window).trigger('resize');
	},
	setProperties: function() {
		// use active tree
		var tree = PhyloBox.Document.tree(this._activeTree);
		// init html
		var name, visual, viewing, labels;
		// write name table
		name = '<table>';
		name += '<caption>Tree Name</caption>';
		name += '<tbody>';
		name +=	'<tr>';
		name += '<td>';
		name +=	"<span class='editable'>" + tree.title() + '</span>';
		name +=	"<input type='text' class='editable-field' style='width:170px' id='tree-prop-name' value='" + tree.title() + "' />";
		name +=	'</td>';
		name +=	'<td>&nbsp;</td>';
		name +=	'</tr>';
		name +=	"<tr><td colspan='2' class='empty'>&nbsp;</td></tr>";
		name += '</tbody>';
		name += '</table>';
		// write visual table
		visual = '<table>';
		visual += '<caption>Visual Properties</caption>';
		visual += '<tbody>';
		visual +=	'<tr>';
		visual += "<td align='right'>background color</td>";
		visual += '<td>';
		visual +=	"<span class='editable editable-prop'>" + tree.environment().color + '</span>';
		visual +=	"<input type='text' class='editable-field editable-field-long' id='tree-prop-bg' value='" + tree.environment().color + "' />";
		visual +=	'</td>';
		visual +=	'</tr>';
		visual +=	'<tr>';
		visual += "<td align='right'>branch width</td>";
		visual += '<td>';
		visual +=	"<span class='editable editable-prop'>" + tree.environment().width + '</span>';
		visual +=	"<input type='text' class='editable-field editable-field-short' id='tree-prop-bw' value='" + tree.environment().width + "' />";
		visual +=	'</td>';
		visual +=	'</tr>';
		visual +=	'<tr>';
		visual += "<td align='right'>node radius</td>";
		visual += '<td>';
		visual +=	"<span class='editable editable-prop'>" + tree.environment().radius + '</span>';
		visual +=	"<input type='text' class='editable-field editable-field-short' id='tree-prop-nr' value='" + tree.environment().radius + "' />";
		visual +=	'</td>';
		visual +=	'</tr>';
		visual +=	"<tr><td colspan='2' class='empty'>&nbsp;</td></tr>";
		visual += '</tbody>';
		visual += '</table>';
		// write viewing table
		viewing = '<table>';
		viewing += '<caption>Viewing Properties</caption>';
		viewing += '<tbody>';
		viewing +=	'<tr>';
		viewing += "<td align='right'>view type</td>";
		viewing += '<td>';
		viewing += "<select id='tree-prop-vm'>";
		viewing += tree.environment().viewmode == 0 ? "<option value='0' selected='selected'>dendrogram</option>" : "<option value='0'>dendrogram</option>";
		viewing +=	tree.environment().viewmode == 1 ? "<option value='1' selected='selected'>cladogram</option>" : "<option value='1'>cladogram</option>";
		viewing +=	tree.environment().viewmode == 2 ? "<option value='2' selected='selected'>circular dendrogram</option>" : "<option value='2'>circular dendrogram</option>";
		viewing +=	tree.environment().viewmode == 3 ? "<option value='3' selected='selected'>circular cladogram</option>" : "<option value='3'>circular cladogram</option>";
		viewing += '</select>';
		viewing +=	'</td>';
		viewing +=	'</tr>';
		viewing +=	'<tr>';
		viewing += "<td align='right'>branch length</td>";
		viewing += '<td>';
		viewing +=	tree.environment().branchlenghts ? "<input type='checkbox' id='tree-prop-bl' disabled='disabled' />" : "<input type='checkbox' id='tree-prop-bl'  disabled='disabled' />";
		viewing +=	'</td>';
		viewing +=	'</tr>';
		viewing +=	'<tr>';
		viewing += "<td align='right'>3D</td>";
		viewing += '<td>';
		viewing +=	tree.environment().threeD ? "<input type='checkbox' id='tree-prop-3d' checked='checked' />" : "<input type='checkbox' id='tree-prop-3d' />";
		viewing +=	'</td>';
		viewing +=	'</tr>';
		viewing +=	"<tr><td colspan='2' class='empty'>&nbsp;</td></tr>";
		viewing +=	'<tr>';
		viewing += "<td align='right'>boundaries</td>";
		viewing += '<td>';
		viewing +=	"<input type='checkbox' id='tree-prop-bn' />";
		viewing +=	'</td>';
		viewing +=	'</tr>';
		viewing +=	"<tr><td colspan='2' class='empty'>&nbsp;</td></tr>";
		viewing += '</tbody>';
		viewing += '</table>';
		// write labels table
		labels = '<table>';
		labels += '<caption>Node Labels</caption>';
		labels += '<tbody>';
		labels +=	'<tr>';
		labels += "<td align='right'>leaf labels</td>";
		labels += '<td>';
		labels +=	tree.environment().leaflabels ? "<input type='checkbox' id='tree-prop-ll' checked='checked' />" : "<input type='checkbox' id='tree-prop-ll' />";
		labels +=	'</td>';
		labels +=	'</tr>';
		labels +=	'<tr>';
		labels += "<td align='right'>HTU labels</td>";
		labels += '<td>';
		labels +=	tree.environment().htulabels ? "<input type='checkbox' id='tree-prop-hl' checked='checked' />" : "<input type='checkbox' id='tree-prop-hl' />";
		labels +=	'</td>';
		labels +=	'</tr>';
		labels +=	'<tr>';
		labels += "<td align='right'>branch labels</td>";
		labels += '<td>';
		labels +=	tree.environment().branchlabels ? "<input type='checkbox' id='tree-prop-bl' checked='checked' disabled='disabled' />" : "<input type='checkbox' id='tree-prop-bl' disabled='disabled' />";
		labels +=	'</td>';
		labels +=	'</tr>';
		labels +=	"<tr><td colspan='2' class='empty'>&nbsp;</td></tr>";
		labels += '</tbody>';
		labels += '</table>';
		// add to doc
		$('#doc > section').html(name + visual + viewing + labels);
	},
	setTools: function() {
		// don't if a tree exists already
		if (PhyloBox.Document.trees().length > 1) return false;
		// default tool is select
		$('#select').addClass('tool-active');
		this._activeTool = 'select';
	},
	hoverNode: function(n) {
		// set style
		n.link().addClass('taxa-link-hover');
		// go to it
		this._navTo(n);
	},
	unhoverNode: function(n) {
		// check n
		if (!n) return false;
		// set style
		n.link().removeClass('taxa-link-hover');
		// go back to selected
		if (PhyloBox.Document.tree(this._activeTree).view().selected_node())
			this._navTo(PhyloBox.Document.tree(this._activeTree).view().selected_node());
	},
	// get & set vars
	activeTree: function(v) { if (v !== undefined) this._activeTree = v; else return this._activeTree; }
};
/*###########################################################################
#################################################################### DOCUMENT
###########################################################################*/
PhyloBox.Document = {
	// private vars
	_io: null, _trees: [],
	// constructor
	init: function() {
		// initialize io
		this._io = new IO(this, PhyloBox.API_GROUP, 'json', '#doc-loader');
	},
	// private methods
	_error: function(e) { console.log('Document: ' + e); },
	// public methods
	load: function(data,group) {
		// check group
		if (group)
			// get the tree keys from the api
			this._io.request('load', 'g=' + data);
		else {
			// create a tree type
			var t = new Tree();
			// save it
			this._trees.push(t);
			// set age
			t.age(this._trees.length - 1);
			// set to active
			PhyloBox.Interface.activeTree(t.age());
			// go
			t.begin(data);
		}
	},
	receive: function(type,data) {
		// do something
		switch (type) {
			case 'load' :
				// loop over trees
				for (var k in data) {
					// create a tree type
					var t = new Tree();
					// save it
					this._trees.push(t);
					// set age
					t.age(this._trees.length - 1);
					// set to active
					PhyloBox.Interface.activeTree(t.age());
					// go
					t.begin(data[k]);
				}
				break;
		}
	},
	// get & set vars
	tree: function(v) { return this._trees[v]; },
	trees: function() { return this._trees; }
};
/*###########################################################################
########################################################################## IO
###########################################################################*/
var IO = Class.extend({
	// private vars
	_caller: null, _server: null, _dataType: null, _loader: null,
	// contructor
	init: function(c,s,dt,l) {
		if (!c || !s || !dt || !l) { this._error('invalid arguments...'); return false; }
		this._caller = c;
		this._server = s;
		this._dataType = dt;
		this._loader = l;
	},
	// private methods
	_loading: function(vis) { (vis) ? $(this._loader).fadeIn('fast') : $(this._loader).fadeOut('slow', function() { $(this).hide(); }); },
	_error: function(e) { console.log('IO: ' + e); },
	// public methods
	request: function(a,q,s) {
		this._loading(true);
		var server = s || this._server;
		var __this = this;
		$.ajax({
  			type: 'POST', url: server, data: q, dataType: __this._dataType,
			complete: function(request) { },
  			success: function(json) {
				__this._loading(false);
				if (!json) { __this._error('nothing received...'); return false; }
				else if (json == 404) { __this._error('nothing received...'); return false; }
				__this._caller.receive(a, json);
			},
			error: function(e) {
				__this._loading(false);
				__this._error(e['responseText']);
			}
 		});
	}
});
/*###########################################################################
######################################################################## NODE
###########################################################################*/
var Node = Class.extend({
	// private vars
	_id: null, _parent: null, _children: [], _siblings: [], _n_parents: 0, _layer: 0, _is_leaf: false, _is_root: false,
	_color: null, _uri: null, _name: null, _taxonomy: null, _visibility: true, _length: null, _point3D: null, _link: null, _selected: false, _hover: false,
	// constructor
	init: function(id) { this._id = id; this._children = []; this._siblings = []; },
	// private methods
	_error: function(e) { console.log('Node: ' + e); },
	// public methods
	add_child: function(v) { this._children.push(v); },
	// get & set vars
	id: function() { return this._id; },
	parent: function(v) { if (v !== undefined) this._parent = v; else return this._parent; },
	children: function() { return this._children; },
	siblings: function(v) { if (v !== undefined) this._siblings = v; else return this._siblings; },
	n_children: function() { return this._children.length; },
	n_siblings: function() { return this._siblings.length; },
	n_parents: function(v) { if (v !== undefined) this._n_parents = v; else return this._n_parents; },
	layer: function(v) { if (v !== undefined) this._layer = v; else return this._layer; },
	is_leaf: function(v) { if (v !== undefined) this._is_leaf = v; else return this._is_leaf; },
	is_root: function(v) { if (v !== undefined) this._is_root = v; else return this._is_root; },
	color: function(v) { if (v !== undefined) this._color = v; else return this._color; },
	uri: function(v) { if (v !== undefined) this._uri = v; else return this._uri; },
	name: function(v) { if (v !== undefined) this._name = v; else return this._name; },
	taxonomy: function(v) { if (v !== undefined) this._taxonomy = v; else return this._taxonomy; },
	visibility: function(v) { if (v !== undefined) this._visibility = v; else return this._visibility; },
	length: function(v) { if (v !== undefined) this._length = v; else return this._length; },
	//–––––––––––––––––––––– for drawing ––––––––––––––––––––––//
	point3D: function(v) { if (v !== undefined) this._point3D = v; else return this._point3D; },
	link: function(v) { if (v !== undefined) this._link = v; else return this._link; },
	selected: function(v) { if (v !== undefined) this._selected = v; else return this._selected; },
	hover: function(v) { if (v !== undefined) this._hover = v; else return this._hover; }
});
/*###########################################################################
######################################################################## TREE
###########################################################################*/
var Tree = Class.extend({
	// private vars
	_key: null, _view: null, _io: null, _age: null,
	_data: [], _data_clone: [], _tree_data: [], _node_list: [], _nodes: [],
	_n_leaves: 0, _n_layers: 0, _title: null, _environment: null,
	// constructor
	init: function() { },
	// private methods
	_make: function(data) {
		// store data
		this._data = data;
		// nest this tree around the root
		var ir = this._data.environment.root ? this._data.environment.root : this._data.root ? this._data.root : this._data.tree[0].id;
		this.nest(ir);
	},
	_nest: function(rid) {
		// root node?
		if (!rid) { this._error('no root node provided for nest...'); return false; }
		// get the root json object
		var root = this._find(this._tree_data, 'id', rid);
		// exit if invalid
		if (!root) { this._error('invalid tree root id'); return false; }
		// ensure proper tree direction
		if (root.parent_id) {
			// if root is leaf, root's parent becomes root
			if (!root.children) root = this._find(this._tree_data, 'id', root.parent_id);
			// parent -> child
			root.children.push({ 'id': root.parent_id });
			// child -> parent
			var parent = this._find(this._tree_data, 'id', root.parent_id);
			for (var c in parent.children) if (parent.children[c].id == root.id) parent.children.splice(parent.children.indexOf(parent.children[c]), 1);
			//for(c in parent.children) if(parent.children[c].id==root.id) delete parent.children[c];
			if (parent.children.length == 0) parent.children = null;
			// rename parents
			root.parent_id = null;
			parent.parent_id = root.id;
		}
		// make the tree
		this._n_leaves = 0;
		this._n_layers = 0;
		this._node_list = [];
		this._nodes = new Node(rid);
		this._nodes.is_root(true);
		this._branch(this._nodes, root);
		for (var n in this._node_list) {
			// assign layers
			if (this._node_list[n].is_leaf()) this._node_list[n].layer(this._n_layers - 1);
			else this._node_list[n].layer(this._node_list[n].n_parents());
			// assign siblings
			for (var c in this._node_list[n].children()) {
				var s = this._node_list[n].children().slice(0);
				s.splice(s.indexOf(s[c]), 1);
				this._node_list[n].children()[c].siblings(s);
			}
		}
	},
	_branch: function(n,d) {
		// ensure proper tree direction
		for (var c in d.children) {
			if (!d.children[c]) continue;
			var cd = this._find(this._tree_data, 'id', d.children[c].id);
			//if(cd.parent_id && cd.parent_id!=d.id) {
			if (cd.parent_id != d.id) {
				// parent -> child
				cd.children.push({ 'id': cd.parent_id });
				// child -> parent
				var cpd = this._find(this._tree_data, 'id', cd.parent_id);
				for (var cc in cpd.children) if (cpd.children[cc].id == cd.id) cpd.children.splice(cpd.children.indexOf(cpd.children[cc]), 1);
				//for(cc in cpd.children) if(cpd.children[cc].id==cd.id) delete cpd.children[cc];
				if (cpd.children.length == 0) cpd.children = null;
				// rename parents
				cd.parent_id = d.id;
				cpd.parent_id = cd.id;
			}
		}
		// set color
		n.color(d.color);
		// set uri links
        n.uri(d.uri);
        // set name
		if (d.name) n.name(d.name);
        else if (d.taxonomy && d.taxonomy.scientific_name) n.name(d.taxonomy.scientific_name);
		// set taxonomy
		n.taxonomy(d.taxonomy);
		// set visibility
		n.visibility(d.visibility);
		// set length
		n.length(d.length);
		// move down tree
		if (!d.children) {
			n.is_leaf(true);
			this._n_leaves++;
		} else for (var c in d.children) {
			if (!d.children[c]) continue;
			var cn = new Node(d.children[c].id);
			n.add_child(cn);
			cn.parent(n);
			cn.n_parents(n.n_parents() + 1);
			this._branch(cn, this._find(this._tree_data, 'id', cn.id()));
		}
		// max number parents = tree's layer count
		if (this._n_layers <= n.n_parents()) this._n_layers = n.n_parents() + 1;
		// collect node ref for list
		this._node_list.push(n);
	},
	_find: function(o,p,v) {
		// returns false if not unique !
		var r; var n = 0;
		for (var i in o) if (o[i][p] == v) { r = o[i]; n++; }
		return (n != 1) ? false : r;
	},
	_error: function(e) { console.log('Tree: ' + e); },
	// public methods
	begin: function(data) {
		// save key
		this._key = typeof data == 'string' ? data : data.k;
		// make and attach a tree holder
		var holder = $("<div class='tree-holder' />");
		holder.appendTo('#trees > section');
		// create view
		this._view = new View(this._key, holder, {t: 20, r: 20, b: 20, l: 20},true, 20, true);
		// initialize io
		this._io = new IO(this, PhyloBox.API_TREE, 'json', '#tree-loader-' + this._view.id());
		// load data if present otherwise go on
		typeof data == 'string' ? this._io.request('load', 'k=' + this._key) : this.receive('load', data);
	},
	receive: function(type,data) {
		// do something
		switch (type) {
			case 'load' :
				// make tree
				this._make(data);
				// bind handler for tree ready
				$('#' + this._view.id()).bind('viewready', function(e) {
					// unbind
					$(e.target).unbind('viewready', arguments.callee);
					// set taxa list
					PhyloBox.Interface.setTaxa();
					// set trees
					PhyloBox.Interface.setTree();
					// set properties
					PhyloBox.Interface.setProperties();
					// set tools
					PhyloBox.Interface.setTools();
				});
				// plot
				this._view.plot(this);
				// go
				this._view.begin();
				break;
			case 'save' :
				alert('Your tree has been saved. Sick!');
				break;
		}
	},
	nest: function(rid) {
		// clone the original data
		this._data_clone = $.extend(true, {},this._data);
		// define usable objects
		this._tree_data = this._data.tree;
		this._title = this._data.title;
		this._environment = this._data.environment;
		this._environment.root = rid;
		// (re)nest
		this._nest(rid);
	},
	save: function() {
		// update phyloJSON nodes with Node properties
		for (var n in this._node_list) {
			var pj_node = this._find(this._tree_data, 'id', this._node_list[n].id());
			pj_node.color = this._node_list[n].color();
	        pj_node.visibility = this._node_list[n].visibility();
		}
		// stringify the data
		var save = JSON.stringify(this._data);
		// save an image
   	    var png = JSON.stringify(this._view.canvas()[0].toDataURL('image/png'));
		// save
		this._io.request('save', { key: this._key, tree: save, title: this._title, png: png }, PhyloBox.API_SAVE_TREE);
	},
	// get vars
	nodes: function() { return this._nodes; },
	node_list: function() { return this._node_list; },
	n_leaves: function() { return this._n_leaves; },
	n_layers: function() { return this._n_layers; },
	title: function(v) { if (v !== undefined) this._title = v; else return this._title; },
	environment: function() { return this._environment; },
	view: function(v) { if (v !== undefined) this._view = v; else return this._view; },
	io: function() { return this._io; },
	age: function(v) { if (v !== undefined) this._age = v; else return this._age; }
});
/*###########################################################################
################################################################### DOC READY
###########################################################################*/
PhyloBox.Go = function(phylobox_container_div_id, phylobox_environment_options) {

    this.Holder = phylobox_container_div_id || null;
	//–––––––––––––––––––––––––––––––––––––––––––––––––––––––––– EXTEND UTILS
	// on jquery
	$.extend({ });
	// on jquery objects
	$.fn.extend({ });
	//––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––– APP SETUP
	this.System.init();
	this.Interface.init();
	this.Document.init();
	//–––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––– GET DATA
	//console.log(__group_key__,__single_key__);
	if (__group_key__) this.Document.load(__group_key__);
	else if (__single_key__) this.Document.load(__single_key__);
	//else alert("This is a blank document. Please upload your phylogeny via the File menu.");
};
//####################################################################### END
