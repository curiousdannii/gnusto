// baroco.js || -*- Mode: Java; tab-width: 2; -*-
// Screen handler.
//
// $Header: /cvs/gnusto/src/gnusto/content/baroco.js,v 1.11 2003/05/12 01:28:20 marnanel Exp $
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

// Note: This will, perhaps, one day support both:
//  1) the use of Bocardo for the upper screen and Barbara for the lower
//  2) the use of Bocardo for both
// The variable |baroco__enable_barbara| switches between these.
// At present, only 1) is supported, though.

var baroco__enable_barbara = true;

////////////////////////////////////////////////////////////////

// Called on startup.
function win_init() {
		barbara_init();
}

////////////////////////////////////////////////////////////////

function win_start_game() {

		barbara_start_game();
		bocardo_start_game();

		win_set_text_style(-1, 0, 0);

		win_resize();
		// Do that every time the size changes, actually.
		window.addEventListener('resize', win_resize, 0);
}

////////////////////////////////////////////////////////////////

var win__dimensions = null;

function win_get_dimensions() {
		return win__dimensions;
}

// This is called once at the start of play, and after that
// automatically called when the window resizes.
// (FIXME: We should handle exceptions ourselves, really, since we're
// called by events.)
function win_resize() {

		function reset_width_and_height_of(something, set_height) {
				var e = document.getElementById(something);
				e.setAttribute('width',  win__dimensions[0]);
				if (set_height) {
						e.setAttribute('height', win__dimensions[1]);
				}
		}

		var fudge = document.getElementById('statusbox').boxObject.height + 30;

		win__dimensions = [window.innerWidth,
											window.innerHeight-fudge,
											];
		document.title = win__dimensions[0]+'x'+win__dimensions[1];

		// Reset explicit widths and heights in the XUL

		reset_width_and_height_of('bocardobox', 1);
		reset_width_and_height_of('barbarabox', 1);
		reset_width_and_height_of('barbara',    0);

		// Write to the the story file to tell it the correct width
		// and height.

		var char_sizes = bocardo_get_font_metrics();
		var width_in_chars = Math.floor(win__dimensions[0]/char_sizes[0]);
		var height_in_chars = Math.floor(win__dimensions[1]/char_sizes[1]);

		bocardo_set_screen_size(width_in_chars, height_in_chars);
		glue_store_screen_size(width_in_chars, height_in_chars);

		// Re-scroll Barbara, as needed
		// FIXME: think how this pans out with [MORE]
		barbara_relax();
}

////////////////////////////////////////////////////////////////

function win_chalk(win, text) {
		if (win==0 && baroco__enable_barbara) {
				return barbara_chalk(text);
		} else {
				return bocardo_chalk(win, text);
		}
}

////////////////////////////////////////////////////////////////

function win_gotoxy(win, x, y) {

		return bocardo_gotoxy(win, x, y);

}

////////////////////////////////////////////////////////////////

function win_set_top_window_size(lines) {
		bocardo_set_top_window_size(lines);
}

////////////////////////////////////////////////////////////////

function win_set_input(textlist) {
		barbara_set_input(textlist);
}

////////////////////////////////////////////////////////////////

function win_get_input() {
		return barbara_get_input();
}

////////////////////////////////////////////////////////////////

function win_destroy_input() {
		return barbara_destroy_input();
}

////////////////////////////////////////////////////////////////

// Clears a window. |win| must be a valid window ID.
function win_clear(win) {

		if (win>=-2 && win<=1) {
				// valid parameters, so...

				if (win!=0) {
						// Clear upper window
						bocardo_clear(1);
				}

				if (win!=1) {
						// Clear lower window

						if (baroco__enable_barbara)
								barbara_clear();
						else
								bocardo_clear(0);
				}

				if (win==-1) {
						// And also unsplit.
						bocardo_set_top_window_size(0);
				}

		} else
				// Weird parameter.
				gnusto_error(303, w);

}

////////////////////////////////////////////////////////////////

// Prints an array of strings, |lines|, on window |win|.
// The first line will be printed at the current
// cursor position, and each subsequent line will be printed
// at the point immediately below the previous one. This function
// leaves the cursor where it started.

function win_print_table(win, lines) {

		// FIXME: not fully implemented

		bocardo_print_table(win, lines);
}

////////////////////////////////////////////////////////////////

function win_set_status_line(text) {
		document.getElementById('status').setAttribute('label', text);
}

////////////////////////////////////////////////////////////////

var baroco__current_style = 0;
var baroco__current_foreground = 1;
var baroco__current_background = 1;

// Set the current text style, foreground and background colours
// of a given window.
function win_set_text_style(style, foreground, background) {

		// List of CSS classes we want.
		var css = '';

		////////////////////////////////////////////////////////////////

		// Examine the parameters, and set the internal variables
		// which store the text style and colours of this window.
		//
		// The value -1 (for style) and 0 (for bg/fg) mean that we
		// shouldn't change the current value. Style also has the
		// particular oddity that it needs to be ORed with the
		// current style, except when it's zero (==roman text),
		// when it should set the current style to zero too.

		if (style==-1) // Don't change
				style = baroco__current_style;
		else if (style==0)
				baroco__current_style = 0;
		else {
				baroco__current_style |= style;
				style = baroco__current_style;
		}

		if (foreground==0) // Don't change
				foreground = baroco__current_foreground;
		else
				baroco__current_foreground = foreground;

		if (background==0) // Don't change
				background = baroco__current_background;
		else
				baroco__current_background = background;

		////////////////////////////////////////////////////////////////

		// Handle colours:

		var fg_code;
		var bg_code;

		if (foreground==1)
				fg_code = 'f';
		else
				fg_code = foreground.toString();

		if (background==1)
				bg_code = 'b';
		else
				bg_code = background.toString();

		// Handle styles:

		if (style & 0x1) // Reverse video.
				css = 'b' + fg_code + ' f' + bg_code;
		else
				css = 'f' + fg_code + ' b' + bg_code;

		if (style & 0x2) css = css + ' sb'; // bold
		if (style & 0x4) css = css + ' si'; // italic
		if (style & 0x8) css = css + ' sm'; // monospace

		////////////////////////////////////////////////////////

		// OK, now do something with it...

		barbara_set_text_style(css);
		bocardo_set_text_style(css);
}

////////////////////////////////////////////////////////////////

function win_relax() {
		if (baroco__enable_barbara) {
				barbara_relax();
		} else {
				bocardo_relax();
		}
}

////////////////////////////////////////////////////////////////

function win_show_more() {
		barbara_show_more();
}

////////////////////////////////////////////////////////////////

function win_waiting_for_more() {
		return barbara_waiting_for_more();
}

////////////////////////////////////////////////////////////////

function win_show_status(text) {
		document.getElementById('status').setAttribute('label', text);
}

////////////////////////////////////////////////////////////////
var BAROCO_HAPPY = 1;
////////////////////////////////////////////////////////////////
