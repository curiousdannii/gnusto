// darii.js || -*- Mode: Java; tab-width: 2; -*-
//
// Gnusto's event mechanism.
// 
// $Header: /cvs/gnusto/src/gnusto/content/darii.js,v 1.11 2003/07/26 04:24:43 marnanel Exp $
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
// dispatch (a.k.a. despatch)
//
// Requests execution of a named operation. The argument |what|
// is either:
//  * a string, in which case it's split across spaces
//     to make an array
//  * an array, in which case it's used as is
//  * something else, in which case it's turned into a string
//    and then dealt with as above to make an array.
//
// The first element of the resulting array is the name of the operation.
// This will succeed iff there exists a function named
// "command_"+(operation name), and this function will be called.
// The full array will be passed to the function.
//
// For example, dispatch("bounce", "wombat") will result in the
// function call "command_bounce(["bounce", "wombat"])".
// The result of this call is not returned to the caller of dispatch();
// this system is for when you need something done sooner or later,
// rather than for when you need a result worked out.
//
// This allows us to introduce an event layer between the caller and
// the function called, so that:
//  * if we need to we can, say, queue requests for later
//  * there's a restriction on what functions can be called
//    using this method. (So if we let config files dispatch events,
//    they can't call just any function.)
//
// Bugs: Error handling assumes a TTY interface (as once existed) and
// needs overhaul.
//
// I did consider creating "dispatch_with_status" which would set
// the status line appropriately and then call dispatch() using
// setTimeout, to give the UI some time to update. It didn't work
// in all circumstances, but it might repay further experiment.
// (It would require deprecation of the array form of |what|, since
// setTimeout needs to be passed a string.)
function dispatch(what) {

		try{

				// burin('dispatch', what);

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
						if (str(e)!="-1") {
								gnusto_error(307, e);
						}
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

var despatch = dispatch; // because some people are English :)

////////////////////////////////////////////////////////////////

function darii_print(message) {
    if (message!=null) {
				alert(message);
    }
}

////////////////////////////////////////////////////////////////
var DARII_HAPPY = 1;
////////////////////////////////////////////////////////////////
