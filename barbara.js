// barbara.js || -*- Mode: Java; tab-width: 2; -*-
// Lightweight lower-window handler.
//
// $Header: /cvs/gnusto/src/gnusto/content/barbara.js,v 1.11 2003/05/13 09:13:43 marnanel Exp $
//
// Copyright (c) 2003 Thomas Thurman
// thomas@thurman.org.uk
// 
// This program is free software; you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation; either version 2 of the License, or
// (at your option) any later version.
// 
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// 
// You should have be able to view the GNU General Public License at 
// http://www.gnu.org/copyleft/gpl.html ; if not, write to the Free Software
// Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307, USA.

var barbara__holder = 0;
var barbara__HTML = "http://www.w3.org/1999/xhtml";
var barbara__current_css = '';

var barbara__before_cursor = null;
var barbara__after_cursor = null;

// Y-coordinate of the most the user's seen, in pixels.
// (For example, when the screen's cleared, this becomes 0px.)
var barbara__most_seen = 0;

////////////////////////////////////////////////////////////////

function barbara_init() {
		// Nothing yet
}

////////////////////////////////////////////////////////////////

function barbara_start_game() {

		barbara__most_seen = 0;

}

////////////////////////////////////////////////////////////////

function barbara_clear() {
		barbarix_clear(document.getElementById('barbara'));
		barbara__holder = 0;
}

////////////////////////////////////////////////////////////////

function barbara_set_text_style(css_class) {
		barbara__holder = 0;
		barbara__current_css = css_class;
}

////////////////////////////////////////////////////////////////

function barbara_set_input(textlist) {

    var tty = document.getElementById('barbara');

		if (!barbara__before_cursor) {
				barbara__before_cursor =
						document.createElementNS(barbara__HTML,
																		 'html:span');
				barbara__before_cursor.
						setAttribute('id','beforecursor');
				barbara__before_cursor.
								appendChild(document.createTextNode(''));

				tty.appendChild(barbara__before_cursor);
		}

		if (!barbara__after_cursor) {
				barbara__after_cursor =
						document.createElementNS(barbara__HTML,
																		 'html:span');
				barbara__after_cursor.
						setAttribute('id','aftercursor');
				barbara__after_cursor.
								appendChild(document.createTextNode(''));

				tty.appendChild(barbara__after_cursor);
		}

		barbara__before_cursor.childNodes[0].data = textlist[0];
		barbara__after_cursor .childNodes[0].data = textlist[1];
}

function barbara_get_input() {
		return [
						barbara__before_cursor.childNodes[0].data,
						barbara__after_cursor.childNodes[0].data,
						];
}

function barbara_destroy_input() {
    var tty = document.getElementById('barbara');
		tty.removeChild(barbara__before_cursor);
		tty.removeChild(barbara__after_cursor);

		barbara__before_cursor = 0;
		barbara__after_cursor = 0;
}

////////////////////////////////////////////////////////////////

function barbara_chalk(text) {

		if (barbara__holder==0) {
				// Create a new holder.

				barbara__holder =
						document.createElementNS(barbara__HTML,
																		 'html:span');

				barbara__holder.setAttribute('class',
																		 barbara__current_css);

				var temp = document.getElementById('barbara');
				temp.appendChild(barbara__holder);
		}

		var lines = text.replace('  ','\u00A0 ','g').split('\n');

		for (var i in lines) {
				if (i!=0) {
						var temp = document.createElementNS(barbara__HTML,
																										 'html:br');
						barbara__holder.appendChild(temp);
				}

				barbara__holder.
						appendChild(document.createTextNode(lines[i]));
		}
}

////////////////////////////////////////////////////////////////

function barbara_relax() {
		if (barbara__get_page_height() > barbara__most_seen + barbara__get_viewport_height()) {
				barbara__set_more(1);
		} else {
				barbara__set_viewport_top(barbara__get_page_height());
				barbara__set_more(0);
		}
}

////////////////////////////////////////////////////////////////

var barbara__more_waiting = false;

function barbara__set_more(whether) {
		barbara__more_waiting = whether;

		if (whether) {
				win_show_status('Press any key for more...');
		} else {
				win_show_status('');
		}
}

function barbara_show_more() {

		// You shouldn't call this if there's no [MORE], but we'll
		// check anyway...
		if (!barbara__more_waiting) return;

		var a = 'GVT was '+barbara__get_viewport_top()+'; adding '+barbara__get_viewport_height();

		barbara__set_viewport_top(barbara__get_viewport_top() +
															barbara__get_viewport_height());

		document.title = a + '; GVT is now '+barbara__get_viewport_top();

		barbara_relax();
}

////////////////////////////////////////////////////////////////

function barbara_waiting_for_more() {
		return barbara__more_waiting;
}

////////////////////////////////////////////////////////////////

function barbara__get_viewport_top() {
		// Let's assume that the values used in scrolling are twips.
		// Moz's nsUnitConversion.h claims that there are 20 twips per pixel, so
		// we'll assume that too.

		var cx = new Object();
		var cy = new Object();
		barbara__viewport().getPosition(cx, cy);

		return cy.value / 20;
}

function barbara__set_viewport_top(y) {
		barbara__most_seen = y + barbara__get_viewport_height();
		barbara__viewport().scrollTo(0, y*20);
}

function barbara__get_viewport_height() {
		return win_get_dimensions()[1];
}

function barbara__get_page_height() {
		return parseInt(document.
										defaultView.
										getComputedStyle(document.getElementById('barbara'),'').
										getPropertyValue('height'));
}

function barbara__viewport() {
		var scrollable = document.getElementById('barbarabox').boxObject;
		return scrollable.QueryInterface(Components.interfaces.nsIScrollBoxObject);
}

////////////////////////////////////////////////////////////////

/*
// Scroll to the end -- to be merged into the above
function barbara_scroll_to_end() {

		var h = parseInt(document.defaultView.getComputedStyle(document.getElementById('barbara'),'').getPropertyValue('height'));

		var scrollable = document.getElementById('barbarabox').boxObject;
		var i = scrollable.QueryInterface(Components.interfaces.nsIScrollBoxObject);
		i.scrollTo(0, h*999);

		var window_height = win_get_dimensions()[1];

		if (h>window_height) {
				document.getElementById('bocardobox').setAttribute('top', h - window_height);
		} else {
				document.getElementById('bocardobox').setAttribute('top', 0);
		}

}

*/

////////////////////////////////////////////////////////////////
var BARBARA_HAPPY = 1;
////////////////////////////////////////////////////////////////
