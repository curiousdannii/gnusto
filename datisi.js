// datisi.js || -*- Mode: Java; tab-width: 2; -*-
// Standard command library
// 
// $Header: /cvs/gnusto/src/gnusto/content/datisi.js,v 1.1 2003/04/20 12:24:06 marnanel Exp $
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

function command_about(a) {
    // simple JS alert for now.
    alert('Gnusto v0.4.x\nby Thomas Thurman <thomas@thurman.org.uk>\n'+
	  'Early prealpha\n\nhttp://gnusto.mozdev.org\nhttp://marnanel.org\n\n'+
	  'Copyright (c) 2003 Thomas Thurman.\nDistrubuted under the GNU GPL.');
}

function command_open(a) {

		var localfile = 0;

		switch (a.length) {
				
		case 1: {
				var ifp = Components.interfaces.nsIFilePicker;
				var picker = Components.classes["@mozilla.org/filepicker;1"].
						createInstance(ifp);

				picker.init(window, "Select a story file", ifp.modeOpen);
				picker.appendFilter("mangled-z5", "*.mz5");
				
				if (picker.show()==ifp.returnOK)
						localfile = picker.file;
				else
						return;
				
				break;
		}

		case 2: {
				localfile= new Components.Constructor("@mozilla.org/file/local;1",
																							"nsILocalFile",
																							"initWithPath")(a[1]);
				break;
		}

		default:
				return 'Wrong number of parameters for open.';
		}
		
		if (loadSomeFile(localfile)) {
				if (single_step) {
						tossio_print('Loaded OK (use /run or /step now).');
				}
				play();
		} else {
				tossio_print('Load failed.');
		}
}

////////////////////////////////////////////////////////////////
var DATISI_HAPPY = 1;
////////////////////////////////////////////////////////////////
