// upper.js -- upper window handler.
//
// Currently doesn't allow for formatted text. Will do later.
// $Header: /cvs/gnusto/src/gnusto/content/upper.js,v 1.3 2003/03/15 13:59:54 marnanel Exp $
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
var UPPER_HAPPY = 0;
////////////////////////////////////////////////////////////////

var u_width = 80;
var u_height = 3;
var u_x = 0;
var u_y = 0;

// When we can do formatted text:
//   u_contents should be a list of rows, each of which is a list
//   of spans, each of which is a pair of style and content.

var u_contents;

function u_setup(w, h) {
	u_width = w;
	u_height = h;

	u_contents = [];

	var temp = '';

	for (var i=0; i<u_width; i++)
		temp = temp + ' ';

	for (var i=0; i<u_height; i++)
		u_contents.push(temp);
}

function u_gotoxy(x,y) {
	u_x = x;
	u_y = y;
}

function u_write(message, x, y) {

	if (isNaN(x)) x=u_x;
	if (isNaN(y)) y=u_y;

	var current = u_contents[y];
	if (!current) current = '';

	var endpoint = x+message.length;

	u_x = endpoint; u_y = y;

	if (endpoint > current.length) {
		// Part of it's not our problem...
		var breaking = current.length-x;
		u_write(message.substring(breaking), 0, (y+1)%u_height);

		// And part of it is (but only one part).
		message = message.substring(0, breaking);
	}

	u_contents[y] =
		current.substring(0, x) +
		message +
		current.substring(endpoint);
}

function u_preformatted() {
	return u_contents.join('\n');
}

////////////////////////////////////////////////////////////////
UPPER_HAPPY = 1;
////////////////////////////////////////////////////////////////
