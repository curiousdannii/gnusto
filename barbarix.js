// gnusto-lib.js || -*- Mode: Java; tab-width: 2; -*-
//
// barbarix handles switching between the Z-machine's output window
// and the "infobox" window that you see on startup.
//
// FIXME: Mostly redundant now. Prune.
//
// $Header: /cvs/gnusto/src/gnusto/content/Attic/barbarix.js,v 1.2 2003/04/18 22:50:42 marnanel Exp $
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

var BARBARIX_OUTPUT = 1;
var BARBARIX_INFOBOX = 2;

var barbarix__current = BARBARIX_INFOBOX;

function barbarix_display(which) {

    switch (which) {
    case BARBARIX_OUTPUT:
	break;

    case BARBARIX_INFOBOX:
	break;

    default:
	alert('fixme!');
	return;
    }

    barbarix__current = which;
}

function barbarix_get_document(which) {

    barbarix_display(which);

    switch (which) {
    case BARBARIX_OUTPUT:
    case BARBARIX_INFOBOX:
	return document.getElementById('screen').contentDocument;

    default:
	alert('fixme!');
    }
}

function barbarix_clear(screen) {
    while (screen.childNodes.length!=0) {
	screen.removeChild(screen.childNodes[0]);
    }
}

////////////////////////////////////////////////////////////////

BARBARIX_HAPPY = 1;
