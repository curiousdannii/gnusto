// mozilla-glue.js || -*- Mode: Java; tab-width: 2; -*-
// Interface between gnusto-lib.js and Mozilla. Needs some tidying.
// $Header: /cvs/gnusto/src/gnusto/content/mozilla-glue.js,v 1.98 2003/07/21 16:41:35 marnanel Exp $
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

// Dictionary of Gnusto errors which should be ignored.
// The keys are the error numbers; the values are ignored.
// You *can* make the system ignore fatal errors this way, but
// the results (both for Gnusto and the story) are undefined.
var ignore_errors = {
		706: 1, // Work around a bug in Library 15/2 (see bug 3314)
   };

var ignore_transient_errors = false;

// The reason that command_exec stopped last time. This is
// global because other parts of the program might want to know--
// for example, to disable input boxes.
var glue__reason_for_stopping = GNUSTO_EFFECT_WIMP_OUT; // safe default

// Answer to glue__reason_for_stopping, which will be supplied to
// Felapton next pass.
var glue__answer_for_next_run = 0;

// The maximum number of characters that the input buffer can currently
// accept.
var glue__input_buffer_max_chars = 255;

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

		win_chalk(current_window, text);

		if (glue__transcription_file && current_window==0) {
				if (!glue__transcription_file) {
						if (!glue__set_transcription(1)) {
								// bah, couldn't create the file;
								// clear the bit
								zSetByte(zGetByte(0x11) & ~0x1);
						}
				}
				glue__transcription_file.write(text, text.length);
				glue__transcription_file.flush();
		}
}

////////////////////////////////////////////////////////////////
//
// glue_effect_code
//
// Returns the reason the Z-machine engine (Felapton) stopped
// last time. This may require answering with glue_set_answer()
// before the next call to command_exec().

function glue_effect_code() {
		return glue__reason_for_stopping;
}

////////////////////////////////////////////////////////////////
//
// glue_set_answer
//
// Supplies the answer to the most recent effect code.

function glue_set_answer(answer) {
		glue__answer_for_next_run = answer;
}

////////////////////////////////////////////////////////////////
// [MOVE TO DATISI/DARII]
//
// command_exec
//
// Command which calls the Z-machine engine (Felapton).
// Felapton is designed so that we can call it and it'll only
// return when it needs our help. The reason it returned is
// encoded in an "effect code", which can be discovered by
// calling glue_effect_code(). Many effect codes are requests
// for information, which must be supplied to the next call
// to Felapton by calling glue_set_answer() before calling
// this function.

function command_exec(args) {

		// If we stopped on a breakpoint last time, fix it up.
		if (glue__reason_for_stopping == GNUSTO_EFFECT_BREAKPOINT && breakpoints[pc]) {
				breakpoints[pc]=2; // So it won't trigger immediately we run.
		}

		var looping;
		do {
				looping = 0;

				glue__reason_for_stopping = engine_run(glue__answer_for_next_run);

				// burin('effect', glue__reason_for_stopping.toString(16));

				glue_print(engine_console_text());

				switch (glue__reason_for_stopping) {

				case GNUSTO_EFFECT_WIMP_OUT:
						if (!single_step) looping = 1; // Well, just go round again.
						break;

				case GNUSTO_EFFECT_FLAGS_CHANGED:
						var flags = zGetByte(0x11);
						
						if (!glue__set_transcription(flags & 1)) {
								// they cancelled the dialogue:
								// clear the bit
								zSetByte(zGetByte(0x11) & ~0x1);
						}

						win_force_monospace(flags & 2);

						if (!single_step) looping = 1;
						break;

				case GNUSTO_EFFECT_INPUT_CHAR:
						// we know how to do this.
						// Just bail out of here.
						win_relax();
						break;

				case GNUSTO_EFFECT_INPUT:
						win_relax();
						var eep = engine_effect_parameters();
						glue__input_buffer_max_chars = eep.maxchars;
						win_set_input([win_recaps(eep.recaps), '']);
						break;

				case GNUSTO_EFFECT_SAVE:
						// nope
						alert("Saving of games isn't implemented yet.");
						looping = 1;
						break;

				case GNUSTO_EFFECT_RESTORE:
						// nope here, too
						alert("Loading saved games isn't implemented yet.");
						looping = 1;
						break;

				case GNUSTO_EFFECT_QUIT:
						win_relax();
						win_show_status("Game over.");
						break;
						
				case GNUSTO_EFFECT_RESTART:
						win_relax();
						start_up();
						var content = load_from_file(local_game_file);
						var result = dealWith(content);				
						break;

				case GNUSTO_EFFECT_VERIFY:
						glue_set_answer(glue__verify());
						looping = 1;
						break;

				case GNUSTO_EFFECT_PIRACY:
						// "Interpreters are asked to be gullible and
						// to unconditionally branch."
						//
						// One day, we should perhaps have a preference
						// that the user can set to influence the result.
						looping = 1;
						break;

				case GNUSTO_EFFECT_BREAKPOINT:
						// Ooh, a breakpoint! Lovely!
						tossio_notify_breakpoint_hit();
						break;

				case GNUSTO_EFFECT_STYLE:
						var eep = engine_effect_parameters();
						win_set_text_style(eep[0], eep[1], eep[2]);
						looping = 1;
						break;

				case GNUSTO_EFFECT_SOUND:
						var eep = engine_effect_parameters();
						glue__sound_effect(eep[0], eep[1], eep[2], eep[3], eep[4]);
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
								
								eep = engine_effect_parameters();
								win_gotoxy(current_window, eep[1]-1, eep[0]-1);
						}
						
						looping = 1;
						break;
						
				case GNUSTO_EFFECT_GETCURSOR:
				                //bocardo__current_x and y are 0-based, but it's expecting 1-based, so add 1
						zSetWord(bocardo__current_y[current_window]+1,a[0]);
						zSetWord(bocardo__current_x[current_window]+1,a[0]+2); //shift by 2 bytes for 2nd word
						
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
//
// glue__verify
//
// Returns true iff the memory verifies correctly for @verify
// in the original file of this game (that is, if all bytes
// after the header total to the checksum given in the header).
// Returns false if anything stops us finding out (like the
// original file having been deleted). We use the value
// in the orignal file's header for comparison, not the one in
// the current header.
function glue__verify() {
		
		var localfile = new Components.
				Constructor("@mozilla.org/file/local;1",
										"nsILocalFile",
										"initWithPath")(sys_current_filename());

		if (!localfile.exists())
				return 0;

		var original_content = load_from_file(localfile);

		if (!original_content)
				// Can't get the file, so we can't say for sure,
				// so say no.
				return 0;

		var total = 0;
		
		for (var i=0x40; i<original_content.length; i++)
				total += original_content[i];

		// FIXME: Why isn't there a constant somewhere
		// for the header word address?

		return (total & 0xFFFF) == 
				(original_content[0x1c]<<8 | original_content[0x1d]);
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

		zSetByte(height_in_chars,                    0x20); // screen h, chars
		zSetByte(width_in_chars,                     0x21); // screen w, chars
		zSetWord(width_in_chars *font_dimensions[0], 0x22); // screen w, units
		zSetWord(height_in_chars*font_dimensions[1], 0x24); // screen h, units
		zSetByte(font_dimensions[0],                 0x26); // font w, units
		zSetByte(font_dimensions[1],                 0x27); // font h, units

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

function glue_play(memory) {

                engine_start_game(memory);
		win_start_game();
		barbara_start_game();
		bocardo_start_game();
                win_clear(-1);

		if (!single_step) {
				dispatch('exec');
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

						// Carriage return. So we've got a line of input.

						var result = current[0]+current[1];

						// We previously replaced alternate spaces with
						// &nbsp;s so that Gecko wouldn't collapse them.
						// Now we must put them back.
						result = result.replace('\u00A0', ' ', 'g');

						win_destroy_input();

						glue_print(result+'\n');
						glue_set_answer(result);
						dispatch('exec');

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

						if (code>=32 && code<=126) {
								// Regular ASCII; just pass it straight through
								glue_set_answer(code); dispatch('exec');
						}

				}	else {
						switch (e.keyCode) {

								// Arrow keys
						case  37 : glue_set_answer(131); dispatch('exec'); break;
						case  38 : glue_set_answer(129); dispatch('exec'); break;
						case  39 : glue_set_answer(132); dispatch('exec'); break;
						case  40 : glue_set_answer(130); dispatch('exec'); break;

								// Function keys
								// Note: WinFrotz requires the user to
								// press Ctrl-F<n>, so that F<n> can
								// be used for their usual Windows functions
								// (in particular, so that F1 can still
								// invoke help).
						case 112 : glue_set_answer(133); dispatch('exec'); break;
						case 113 : glue_set_answer(134); dispatch('exec'); break;
						case 114 : glue_set_answer(135); dispatch('exec'); break;
						case 115 : glue_set_answer(136); dispatch('exec'); break;
						case 116 : glue_set_answer(137); dispatch('exec'); break;
						case 117 : glue_set_answer(138); dispatch('exec'); break;
						case 118 : glue_set_answer(139); dispatch('exec'); break;
						case 119 : glue_set_answer(140); dispatch('exec'); break;
						case 120 : glue_set_answer(141); dispatch('exec'); break;
						case 121 : glue_set_answer(142); dispatch('exec'); break;

								// delete / backspace
						case  46 : glue_set_answer(8); dispatch('exec'); break;
						case   8 : glue_set_answer(8); dispatch('exec'); break;

								// newline / return
						case  10 : glue_set_answer(13); dispatch('exec'); break;
						case  13 : glue_set_answer(13); dispatch('exec'); break;

								// escape
						case  27 : glue_set_answer(27); dispatch('exec'); break;
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

		var loop_count = 0;
		var loop_max = 100;

		while (procs!=null && loop_count<loop_max) {
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
				loop_count++;
		}

		if (loop_count==loop_max) {
				procstring = '...' + procstring;
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

		var flags = zGetByte(0x11);

		if (flags & 1) {

				// Transcription's on; turn it off.

				alert('Turning transcription off now.');
				zSetByte(flags & ~0x1, 0x11);
				glue__set_transcription(0);

		} else {

				if (glue__transcription_filename) {
						alert('Turning transcription on again.');
				}

				zSetByte(flags | 0x1, 0x11);
				glue__set_transcription(1);
		}
}

////////////////////////////////////////////////////////////////
MOZILLA_GLUE_HAPPY = 1;
////////////////////////////////////////////////////////////////
