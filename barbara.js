// barbara.js || -*- Mode: Java; tab-width: 2; -*-
// Lightweight lower-window handler.
//
// $Header: /cvs/gnusto/src/gnusto/content/barbara.js,v 1.23 2003/07/25 21:08:39 marnanel Exp $
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

////////////////////////////////////////////////////////////////
//
//                     PRIVATE VARIABLES
//
////////////////////////////////////////////////////////////////

// The HTML <span> which we're adding text to at present.
// Can be null, if there isn't one.
var barbara__holder = null;

// Namespace of HTML. Constant.
var barbara__HTML = "http://www.w3.org/1999/xhtml";

// CSS string to be used as the value of the "style" element
// when we next create barbara__holder, in case that's null.
var barbara__current_css = '';

// The portion of the current command-line before the cursor.
var barbara__before_cursor = null;

// The portion of the current command-line after the cursor.
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

		barbara__holder = null;

		barbara__before_cursor = null;
		barbara__after_cursor = null;

		barbara__most_seen = 0;
}

////////////////////////////////////////////////////////////////

function barbara_clear() {
		bocardo_collapse();

		barbarix_clear(document.getElementById('barbara'));
		document.getElementById('barbarabox').setAttribute('class',
																											 barbara__current_css);
		document.getElementById('barbara').setAttribute('class',
																										barbara__current_css);
		barbara__holder = null;
		barbara__set_viewport_top(0);
		barbara__most_seen = 0;
}

////////////////////////////////////////////////////////////////

function barbara_set_text_style(css_class) {
		barbara__holder = null;
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

var barbara__previous_monospace = 0;

function barbara_chalk(text, monospace) {

		if (!barbara__holder ||
				monospace!=barbara__previous_monospace) {

				// Create a new holder.

				barbara__holder =
						document.createElementNS(barbara__HTML,
																		 'html:span');

				var css = barbara__current_css;

				if (monospace) css = css + ' sm';

				barbara__holder.setAttribute('class', css);

				var temp = document.getElementById('barbara');
				temp.appendChild(barbara__holder);
		}

		barbara__previous_monospace = monospace;

		// Replace alternate spaces with &nbsp;s so that Gecko
		// won't collapse them.
		var lines = text.
				replace('  ',' \u00A0','g').
				split('\n');

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

		var page_height = barbara__get_page_height();

		if (page_height < barbara__get_viewport_height()) {
				// Then we haven't started scrolling yet.
				// barbara__most_seen is now the page height, of course.

				barbara__most_seen = page_height;

		} else {
				// The lower screen scrolls by some amount.

				var slippage = page_height - barbara__most_seen;

				if (slippage > barbara__get_viewport_height()) {
						// More than a screenful. Scroll to the top...
						barbara__set_viewport_top(barbara__most_seen);
						barbara__set_more(1);
				} else {
						// Jump straight to the bottom. No problem.
						barbara__set_viewport_top(page_height);
						barbara__set_more(0);
				}

				// This implies collapsing the upper screen (see bug 4050).
				bocardo_collapse();
		}
}

////////////////////////////////////////////////////////////////

var barbara__more_waiting = false;

function barbara__set_more(whether) {

		// burin('more?', whether?'yes':'no');

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

		barbara_relax();
}

////////////////////////////////////////////////////////////////

function barbara_waiting_for_more() {
		return barbara__more_waiting;
}

////////////////////////////////////////////////////////////////

// Let's assume that the values used in scrolling are twips.
function barbara__twips_per_pixel() {

		// There's no way to find the number of twips per pixel as such.
		// What we can do, though, is get the size of something in pixels
		// and then in twips (actually, in centimetres), and divide.

		var PIXELS = 5;
		var CENTIMETRES = 6;
		var TWIPS_PER_CENTIMETRE = 567;

		var b = window.getComputedStyle(document.getElementById('barbarabox'),
																		null).
				getPropertyCSSValue('height');

		var centimetre_height = b.getFloatValue(CENTIMETRES);
		var pixel_height = b.getFloatValue(PIXELS);

		if (pixel_height==0) {
				return 15; // complete guess, but better than crashing
		} else {
				return (centimetre_height * TWIPS_PER_CENTIMETRE) /
						pixel_height;
		}
}

function barbara__get_viewport_top() {

		var cx = new Object();
		var cy = new Object();
		barbara__viewport().getPosition(cx, cy);

		return cy.value / barbara__twips_per_pixel();
}

function barbara__set_viewport_top(y) {

		barbara__viewport().scrollTo(0, y*barbara__twips_per_pixel());

		var new_top = barbara__get_viewport_top();
		barbara__most_seen = new_top + barbara__get_viewport_height();

		document.getElementById('bocardobox').setAttribute('top', new_top);
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


// Removes |count| characters from the end of the text and
// returns them.
function barbara_recaps(count) {

		if (count==0) return '';

		// The loop of this function rarely runs, and so
		// is optimised for readability rather than speed.

		var result = '';
		var barb = document.getElementById('barbara');

		while (result.length < count && barb.childNodes.length!=0) {
				var barbLast = barb.lastChild;

				if (barbLast.childNodes.length==0) {
						barb.removeChild(barbLast);
				} else {
						var barbLastText = barbLast.lastChild;

						if (barbLastText.data.length==0) {
								barbLast.removeChild(barbLastText);
						} else {
								result = barbLastText.data[barbLastText.data.length-1] + result;
								barbLastText.data = barbLastText.data.substring(0, barbLastText.data.length-1);
						}
				}
		}

		// Destroy the holder; it's likely we've corrupted
		// its value. It's only a cache, so it'll
		// get regenerated next time we print anything.
		barbara__holder = null;

		return result;
}

////////////////////////////////////////////////////////////////
var BARBARA_HAPPY = 1;
////////////////////////////////////////////////////////////////
