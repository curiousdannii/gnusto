// baroco.js || -*- Mode: Java; tab-width: 2; -*-
// Screen handler.
//
// $Header: /cvs/gnusto/src/gnusto/content/baroco.js,v 1.2 2003/04/27 20:58:54 marnanel Exp $
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

// Perhaps we might want to let people use Bocardo throughout--
// I'm not sure, really.
var baroco__enable_barbara = true;

////////////////////////////////////////////////////////////////

// Called on startup.
function win_init() {
		// Does nothing at present.
}

////////////////////////////////////////////////////////////////

function win_start_game() {

		barbara_start_game();
		bocardo_start_game();

}

////////////////////////////////////////////////////////////////

function win_resize() {

		// empty for now.
		// Possibly not needed at all; Bocardo can do this
		// all on its own.

}

////////////////////////////////////////////////////////////////

function win_reset_scroll_count() {
		bocardo_reset_scroll_count();
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

// Clears a window. |win| must be a valid window ID.
function win_clear(win) {
		bocardo_clear(win);
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

function win_set_text_style(win, style, foreground, background) {
		bocardo_set_text_style(win, style, foreground, background);
}

////////////////////////////////////////////////////////////////
var BAROCO_HAPPY = 1;
////////////////////////////////////////////////////////////////
