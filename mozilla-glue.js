// mozilla-glue.js || -*- Mode: Java; tab-width: 2; -*-
// Interface between gnusto-lib.js and Mozilla. Needs some tidying.
// $Header: /cvs/gnusto/src/gnusto/content/mozilla-glue.js,v 1.13 2003/03/02 15:26:40 marnanel Exp $
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

var lowerWindow = 0;
var tty = 0;
var current_text_holder = 0;
var current_window = 0;

// Array of contents of a .z5 file, one byte per element.
// May contain gaps; if so, look in mangled.
var zbytes = [];

// Mangled content of a .z5 file (a .mz5 file).
// See http://gnusto.mozdev.org/nullbytes.html
var mangled = 0;

// Offset of null byte fixups in the .mz5.
// See http://gnusto.mozdev.org/nullbytes.html
var fixups = 0;

function loadMangledZcode(zcode) {

    if (!zcode.exists())
				throw "Mangled Zcode file doesn't exist.";

    var fc = new Components.Constructor("@mozilla.org/network/local-file-channel;1",
																				"nsIFileChannel")();

    var sis = new Components.Constructor("@mozilla.org/scriptableinputstream;1",
																				 "nsIScriptableInputStream")();

    fixups = zcode.fileSize / 2;

    fc.init(zcode, 1, 0);
    sis.init(fc.open());

    mangled = sis.read(zcode.fileSize);
    zbytes = [];

		// We're required to modify some bits according to what we're able to supply.
		setbyte(0xB8, 0x01);
		setbyte(getbyte(0x11) & 0xC2, 0x11);
		// It's not at all clear what architecture we should claim to be. We could
		// decide to be the closest to the real machine we're running on (6=PC, 3=Mac,
		// and so on), but the story won't be able to tell the difference because of
		// the thick layers of interpreters between us and the metal. At least,
		// we hope it won't.
		setbyte(  1, 0x1E); // uh, let's be a vax.
		setbyte(103, 0x1F); // little "g" for gnusto
}

function getbyte(address) {
    // Convoluted to work around the null byte problem.
    // See http://gnusto.mozdev.org/nullbytes.html

    var result = zbytes[address];

    if (isNaN(result)) {
				// it's not in the lookup table, so find it in the original
				result = 0;
				if (mangled.charCodeAt(fixups+address)!=89)
						result = mangled.charCodeAt(address);
				
				zbytes[address] = result;
    }

    return result;
}

function setbyte(value, address) {

    // These two lines are to find bugs in gnusto-lib, not the
    // story file. They can be removed when we're sure it works.
    if (value<0) throw "too low "+value;
    if (value>255) throw "too high "+value;

    zbytes[address] = value;
}

function print_text(what) {
    if (what!='')
				current_text_holder.appendChild(
																				lowerWindow.createTextNode(what));
}

function print_newline() {
    if (current_window==0) {
				current_text_holder.appendChild(
																				lowerWindow.createElement('br'));
    } else if (current_window==1) {
				// fixme: have a method to do this inside upper
				u_x = 0;
				u_y = (u_y + 1) % u_height;
    } else
				throw "unearthly window "+current_window+' in print_newline';
}

function gnustoglue_output(what) {

		if (!what) return;

    if (current_window==0) {
				// Lower window.

				var newline;

				while (what.indexOf && (newline=what.indexOf('\n'))!=-1) {
						print_text(what.substring(0, newline));
						what = what.substring(newline+1);
	
						print_newline();
				}

				print_text(what);
		
				window.frames[0].scrollTo(0, lowerWindow.height);

    } else if (current_window==1) {
				// Upper window.
				u_write(what);
				set_upper_window();
    } else
				throw "unearthly window "+current_window+' in gnustoglue_output';
}

// Would be nice to do these in the skin, so, for example,
// a skin with muted tones could have pastel colours here.
var css_colours = ['', // 0 = current; never used here
									'',  // 1 = default; never used here
									'#000000', // 2 = black
									'#FF0000', // 3 = red
									'#00FF00', // 4 = green
									'#FFFF00', // 5 = yellow
									'#0000FF', // 6 = blue
									'#FF00FF', // 7 = magenta
									'#00FFFF', // 8 = cyan
									'#FFFFFF'];// 9 = white

var current_style = 0;
var current_foreground = 1; // 1==default
var current_background = 1;

function gnustoglue_set_text_style(style, foreground, background) {

    var styling = '';

		if (style==0)
				current_style = 0;
		else {
				if (style!=-1) current_style |= style;

				if (current_style & 0x1)
						// "reverse video", whatever that means for us
						styling = styling + 'background-color: #777777;color: #FFFFFF;';

				if (current_style & 0x2)
						// bold
						styling = styling + 'font-weight:bold;';

				if (current_style & 0x4)
						// italic
						styling = styling + 'font-style: italic;';
				
				if (current_style & 0x8)
						// monospace
						styling = styling + 'font-family: monospace;';
		}

		if (foreground==0)
				foreground = current_foreground;
		if (foreground!=1) { // Not "default".
				styling = styling + 'color:'+css_colours[foreground]+';';
				current_foreground = foreground;
		}

		if (background==0)
				background = current_background;
		if (background!=1) { // Not "default".
				styling = styling + 'background:'+css_colours[background]+';';
				current_background = background;
		}

    if (current_window==0) {
				current_text_holder = 
						lowerWindow.createElement('span');
				current_text_holder.setAttribute('style', styling);
				tty.appendChild(current_text_holder);
    }
}

function gnustoglue_split_window(lines) {
    u_setup(80, lines);
    set_upper_window();
}

function gnustoglue_set_window(w) {
    if (w==0 || w==1)
				current_window = w;
    else
				throw "set_window's argument must be 0 or 1";
}

function gnustoglue_erase_window(w) {
		switch (w) {

		case 1: // clear upper window
				u_setup(u_width, u_height);
				break;

		case 0: // clear lower window
				// can't handle clearing lower window yet
				break;

		case -2: // clear both
				// implement me
				break;

		case -1: // clear both and unsplit
				gnustoglue_split_window(0);
				// implement me
				break;

		default: // weird
				throw "weird erase_window argument";
		}
}

function gnustoglue_set_cursor(y, x) {
    if (current_window == 1) u_gotoxy(x, y);
}

// The reason that go_wrapper stopped last time. This is
// global because other parts of the program might want to know--
// for example, to disable input boxes.
var reasonForStopping = GNUSTO_EFFECT_WIMP_OUT; // safe default

function go_wrapper(answer) {

    var looping;
	
    do {
				looping = 0; // By default, we stop.

				reasonForStopping = go(answer);
		
				if (reasonForStopping == GNUSTO_EFFECT_WIMP_OUT) {
						// Well, just go round again.
						answer = 0;
						looping = 1;
				} else if (reasonForStopping == GNUSTO_EFFECT_INPUT) {
						// we know how to do this.
						// Just bail out of here.
				} else if (reasonForStopping == GNUSTO_EFFECT_INPUT_CHAR) {
						// similar
				} else if (reasonForStopping == GNUSTO_EFFECT_SAVE) {
						// nope
						alert("Saving of games isn't implemented yet.");
						answer = 0;
						looping = 1;
				} else if (reasonForStopping == GNUSTO_EFFECT_RESTORE) {
						// nope here, too
						alert("Loading saved games isn't implemented yet.");
						answer = 0;
						looping = 1;
				} else if (reasonForStopping == GNUSTO_EFFECT_QUIT) {
						alert("End of game.");
						// not really the best plan in the long term to close
						// the main window when the game asks for it, but
						// for now...
						window.close();
				} else
						// give up: it's nothing we know
						throw "gnusto-lib used an effect code we don't understand: 0x"+
								reasonForStopping.toString(16);
    } while (looping);

}

function set_upper_window() {
    var upper = document.getElementById("upper");

    while (upper.hasChildNodes())
				upper.removeChild(upper.lastChild);

    upper.appendChild(
											document.createTextNode(u_preformatted()));
}

function play() {
    lowerWindow = frames[0].document;
    tty = lowerWindow.getElementById('tty');

    u_setup(80,0);
    set_upper_window();

    gnustoglue_set_text_style(0, 1, 1);

    setup();
    go_wrapper(0);
}

function deal_with_exception(e) {

		// -1 is thrown by gnusto_error when it wants to kill everything
		// back down to this level.

		if (e!=-1) {
				alert('-- gnusto error --\n'+e);
				throw e;
		}
}

function gotInput(event) {
		var inputBox = document.getElementById("input");
		var value = inputBox.value;

		if (reasonForStopping==GNUSTO_EFFECT_INPUT && event.keyCode==13) {
				inputBox.value = '';
				gnustoglue_output(value+'\n');
				go_wrapper(value);
		} else if (reasonForStopping==GNUSTO_EFFECT_INPUT_CHAR) {
				var useful = 1;

				if (event.keyCode==0) {
						var code = event.charCode;

						if (code>=32 && code<=126)
								// Regular ASCII; just pass it straight through
								go_wrapper(code);
						else
								useful = 0;
				}
				else {
						switch (event.keyCode) {

								// Arrow keys
						case  37 : go_wrapper(129); break;
						case  38 : go_wrapper(130); break;
						case  39 : go_wrapper(131); break;
						case  40 : go_wrapper(132); break;

								// Function keys
						case 112 : go_wrapper(133); break;
						case 113 : go_wrapper(134); break;
						case 114 : go_wrapper(135); break;
						case 115 : go_wrapper(136); break;
						case 116 : go_wrapper(137); break;
						case 117 : go_wrapper(138); break;
						case 118 : go_wrapper(139); break;
						case 119 : go_wrapper(140); break;
						case 120 : go_wrapper(141); break;
						case 121 : go_wrapper(142); break;

								// delete / backspace
						case  46 : go_wrapper(8); break;
						case   8 : go_wrapper(8); break;

								// newline / return
						case  10 : go_wrapper(13); break;
						case  13 : go_wrapper(13); break;

								// escape
						case  27 : go_wrapper(27); break;

						default:
								useful = 0; // nope, didn't do it for us.
						}
				}

				if (useful) {
						inputBox.value = '';
						return 0;
				} else {
						return 1;
				}
		}
}

function aboutBox() {
    // simple JS alert for now.
    alert('Gnusto v0.2.0\nby Thomas Thurman <thomas@thurman.org.uk>\n'+
					'Early prealpha\n\nhttp://gnusto.mozdev.org\nhttp://marnanel.org\n\n'+
					'Copyright (c) 2003 Thomas Thurman.\nDistrubuted under the GNU GPL.');
}

function loadStory() {

    var ifp = Components.interfaces.nsIFilePicker;
    var picker = Components.classes["@mozilla.org/filepicker;1"].
				createInstance(ifp);

    picker.init(window, "Select a story file", ifp.modeOpen);
    picker.appendFilter("mangled-z5", "*.mz5");

    if (picker.show()==ifp.returnOK) {
				loadMangledZcode(picker.file);
				play();
    }
}

function quitGame() {
    window.close();
}

function gnusto_error(n) {
		var m = 'Gnusto error #'+n;

		if (n>=500)
				m = m + ' transient.';
		else
				m = m + ' FATAL.';

		for (var i=1; i<arguments.length; i++) {
				m = m + '\nDetail: '+arguments[i].toString();
		}

		var procs = arguments.callee;
		var procstring = '';
		while (procs!=null) {
				var name = procs.toString();

				if (name==null) {
						procstring = ' (anon)'+procstring;
				} else {
						var r = name.match(/function (\w*)/);

						if (r==null) {
								procstring = ' (weird)' + procstring;
						} else {
								procstring = ' ' + r[1] + procstring;
						}
				}

				procs = procs.caller;
		}
		m = m + '\n\nJS call stack:' + procstring;

		m = m + '\n\nZ call stack:'
				for (var i in call_stack) {
						// We don't have any way of finding out the real names
						// of z-functions at present. This will have to do.
						m = m + ' ('+call_stack[i].toString(16)+')'
				}

		if (pc!=null)
				m = m + '\nProgram counter: '+pc.toString(16);

  	m = m + '\nZ eval stack (decimal):'
				for (var i in gamestack) {
						m = m + ' '+ gamestack[i];
				}

		if (locals!=null) {
				m = m + '\nLocals (decimal):';
				for (var i=0; i<16; i++) {
						m = m + ' ' + i + '=' + locals[i];
				}
		}

		alert(m);

		if (n<500) throw -1;
}

function gnustoglue_notify_transcription(whether) {
		// here we'll ask for a filename if |whether|, and we don't
		// already have a filename
}

function gnustoglue_transcribe(text) {
		if (current_window==0) {
				// alert('Transcribe: '+text);
		}
}

function doTranscript() {

    var menuItem = document.getElementById("transcript");

		if (is_transcribing()) {
				set_transcribing(0);
				//				menuItem.setProperty('label', 'Stop transcript');
		} else {
				set_transcribing(1);
				//				menuItem.setProperty('label', 'Start transcript...');
		}
}

