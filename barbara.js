// barbara.js || -*- Mode: Java; tab-width: 2; -*-
// Lightweight lower-window handler.
//
// $Header: /cvs/gnusto/src/gnusto/content/barbara.js,v 1.3 2003/04/27 22:48:58 marnanel Exp $
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

////////////////////////////////////////////////////////////////

function barbara_start_game() {

		// Does nothing yet.

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

function barbara_chalk(text) {

		if (barbara__holder==0) {
				// Create a new holder.
				barbara__holder =
						document.createElementNS(barbara__HTML,
																		 'html:span');

				barbara__holder.setAttribute('class',
																		 barbara__current_css);

				document.getElementById('barbara').
						appendChild(barbara__holder);
		}

		var lines = text.replace('  ','\u00A0 ','g').split('\n');

		for (var i in lines) {
				if (i!=0) {
						barbara__holder.
								appendChild(document.createElementNS(barbara__HTML,
																										 'html:br'));
				}
				
				barbara__holder.
						appendChild(document.createTextNode(lines[i]));
		}

		return '';
}

////////////////////////////////////////////////////////////////
var BARBARA_HAPPY = 1;
////////////////////////////////////////////////////////////////
