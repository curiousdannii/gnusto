// darii.js || -*- Mode: Java; tab-width: 2; -*-
// 
// $Header: /cvs/gnusto/src/gnusto/content/darii.js,v 1.8 2003/06/16 18:32:07 marnanel Exp $
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

function dispatch(what) {

		try{

				burin('dispatch', what);

				var args = [];

				switch (typeof(what)) {
				case "string":
						args = what.split(' ');
						break;

				case "array":
						args = what;
						break;

				default:
						args = what.toString().split(' ');
				}

				var func = 'command_' + args[0];

				if (func in this)
						darii_print(this[func](args));
				else
						darii_print('Unknown command: '+args[0]+'. Try "help".');
		} catch(e) {
				try {
						gnusto_error(307, e);
				} catch (f) {
						if (f==-1) {
								throw e;
						} else {
								throw f;
						}
				}
				throw e;
		}
}

////////////////////////////////////////////////////////////////

function dispatch_with_status(what, status) {
		win_set_status_line(status);		
		setTimeout('dispatch("'+what+'")', 1000);
}

////////////////////////////////////////////////////////////////

var despatch = dispatch; // because some people are English :)
var despatch_with_status = dispatch_with_status;

function darii_print(message) {
    if (message!=null) {
				alert(message);
    }
}

////////////////////////////////////////////////////////////////
var DARII_HAPPY = 1;
////////////////////////////////////////////////////////////////
