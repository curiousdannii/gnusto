// mozilla-glue.js || -*- Mode: Java; tab-width: 2; -*-
// Interface between gnusto-lib.js and Mozilla. Needs some tidying.
// $Header: /cvs/gnusto/src/gnusto/content/mozilla-glue.js,v 1.82 2003/05/26 23:50:14 marnanel Exp $
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

var current_window = 0;

// Array of contents of a .z5 file, one byte per element.
var zbytes = [];

// Dictionary of Gnusto errors which should be ignored.
// The keys are the error numbers; the values are ignored.
// You *can* make the system ignore fatal errors this way, but
// the results (both for Gnusto and the story) are undefined.
var ignore_errors = {
		706: 1, // Work around a bug in Library 15/2 (see bug 3314)
   };

var ignore_transient_errors = false;
// The reason that go_wrapper stopped last time. This is
// global because other parts of the program might want to know--
// for example, to disable input boxes.
var glue__reason_for_stopping = GNUSTO_EFFECT_WIMP_OUT; // safe default

// The maximum number of characters that the input buffer can currently
// accept.
var glue__input_buffer_max_chars = 255;

////////////////////////////////////////////////////////////////

function glue_receive_zcode(content) { zbytes = content; }
function getbyte(address) { return zbytes[address]; }
function setbyte(value, address) { zbytes[address] = value; }

function getword(addr) {
		return unsigned2signed(get_unsigned_word(addr));
}

function unsigned2signed(value) {
		return ((value & 0x8000)?~0xFFFF:0)|value;
}

function signed2unsigned(value) {
		return value & 0xFFFF;
}

function get_unsigned_word(addr) {
		return getbyte(addr)*256+getbyte(addr+1);
}

function setword(value, addr) {
		setbyte((value>>8) & 0xFF, addr);
		setbyte((value) & 0xFF, addr+1);
}

////////////////////////////////////////////////////////////////

// Goes "beep".
function glue__beep() {
		var sound = new Components.Constructor("@mozilla.org/sound;1","nsISound")();
		sound.beep();
}

// Invokes a sound effect from the current game file.
// (Actually, it just bleeps at the moment.)
function glue__sound_effect(number, effect, volume, callback) {
		glue__beep();
}

// Outputs to the screen, and the transcription file if necessary.
function glue_print(text) {

		burin('output', text);

		win_chalk(current_window, text);

		if (glue__transcription_file && current_window==0) {
				if (!glue__transcription_file) {
						if (!glue__set_transcription(1)) {
								// bah, couldn't create the file;
								// clear the bit
								setbyte(getbyte(0x11) & ~0x1);
						}
				}
				glue__transcription_file.write(text, text.length);
				glue__transcription_file.flush();
		}
}

function go_wrapper(answer) {

    var looping;
		var p; // variable to hold parameters temporarily below

		// If we stopped on a breakpoint last time, fix it up.
		if (glue__reason_for_stopping == GNUSTO_EFFECT_BREAKPOINT && breakpoints[pc]) {
				breakpoints[pc]=2; // So it won't trigger immediately we run.
		}
	
    do {
				looping = 0; // By default, we stop.

				glue__reason_for_stopping = go(answer);

				burin('effect', glue__reason_for_stopping.toString(16));

				glue_print(engine_console_text());

				switch (glue__reason_for_stopping) {

				case GNUSTO_EFFECT_WIMP_OUT:
						if (!single_step) {
								// Well, just go round again.
								answer = 0;
								looping = 1;
						}
						break;

				case GNUSTO_EFFECT_FLAGS_CHANGED:
						var flags = getbyte(0x11);

						if (!glue__set_transcription(flags & 1)) {
								// they cancelled the dialogue:
								// clear the bit
								setbyte(getbyte(0x11) & ~0x1);
						}

						win_force_monospace(flags & 2);

						if (!single_step) {
								answer = 0;
								looping = 1;
						}
						break;

				case GNUSTO_EFFECT_INPUT_CHAR:
						// we know how to do this.
						// Just bail out of here.
						win_relax();
						break;

				case GNUSTO_EFFECT_INPUT:
						win_relax();
						var eep = engine_effect_parameters();
						for (var i in engine__effect_parameters) burin('geep '+i,engine__effect_parameters[i]);
						glue__input_buffer_max_chars = eep.maxchars;
						win_set_input([win_recaps(eep.recaps), '']);
						break;

				case GNUSTO_EFFECT_SAVE:
						// nope
						alert("Saving of games isn't implemented yet.");
						answer = 0;
						looping = 1;
            break;

				case GNUSTO_EFFECT_RESTORE:
						// nope here, too
						alert("Loading saved games isn't implemented yet.");
						answer = 0;
						looping = 1;
            break;

				case GNUSTO_EFFECT_QUIT:
						win_relax();
						win_show_status("Game over.");
            break;

				case GNUSTO_EFFECT_PIRACY:
						// "Interpreters are asked to be gullible and
						// to unconditionally branch."
						//
						// One day, we should perhaps have a preference
						// that the user can set to influence the result.
						answer = 0;
						looping = 1;
            break;

				case GNUSTO_EFFECT_VERIFY:
						// FIXME: Here we should verify the game.
						// There are many more important things to fix first,
						// though. So let's just say "yes" for now.

						alert("Warning: Verification is not yet implemented. We'll pretend it all worked out anyway.");
						answer = 1;
						looping = 1;
            break;

				case GNUSTO_EFFECT_BREAKPOINT:
						// Ooh, a breakpoint! Lovely!
						looping = 0;
						tossio_notify_breakpoint_hit();
						break;

        case GNUSTO_EFFECT_STYLE:
						p = engine_effect_parameters();
						win_set_text_style(p[0], p[1], p[2]);
						looping = 1;
						break;

        case GNUSTO_EFFECT_SOUND:
						p = engine_effect_parameters();
						glue__sound_effect(p[0], p[1], p[2], p[3], p[4]);
						looping = 1;
						break;

        case GNUSTO_EFFECT_SPLITWINDOW:
						win_set_top_window_size(engine_effect_parameters());
						looping = 1;
						break;

        case GNUSTO_EFFECT_SETWINDOW:
						current_window = engine_effect_parameters();

						// reset the css style variable to reflect the current
						// state of text in the new window
						win_set_text_style(-1, 0, 0);

						if (current_window!=0 && current_window!=1)
								gnusto_error(303, current_window);

						looping = 1;
						break;

        case GNUSTO_EFFECT_ERASEWINDOW:
						win_clear(engine_effect_parameters());
						looping = 1;
						break;

        case GNUSTO_EFFECT_ERASELINE:
						// FIXME: this appears to be unimplemented!
						gnusto_error(101);

						looping = 1;
						break;

        case GNUSTO_EFFECT_SETCURSOR:

						// FIXME: this looks prehistoric
						if (current_window==1) {

								// @set_cursor has no effect on the lower window.

								p = engine_effect_parameters();
								win_gotoxy(current_window, p[1]-1, p[0]-1);
						}

						looping = 1;
						break;

        case GNUSTO_EFFECT_SETBUFFERMODE:
						// We should really do something with this to make
						// the printing prettier, but we haven't yet.
						looping = 1;
						break;

        case GNUSTO_EFFECT_SETINPUTSTREAM:
						// FIXME: stub at present. See bug 3470.
						looping = 1;
						break;

        case GNUSTO_EFFECT_PRINTTABLE:
						win_print_table(current_window,
														engine_effect_parameters());
						looping = 1;
						break;

				default:
						// give up: it's nothing we know
						gnusto_error(304, "0x"+glue__reason_for_stopping.toString(16));
				}
    } while (looping);

		if (debug_mode) {
				tossio_debug_instruction(['status']);
		}
}

////////////////////////////////////////////////////////////////

function camenesbounce_catch(e) {
		eval(e.target.toString().substring(13));
}

////////////////////////////////////////////////////////////////
// Burin functions

function burin(d1,d2) { }
var glue__burin_filename = 0;

function glue__burin_to_file(area, text) {

    // ..........|1234567890:|
		var spaces = '          :';

		if (!area) area = '';
		if (!text) text = '';

		var message = area.toString() + spaces.substring(area.length);

		text = '['+text.toString().replace(String.fromCharCode(10),
																			 '~','g')+']';

		var first = 1;
		while (text!='') {

				if (first) {
						first = 0;
				} else {
						message = message + spaces;
				}

				message = message + text.substring(0, 68) + '\n';
				text = text.substring(68);
		}
		

		var f = new Components.
				Constructor("@mozilla.org/network/file-output-stream;1",
										"nsIFileOutputStream",
										"init")
				(new Components.
				 Constructor("@mozilla.org/file/local;1",
										 "nsILocalFile",
										 "initWithPath")(glue__burin_filename),
				 0x1A,
				 0644,
				 0);

		f.write(message, message.length);
		f.close();
}

function glue__init_burin() {
		var target = getMsg('burin.filename');

		if (target.toLowerCase()!='off') {
				glue__burin_filename = target;
				burin = glue__burin_to_file; 
    }
}

////////////////////////////////////////////////////////////////

function glue_init() {
		document.onkeypress=gotInput;

		glue__init_burin();

		window.addEventListener('camenesbounce',
														camenesbounce_catch,	0);
}

////////////////////////////////////////////////////////////////

// Writes the screen height and width (in characters) out to
// the story header.
function glue_store_screen_size(width_in_chars,
																height_in_chars) {

		// Screen minima (s8.4): 60x14.

		if (width_in_chars<60) width_in_chars=60;
		if (height_in_chars<14) height_in_chars=14;

		// Maxima: we can't have a screen > 255 in either direction
		// (which is really possible these days).

		if (width_in_chars>255) width_in_chars=255;
		if (height_in_chars>255) height_in_chars=255;

		var font_dimensions = bocardo_get_font_metrics();

		setbyte(height_in_chars,                    0x20); // screen h, chars
		setbyte(width_in_chars,                     0x21); // screen w, chars
		setword(width_in_chars *font_dimensions[0], 0x22); // screen w, units
		setword(height_in_chars*font_dimensions[1], 0x24); // screen h, units
		setbyte(font_dimensions[0],                 0x26); // font w, units
		setbyte(font_dimensions[1],                 0x27); // font h, units

}

////////////////////////////////////////////////////////////////

// Calls the various *_init() functions.
function start_up() {

		glue_init();
		bocardo_init();
		win_init();
		baf_init();
		sys_init();

}

function play() {
		win_start_game();
    setup();

		if (!single_step) {
				go_wrapper(0);
		}
}

function gotInput(e) {

		if (win_waiting_for_more()) {

				if (e.keyCode==0) {
						// Any ordinary character is OK for us to scroll.
						win_show_more();
				}

				return false;
		}

		if (glue__reason_for_stopping==GNUSTO_EFFECT_INPUT) {

				var current = win_get_input();

				if (e.keyCode==13) {

						var result = current[0]+current[1];

						burin('input', result);

						result = result.replace('\u00A0', ' ');

						win_destroy_input();
						bocardo_collapse();
						glue_print(result+'\n');
						go_wrapper(result);

				} else if (e.keyCode==0) {

						// Just an ordinary character. Insert it.

						if ((current[0].length + current[1].length) <
								glue__input_buffer_max_chars) {

								if (e.charCode==32) {
										// Special case for space: use a non-breaking space.
										current[0] = current[0] + '\u00A0';
								} else {
										current[0] = current[0] + String.fromCharCode(e.charCode);
								}
								win_set_input(current);

						} else glue__beep();

				} else if (e.keyCode==8) {
						// backspace
						if (current[0].length>0) {
								current[0] = current[0].substring(0, current[0].length-1);
						} else glue__beep();
						win_set_input(current);

				} else if (e.keyCode==37) {
						// cursor left
						if (current[0].length>0) {
								current[1] = current[0].substring(current[0].length-1)+current[1];
								current[0] = current[0].substring(0, current[0].length-1);
						} else glue__beep();
						win_set_input(current);

				} else if (e.keyCode==39) {
						// cursor right
						if (current[1].length>0) {
								current[0] = current[0]+current[1].substring(0, 1);
								current[1] = current[1].substring(1);
						} else glue__beep();
						win_set_input(current);

				} else if (e.keyCode==46) {
						// delete (to the right)
						if (current[1].length>0) {
								current[1] = current[1].substring(1);
						} else glue__beep();
						win_set_input(current);

				}

				return false;

		} else if (glue__reason_for_stopping==GNUSTO_EFFECT_INPUT_CHAR) {

				if (e.keyCode==0) {
						var code = e.charCode;

						if (code>=32 && code<=126)
								// Regular ASCII; just pass it straight through
								go_wrapper(code);

				}	else {

						bocardo_collapse();

						switch (e.keyCode) {

								// Arrow keys
						case  37 : go_wrapper(131); break;
						case  38 : go_wrapper(129); break;
						case  39 : go_wrapper(132); break;
						case  40 : go_wrapper(130); break;

								// Function keys
								// Note: WinFrotz requires the user to
								// press Ctrl-F<n>, so that F<n> can
								// be used for their usual Windows functions
								// (in particular, so that F1 can still
								// invoke help).
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
						}
				}

				return false;
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
						glue_print('\n\n--- Error ---:\n'+m);
				}

		} catch (e) {
				m = m + '(Some symbols not defined.)';
		}
		
		if (!ignore_transient_errors) {
                  window.openDialog("chrome://gnusto/content/errorDialog.xul", "Error", "modal,centerscreen,chrome,resizable=no", m, n);               
                }

		if (n<500) throw -1;
}

var glue__transcription_file = 0;
var glue__transcription_filename = 0;

// Here we ask for a filename if |whether|, and we don't
// already have a filename. Returns 0 if transcription
// shouldn't go ahead (e.g. the user cancelled.)
function glue__set_transcription(whether) {

		if (whether) {
				if (!glue__transcription_file) {

						if (!glue__transcription_filename) {
								var ifp = Components.interfaces.nsIFilePicker;
								var picker = Components.classes["@mozilla.org/filepicker;1"].
										createInstance(ifp);

								picker.init(window, "Create a transcript", ifp.modeSave);
								picker.appendFilter("Transcripts", "*.txt");
								
								if (picker.show()==ifp.returnOK) {
								
										glue__transcription_filename = picker.file.path;
										glue__transcription_filename = glue__transcription_filename.replace('\\','\\\\', 'g');
										
								} else {
										return 0;
								}
						}

						// permissions (gleaned from prio.h)
						var APPEND_CREATE_AND_WRITE_ONLY = 0x1A;
						var PERMISSIONS = 0600;

						glue__transcription_file =
								new Components.
										Constructor("@mozilla.org/network/file-output-stream;1",
																"nsIFileOutputStream",
																"init")
										(new Components.
												Constructor("@mozilla.org/file/local;1",
																		"nsILocalFile",
																		"initWithPath")
												(glue__transcription_filename),
										 APPEND_CREATE_AND_WRITE_ONLY,
										 PERMISSIONS,
										 0);

						if (!glue__transcription_file) {
								return 0;
						} else {
								return 1;
						}
				}

		} else {

				if (glue__transcription_file) {
						glue__transcription_file.close();
						glue__transcription_file = 0;
				}
		}

		return 1;
}

function command_transcript() {

    var menuItem = document.getElementById("transcript");

		var flags = getbyte(0x11);

		if (flags & 1) {

				// Transcription's on; turn it off.

				alert('Turning transcription off now.');
				setbyte(flags & ~0x1, 0x11);
				glue__set_transcription(0);

		} else {

				if (glue__transcription_filename) {
						alert('Turning transcription on again.');
				}

				setbyte(flags | 0x1, 0x11);
				glue__set_transcription(1);
		}
}

////////////////////////////////////////////////////////////////
MOZILLA_GLUE_HAPPY = 1;
////////////////////////////////////////////////////////////////
