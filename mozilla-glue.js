// mozilla-glue.js || -*- Mode: Java; tab-width: 2; -*-
// Interface between gnusto-lib.js and Mozilla. Needs some tidying.
// $Header: /cvs/gnusto/src/gnusto/content/mozilla-glue.js,v 1.35 2003/04/03 16:47:08 marnanel Exp $
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
var MOZILLA_GLUE_HAPPY = 0;
////////////////////////////////////////////////////////////////

// Checks that all the JavaScript files are happy-- that is, that they
// all loaded without any errors. (Happiness Will Prevail.)
function ensureHappiness() {
		function ensureOneFile(check) {
				try {
						if (eval(check)==0) {
								gnusto_error(300,check);
						}
				} catch (e) {
						if (e==-1) {
								// This is gnusto_error crashing out. Let it through.
								throw e;
						} else {
								gnusto_error(300,check,e.toString());
						}
				}
		}

		ensureOneFile('MOZILLA_GLUE_HAPPY');
		ensureOneFile('GNUSTO_LIB_HAPPY');
		ensureOneFile('TOSSIO_HAPPY');
		ensureOneFile('UPPER_HAPPY');
		ensureOneFile('VENKMAN_MSG_HAPPY');
}

var upperWindow = 0;
var lowerWindow = 0;
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

// Dictionary of Gnusto errors which should be ignored.
// The keys are the error numbers; the values are ignored.
// You *can* make the system ignore fatal errors this way, but
// the results (both for Gnusto and the story) are undefined.
var ignore_errors = {
		706: 1, // Work around a bug in Library 15/2 (see bug 3314)
   };

////////////////////////////////////////////////////////////////
//
// Loads the |fixups| and |mangled| arrays, and clears |zbytes| ready to be
// filled from them. |zcode| is an nsILocalFile, initialised and ready to be
// read from. Returns false if there was an error (and the global state will be
// unchanged), true if everything worked.
//
// Modified by Eric Liga <naltrexone42@yahoo.com> to remove deprecated
// interfaces which are no longer present in Mozilla v1.3.
//
function loadMangledZcode(zcode) {

    if (!zcode.exists()) gnusto_error(301);

    fixups = zcode.fileSize / 2;

		var fc = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);

		fc.init(zcode, 1, 0, 0);

		var sis = new Components.Constructor("@mozilla.org/scriptableinputstream;1",
																				 "nsIScriptableInputStream")();

		sis.init(fc);

    var tempMangled = sis.read(zcode.fileSize);

		if (tempMangled.length!=zcode.fileSize) {
				if (confirm('You seem to have opened an ordinary, non-encoded story file. Because of a current problem within Mozilla, Gnusto needs all story files to be encoded in "mz5" format before loading.\n\nWould you like more explanation?'))
						open('http://gnusto.mozdev.org/nullbytes.html', '_blank');
				return 0;
		}

		mangled = tempMangled;
    zbytes = [];

		// We're required to modify some bits according to what we're able to supply.
		setbyte(0x1D, 0x01);
		setbyte(getbyte(0x11) & 0x47, 0x11);
		// It's not at all clear what architecture we should claim to be. We could
		// decide to be the closest to the real machine we're running on (6=PC, 3=Mac,
		// and so on), but the story won't be able to tell the difference because of
		// the thick layers of interpreters between us and the metal. At least,
		// we hope it won't.
		setbyte(  1, 0x1E); // uh, let's be a vax.
		setbyte(103, 0x1F); // little "g" for gnusto

		// For now, units are characters. Later they'll be pixels.
		setbyte( 25, 0x20); // screen height, characters
		setbyte( 80, 0x21); // screen width, characters
		setword( 25, 0x22); // screen width, units
		setword( 80, 0x24); // screen height, units
		setbyte(  1, 0x26); // font width, characters
		setbyte(  1, 0x27); // font height, characters

		return 1;
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
    if (value<0) gnusto_error(302, "too low ", value, address);
    if (value>255) gnusto_error(302, "too high", value, address);

    zbytes[address] = value;
}

var window_buffers = ['', ''];

function gnustoglue_output(what) {
		window_buffers[current_window] = window_buffers[current_window] + what;
}

function output_flush() {
		for (var i=0; i<2; i++) {
				chalk(i, 0, 0, 0, window_buffers[i]);
				window_buffers[i] = '';
		}
 		window.frames[1].scrollTo(0, lowerWindow.height);
}

function gnustoglue_soundeffect(number, effect, volume, callback) {
		// all sound-effects are just beeps to us at present.
		var sound = new Components.Constructor("@mozilla.org/sound;1","nsISound")();
		sound.beep();
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

		/*

			... disabled pending new layout...

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

		*/
}

function gnustoglue_split_window(lines) {
    /* FIXME: u_setup(80, lines);
			 set_upper_window(); */
}

function gnustoglue_set_buffer_mode(whether) {
		// Not sure this makes much difference to us.
		// Mozilla handles the printing.
		// FIXME: not any more!
}

function gnustoglue_set_window(w) {
    if (w==0 || w==1)
				current_window = w;
    else
				gnusto_error(303, w);
}

function gnustoglue_erase_window(w) {

		switch (w) {

		case 1: // clear upper window
				// FIXME: was: u_setup(u_width, u_height);
				// this may come in useful when we put height-fixing back

				clear_window(1);
				break;

		case 0: // clear lower window
				// can't handle clearing lower window yet

				clear_window(0);
				break;

		case -2: // clear both
				clear_window(0);
				clear_window(1);
				break;

		case -1: // clear both and unsplit
				gnustoglue_split_window(0);
				clear_window(0);
				clear_window(1);
				break;

		default: // weird
				gnusto_error(303, w);
		}

}

function gnustoglue_set_cursor(y, x) {
		output_flush();
		gotoxy(current_window, x-1, y-1);
}

// The reason that go_wrapper stopped last time. This is
// global because other parts of the program might want to know--
// for example, to disable input boxes.
var reasonForStopping = GNUSTO_EFFECT_WIMP_OUT; // safe default

function go_wrapper(answer) {

    var looping;

		// If we stopped on a breakpoint last time, fix it up.
		if (reasonForStopping == GNUSTO_EFFECT_BREAKPOINT && breakpoints[pc]) {
				breakpoints[pc]=2; // So it won't trigger immediately we run.
		}
	
    do {
				looping = 0; // By default, we stop.

				reasonForStopping = go(answer);

				output_flush();
		
				if (reasonForStopping == GNUSTO_EFFECT_WIMP_OUT) {
						if (!single_step) {
								// Well, just go round again.
								answer = 0;
								looping = 1;
						}
				} else if (reasonForStopping == GNUSTO_EFFECT_INPUT) {
						// we know how to do this.
						// Just bail out of here.
				} else if (reasonForStopping == GNUSTO_EFFECT_INPUT_CHAR) {
						TEMPdumpscreens();
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
				} else if (reasonForStopping == GNUSTO_EFFECT_PIRACY) {
						// "Interpreters are asked to be gullible and
						// to unconditionally branch."
						//
						// One day, we should perhaps have a preference
						// that the user can set to influence the result.
						answer = 0;
						looping = 1;
				} else if (reasonForStopping == GNUSTO_EFFECT_VERIFY) {

						// FIXME: Here we should verify the game.
						// There are many more impotrant things to fix first,
						// though. So let's just say "yes" for now.

						answer = 1;
						looping = 1;

				} else if (reasonForStopping == GNUSTO_EFFECT_BREAKPOINT) {
						// Ooh, a breakpoint! Lovely!
						looping = 0;
						tossio_notify_breakpoint_hit();
				} else
						// give up: it's nothing we know
						gnusto_error(304, "0x"+reasonForStopping.toString(16));
    } while (looping);

		if (debug_mode) {
				tossio_debug_instruction(['status']);
		}
}

/*
function set_upper_window() {
		 FIXME
    var upper = document.getElementById("upper");

    while (upper.hasChildNodes())
				upper.removeChild(upper.lastChild);

    upper.appendChild(
											document.createTextNode(u_preformatted()));
}
*/

function start_up() {
		document.getElementById('input').focus();

		window_setup();
		upperWindow = frames[0].document;
    lowerWindow = frames[1].document;

		/*    u_setup(80,0);
					set_upper_window();*/

    gnustoglue_set_text_style(0, 1, 1);
}

function play() {
		start_up();
    setup();

		if (!single_step) {
				go_wrapper(0);
		}
}

// Used as the only content of the exception handlers of JS fragments in the XUL.
function deal_with_exception(e) {

		// -1 is thrown by gnusto_error when it wants to kill everything
		// back down to this level, so we should ignore that.

		if (e!=-1) {
 				gnusto_error(307, e);
		}
}

function gotInput(event) {
		var inputBox = document.getElementById("input");
		var value = inputBox.value;

		if (value.length>2 && value[0]=='/' && event.keyCode==13) {
				// Tossio debug stuff. (There should be a way to
				// turn this off, too.)

				inputBox.value = '';
				tossio_debug_instruction(value.substring(1).split(/ +/));
		} else if (reasonForStopping==GNUSTO_EFFECT_INPUT && event.keyCode==13) {
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

function loadStory() {

    var ifp = Components.interfaces.nsIFilePicker;
    var picker = Components.classes["@mozilla.org/filepicker;1"].
				createInstance(ifp);

    picker.init(window, "Select a story file", ifp.modeOpen);
    picker.appendFilter("mangled-z5", "*.mz5");

    if (picker.show()==ifp.returnOK) {
				if (loadMangledZcode(picker.file))
						play();
    }
}

function quitGame() {
    window.close();
}

function gnusto_error(n) {

		if (ignore_errors[n])
				return;

		var m = getMsg('error.'+n+'.name', arguments, 'Unknown error!');

		m = m + '\n\n' + getMsg('error.'+n+'.details', arguments, '');

		m = m + '\n\nError #'+n+'-- ';

		if (n>=500)
				m = m + 'transient';
		else
				m = m + 'fatal';

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

		m = m + '\n\nZ call stack:';

		try {
				for (var i in call_stack) {
						// We don't have any way of finding out the real names
						// of z-functions at present. This will have to do.
						m = m + ' ('+call_stack[i].toString(16)+')'
				}

				if (pc!=null)
						m = m + '\nProgram counter: '+pc.toString(16);

				m = m + '\nZ eval stack (decimal):';
				for (var i in gamestack) {
						m = m + ' '+ gamestack[i];
				}

				if (locals!=null) {
						m = m + '\nLocals (decimal):';
						for (var i=0; i<16; i++) {
								m = m + ' ' + i + '=' + locals[i];
						}
				}

				if (debug_mode) {
						gnustoglue_output('\n\n--- Error ---:\n'+m);
				}

		} catch (e) {
				m = m + '(Some symbols not defined.)';
		}

		alert(m);

		if (n<500) throw -1;
}

var transcription_file = 0;

// Here we ask for a filename if |whether|, and we don't
// already have a filename. Returns 0 if transcription
// shouldn't go ahead (e.g. the user cancelled.)
function gnustoglue_notify_transcription(whether) {

		if (whether) {
				if (!transcription_file) {
						var target_filename = '/tmp/TRANSCRIPT'; // fixme

						transcription_file = new Components.Constructor("@mozilla.org/network/file-output-stream;1","nsIFileOutputStream","init")(new Components.Constructor("@mozilla.org/file/local;1","nsILocalFile","initWithPath")(target_filename), 0xA, 0600, 0);

						if (!transcription_file) {
								return 0;
						} else {
								return 1;
						}
				}
		}
		return 1;
}

function gnustoglue_transcribe(text) {
		/* if (current_window==0) {*/
				if (!transcription_file) {
						if (!gnustoglue_notify_transcription(1)) {
								gnusto_error(308);
						}
				}
				transcription_file.write(text, text.length);
				transcription_file.flush();
				/*						}*/
}

function gnustoglue_input_stream(number) {
		// FIXME: dummy function. See bug 3470.
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

function gnustoglue_check_unicode(code) {
		// Return that we can read and write all characters.
		// This is almost certainly untrue, but we need to test it
		// a lot more before we know for certain which we do or don't support.
		// This will do for now.
		return 3;
}

function gnustoglue_print_unicode(code) {
		gnustoglue_output(String.fromCharCode(code));
}

////////////////////////////////////////////////////////////////
MOZILLA_GLUE_HAPPY = 1;
////////////////////////////////////////////////////////////////
