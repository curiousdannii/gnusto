// datisi.js || -*- Mode: Java; tab-width: 2; -*-
// Standard command library
// 
// $Header: /cvs/gnusto/src/gnusto/content/datisi.js,v 1.7 2003/04/24 17:02:35 marnanel Exp $
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

////////////////////////////////////////////////////////////////

// Parses an IFF file entirely contained in the array |s|.
// The return value is a list. The first element is the form type
// of the file; subsequent elements represent chunks. Each chunk is
// represented by a list whose first element is the chunk type,
// whose second element is the starting offset of the data within
// the array, and whose third element is the length.

function iff_parse(s) {

		function num_from(offset) {
				return s[offset]<<24 | s[offset+1]<<16 | s[offset+2]<<8 | s[offset+3];
		}

		function string_from(offset) {
				return String.fromCharCode(s[offset]) +
						String.fromCharCode(s[offset+1]) +
						String.fromCharCode(s[offset+2]) +
						String.fromCharCode(s[offset+3]);
		}

		var result = [string_from(8)];

		var cursor = 12;

		while (cursor < s.length) {
				var chunk = [string_from(cursor)];
				var chunk_length = num_from(cursor+4);

				chunk.push(cursor+8);
				chunk.push(chunk_length);

				result.push(chunk);

				cursor += 8 + chunk_length;
				if (chunk_length % 2) cursor++;
		}

		return result;
}

////////////////////////////////////////////////////////////////

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

				} else if (content[0]==70 && content[1]==79 &&
									 content[2]==82 && content[3]==77) {
						// "F, O, R, M". An IFF file, then...

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
													alert("Should be able to read this... still need to implement scooping the middle out.");
													return 0;
											}
									}
									alert("Sorry, that Blorb file doesn't contain any Z-code, so Gnusto can't deal with it yet.");
									return 0;
							} else {

									// Some other IFF file type which we don't know.
							
									gnusto_error(309,'IFF '+iff_details[0]);
									return 0;
							}
				} else {
						// Don't know. Complain.
						gnusto_error(309);
						return 0;
				}
		}

		////////////////////////////////////////////////////////////////

		var localfile = 0;
		var filename = null;
		var result = 0;

		switch (a.length) {
				
		case 1: {
				var ifp = Components.interfaces.nsIFilePicker;
				var picker = Components.classes["@mozilla.org/filepicker;1"].
						createInstance(ifp);

				picker.init(window, "Select a story file", ifp.modeOpen);
				picker.appendFilter("Z-code version 5", "*.z5");
				picker.appendFilter("Blorb", "*.blb");
				picker.appendFilter("Saved game", "*.sav");
				
				if (picker.show()==ifp.returnOK) {
						filename = picker.fileURL.path;
						localfile = picker.file;
				} else
						return 0;
				
				break;
		}

		case 2: {
				localfile = new Components.Constructor("@mozilla.org/file/local;1",
																							 "nsILocalFile",
																							 "initWithPath")(a[1]);
				filename = a[1];
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
		    // Fall back to slow-load method for pre-1.4 compatibility
		    
		    // But warn the user first...
		    if (confirm("Loading binary files in javascript is extremely slow in Mozilla 1.3 and earlier.  " +
		        "Loading this file may take from 20 seconds to 2 minutes depending on the speed of " +
		        "your machine.  It is strongly recommended that you use Gnusto under Mozilla 1.4 or later.  " +
		        "Gnusto (and Mozilla) will appear to lock up while the file is loading.")) {
		    
		      var fc = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);
   		      fc.init(localfile, 1, 0, 0);

		      var sis = new Components.Constructor("@mozilla.org/scriptableinputstream;1", "nsIScriptableInputStream")();
		      sis.init(fc);

                      var fileContents = sis.read(localfile.fileSize);
		
	  	      var ss = fc.QueryInterface(Components.interfaces.nsISeekableStream);

                      // Due to the fact that the pre-1.4 method reads the contents of the file as a string,
                      // every time it hits a null, it thinks it's done.  So if we've stopped but aren't at
                      // the end of the file, tack on a null, seek past the null, keep reading.
                      // Lather, Rinse, Repeat.
                      while (fileContents.length!=localfile.fileSize) {
                          ss.seek(0, fileContents.length + 1);  
                          fileContents += "\0" + sis.read(localfile.fileSize);
                      }
                      
                      // We just got a string but all our functions are expecting an array of bytes.
                      // So we do some faux-typecasting.  (I'd just like to take this opportunity to
                      // suggest that loosely-typed languages are a really, really stupid idea.)
                      var TransContents = [];
                      TransContents.length = fileContents.length;
                      for (var i=0; i < fileContents.length; i++){
                        TransContents[i] = fileContents[i].charCodeAt();
                      }
                      fc.close();
                      result = dealWith(TransContents);
                    }
		}
		else {

    		  // now wrap the buffered input stream in a binary stream
		  var bin = Components.classes[BINIS_CTR].createInstance(nsIBinaryInputStream);
		  bin.setInputStream(buf);

		  result = dealWith(bin.readByteArray(localfile.fileSize));
		}

		if (filename && result==1) {
				sys_notify_of_load(filename);
				sys_show_story_title(filename);
		}
}

////////////////////////////////////////////////////////////////

var sys__vault = null;
var sys__recent_list = null;

function sys_init() {
		sys__vault = Components.classes['@mozilla.org/file/directory_service;1'].
				getService(Components.interfaces.nsIProperties).
				get("ProfD", Components.interfaces.nsIFile);

		sys__vault.append('gnusto');

		if (!sys__vault.exists()) {
				sys__vault.create(1, 0700);
		}

		sys__recent_list = sys__vault.clone();
		sys__recent_list.append('recent.dat');

		sys_update_recent_menu(sys_get_recent_list());

		sys_show_story_title('');
}

////////////////////////////////////////////////////////////////

function sys_get_recent_list() {

		if (sys__recent_list.exists()) {

				var localfile= new Components.Constructor("@mozilla.org/file/local;1",
																									"nsILocalFile",
																									"initWithPath")
						(sys__recent_list.path);
		
				var fc = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);
				fc.init(localfile, 1, 0, 0);
				
				var sis = new Components.Constructor("@mozilla.org/scriptableinputstream;1", "nsIScriptableInputStream")();
				sis.init(fc);

				var fileContents = sis.read(localfile.fileSize);

				fileContents = fileContents.replace('\r\n','\n');
				fileContents = fileContents.replace('\r','\n');
				fileContents = fileContents.split('\n');

				var result = [];
				var temp = [];

				for (var j in fileContents) {
						if (fileContents[j]=='') {
								if (temp.length!=0) {
										result.push(temp);
										temp = [];
								}
						} else {
								temp.push(fileContents[j]);
						}
				}

				if (temp.length!=0)
						result.push(temp);

				return result;

		} else
				return []; // Nothing there.
}

////////////////////////////////////////////////////////////////

function sys_notify_of_load(filename) {

		var recent = sys_get_recent_list();

		/////////////////////////////////////

		var j=0;
		while (j<recent.length) {
				if (recent[j][0]==filename)
						recent.splice(j,1);
				else
						j++;
		}

		recent.unshift([filename]);

		/////////////////////////////////////

		// Splice the list so that it doesn't grow beyond "n" entries.
		// "n" should be configurable later.

		recent.splice(10);
	 
		/////////////////////////////////////

		var stored = new Components.
				Constructor('@mozilla.org/network/file-output-stream;1',
										'nsIFileOutputStream',
										'init')(
														sys__recent_list,
														10,
														0600,
														0);

		function write(file, text) { file.write(text, text.length); }

		for (var m in recent) {

				for (var n in recent[m])
						write(stored, recent[m][n]+'\n');

				write(stored, '\n');
		}

		stored.close();

		/////////////////////////////////////

		sys_update_recent_menu(recent);
}

////////////////////////////////////////////////////////////////

// Unsure where this should best go, really...
// perhaps it would be better in mozilla-glue.
function sys_update_recent_menu(recent) {

		// Add in the separator only if it doesn't already
		// exist, but we do have any recent files to display.
		if (recent.length!=0 &&
				!(document.getElementById('recent-separator'))) {

				var sep = document.createElement('menuseparator');
				sep.setAttribute('id', 'recent-separator');

				document.
						getElementById('file-menu').
						childNodes[0].
						appendChild(sep);
		}


		// Now, for each recent file, set or create a menu item.

		for (var i in recent) {
				var name = 'recent'+i;
				var element = document.getElementById(name);
				var command = 'alert("erroneous");';
				var label = '?';

				if (recent[i].length>0) command = 'open '+recent[i][0];

				if (recent[i].length>1)
						label = recent[i][1];
				else
						label = recent[i][0];

				if (element==null) {

						element = document.createElement('menuitem');
						element.setAttribute('id', name);

						document.getElementById('file-menu').childNodes[0].appendChild(element);
				}

				var n = parseInt(i)+1;

				element.setAttribute('label', n+'. '+label);
				element.setAttribute('oncommand', 'dispatch("'+command+'")');
				if (n<10)
						element.setAttribute('accesskey', n);
				else if (n==10)
						element.setAttribute('accesskey', '0');
		}
}

////////////////////////////////////////////////////////////////

var sys__story_name = '';

function sys_show_story_title(newname) {

		if (newname != null)
				sys__story_name = newname;

		if (sys__story_name == '') {
				window.title = "Gnusto";
		} else {
				window.title = sys__story_name + " - Gnusto";
		}
}

////////////////////////////////////////////////////////////////
var DATISI_HAPPY = 1;
////////////////////////////////////////////////////////////////
