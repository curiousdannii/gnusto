// datisi.js || -*- Mode: Java; tab-width: 2; -*-
// Standard command library
// 
// $Header: /cvs/gnusto/src/gnusto/content/datisi.js,v 1.2 2003/04/20 23:34:07 marnanel Exp $
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

		// This could be a whole file on its own...
		// (...and maybe should be.)

		function dealWith(content) {

				function loadAsZCode(content) {

						// We're required to modify some bits
						// according to what we're able to supply.
						content[0x01]  = 0x1D; // Flags 1
						content[0x11] &= 0x47;

						// It's not at all clear what architecture
						// we should claim to be. We could decide to
						// be the closest to the real machine
						// we're running on (6=PC, 3=Mac, and so on),
						// but the story won't be able to tell the
						// difference because of the thick layers of
						// interpreters between us and the metal.
						// At least, we hope it won't.

						content[0x1E] = 1;   // uh, let's be a vax.
						content[0x1F] = 103; // little "g" for gnusto

						// Put in some default screen values here until we can
						// set them properly later.
						// For now, units are characters. Later they'll be pixels.

						content[0x20] = 25; // screen height, characters
						content[0x21] = 80; // screen width, characters
						content[0x22] = 25; // screen width, units
						content[0x23] = 0;
						content[0x24] = 80; // screen height, units
						content[0x25] = 0;
						content[0x26] = 1; // font width, units
						content[0x27] = 1; // font height, units

						glue_receive_zcode(content);
						return 1;
				}

				// Okay. Our task now is to find what kind of file we've been handed,
				// and to deal with it accordingly.

				if (content[0]==5) {

						// Looks like a .z5 file, so let's go ahead.
						if (loadAsZCode(content)) {
								play();
								return 1;
						} else
								return 0;

				} else if (content[0]==70 && content[0]==79 &&
									 content[0]==82 && content[0]==77) {
						// "F, O, R, M". An IFF file, then...

						alert('IFF support is down while we fix the new z5 support. Back soon.');
						/*
							var iff_details = iff_parse(content);

							if (iff_details[0]=='IFZS') {

							// Quetzal saved file.
							// Can't deal with these yet.

							alert("Sorry, Gnusto can't yet load saved games.");
							return 0;

							} else if (iff_details[0]=='IFRS') {

							// Blorb resources file, possibly containing
							// Z-code.

							// OK, so go digging for it.
							for (var j=1; j<iff_details.length; j++) {
							if (iff_details[j][0]=='ZCOD') {
							loadMangledZcode(content.substring(iff_details[j][1],
							iff_details[j][1]+iff_details[j][2]));
							return 1;
							}
							alert("Sorry, that Blorb file doesn't contain any Z-code, so Gnusto can't deal with it yet.");
							return 0;
							} else {

							// Some other IFF file type which we don't know.
							
							gnusto_error(309,'IFF',iff_details[0]);
							return 0;
							}*/
				} else {
						// Don't know. Complain.
						gnusto_error(309);
						return 0;
				}
		}

		////////////////////////////////////////////////////////////////

		var localfile = 0;

		switch (a.length) {
				
		case 1: {
				var ifp = Components.interfaces.nsIFilePicker;
				var picker = Components.classes["@mozilla.org/filepicker;1"].
						createInstance(ifp);

				picker.init(window, "Select a story file", ifp.modeOpen);
				picker.appendFilter("Z-code version 5", "*.z5");
				picker.appendFilter("Blorb", "*.blb");
				
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

    if (!localfile.exists()) {
				gnusto_error(301);
				return;
		}

		////////////////////////////////////////////////////////////////

		// Actually do the loading.
		// Based on test code posted by Robert Ginda <rginda@netscape.com> to
		// bug 170585 on Mozilla's bugzilla.

		var IOS_CTR = "@mozilla.org/network/io-service;1";
		var nsIIOService = Components.interfaces.nsIIOService;

		var BUFIS_CTR = "@mozilla.org/network/buffered-input-stream;1";
		var nsIBufferedInputStream = Components.interfaces.nsIBufferedInputStream;

		var BINIS_CTR = "@mozilla.org/binaryinputstream;1";
		var nsIBinaryInputStream = Components.interfaces.nsIBinaryInputStream;

		var ios = Components.classes[IOS_CTR].getService(nsIIOService);

		var uri = ios.newFileURI(localfile);
		var is = ios.newChannelFromURI(uri).open();

		// create a buffered input stream
		var buf = Components.classes[BUFIS_CTR].createInstance(nsIBufferedInputStream);
		buf.init(is, localfile.fileSize);

		if (!(BINIS_CTR in Components.classes)) {
				// Oh dear :/ Then we can't load binary files.
				gnusto_error(310);
				return;
		}

		// now wrap the buffered input stream in a binary stream
		var bin = Components.classes[BINIS_CTR].createInstance(nsIBinaryInputStream);
		bin.setInputStream(buf);

		dealWith(bin.readByteArray(localfile.fileSize));

}

////////////////////////////////////////////////////////////////
var DATISI_HAPPY = 1;
////////////////////////////////////////////////////////////////
