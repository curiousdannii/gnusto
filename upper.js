// gnusto-lib.js || -*- Mode: Java; tab-width: 2; -*-
// upper.js -- upper window handler.
//
// $Header: /cvs/gnusto/src/gnusto/content/upper.js,v 1.16 2003/04/05 10:53:58 marnanel Exp $
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
var UPPER_HAPPY = 0;
////////////////////////////////////////////////////////////////

var win__screen_doc = 0;
var win__screen_window = 0;
var win__current_x = [];
var win__current_y = [];
var win__top_window_height = 0;

var win__screen_width = 80; //  a good default size
var win__screen_height = 25; // a good default size

////////////////////////////////////////////////////////////////

function win_setup(width, height) {
    win__screen_doc = frames[0].document;

    win__screen_window = win__screen_doc.getElementById('text');

    win__current_x[0] = win__current_y[0] = 0;
    win__current_x[1] = win__current_y[1] = 0;

		win__screen_width = width;
		win__screen_height = height;

		win_set_top_window_size(0);
}

////////////////////////////////////////////////////////////////

function win_chalk(win, style, text) {

    // This function is written in terms of win__subchalk(). All *we*
    // have to do is split up |text| so that it never goes
    // over the edge of the screen, and break at newlines.

    text = text.toString().split('\n');

    for (var line in text) {

				var message = text[line];

				do {

						if (message.length > (win__screen_width - win__current_x[win])) {
								
								// The message is longer than the rest of this line.

								var amount = win__screen_width - win__current_x[win];
								
								// Fairly pathetic wordwrap. FIXME: replace later
								// with a better dynamic programming algorithm.

								while (amount!=0 && message[amount]!=' ') {
										amount--;
								}
					
								if (amount==0) {
										// ah, whatever, just put it back and forget the
										// wordwrap.
										amount = win__screen_width - win__current_x[win];
								}

								win__subchalk(win, style, message.substring(0, amount));
								
								win__current_x[win] = 0;
								win__current_y[win]++;
								message = message.substring(amount+1);
						} else {
								
								// The message is shorter.

								win__subchalk(win, style, message);
								win__current_x[win] += message.length;
								message = '';
						}
				} while (message!='');

				if (line<text.length-1) {
						win__current_x[win] = 0;

						// Now move to the next line. What that means depends on
						// which window we're on.

						win__current_y[win]++;

						if (win==0) {
								// We hit the bottom of the lower window.
								// Try for a scroll.
								
								while (win__current_y[0]>=win__screen_height) {
										win__screen_window.removeChild(win__screen_window.childNodes[win__top_window_height]);
										win__current_y[win]--; // Get back onto the screen
								}

						} else if (win==1 && win__current_y[1]==win__top_window_height) {
								// We hit the bottom of the top window.
								// The z-spec leaves the behaviour undefined, but suggests
								// that we leave the cursor where it is. Frotz's behaviour
								// is more easy to mimic: it simply wraps back to the top.

								win_current_y[1] = 0;
						}
				}
    }
}

////////////////////////////////////////////////////////////////

function win_gotoxy(win, x, y) {
		win__current_x[win] = x;
		win__current_y[win] = y;
}

////////////////////////////////////////////////////////////////

function win_set_top_window_size(lines) {
		win__top_window_height = lines;
		win_gotoxy(1, 0, 0);
}

////////////////////////////////////////////////////////////////

// Clears a window. |win| must be a valid window ID.
function win_clear(win) {
		while (win__screen_window.childNodes.length!=0) {
				win__screen_window.removeChild(win__screen_window.childNodes[0]);
		}

		win__current_x[win] = 0;
		win__current_y[win] = 0;
}

////////////////////////////////////////////////////////////////

// Prints an array of strings, |lines|, on window |win| in
// style |style|. The first line will be printed at the current
// cursor position, and each subsequent line will be printed
// at the point immediately below the previous one. This function
// leaves the cursor where it started.

function win_print_table(win, style, lines) {

		var temp_x = win__current_x[win];
		var temp_y = win__current_y[win];

		for (i=0; i<lines.length; i++) {
				win__current_x[win] = temp_x;
				win__current_y[win] = (temp_y+i) % win__screen_height;

				if (lines[i].length + temp_x > win__screen_width) {
						lines[i] = lines[i].substring(win__screen_width-temp_x);
				}

				win_chalk(win, style, lines[i]);
		}

		win__current_x[win] = temp_x;
		win__current_y[win] = temp_y;
}

////////////////////////////////////////////////////////////////
//
//                      Private functions
//
////////////////////////////////////////////////////////////////

function win__subchalk(win, style, text) {

		var x = win__current_x[win];
		var y = win__current_y[win];

    // Let's get a handle on the line we want to modify.

    var lines = win__screen_window.childNodes;

    // If the line doesn't yet exist, we must create it.
    // FIXME: possibly this will become redundant when we handle
    // dynamic screen resizing.
    while (lines.length <= y) {
				win__screen_window.appendChild(win__screen_doc.createElement('div'));
    }

    // We delete any bits of that line we're going to overwrite,
		// and work out where to insert the new span. The line consists of a
		// number of spans plus a carriage return (which we should ignore).
    var current_line = lines[y];

		var spans = current_line.childNodes;

		var charactersSeen = 0;
		var cursor = 0;

		// Go past all the spans before us.

		while (cursor<spans.length && charactersSeen+spans[cursor].childNodes[0].data.length <= x) {
				charactersSeen += spans[cursor].childNodes[0].data.length;
				cursor++;
		} 

		// |cursor| is now either pointing at the point where we want to
		// write the current span, or at the span which contains that
		// point. In the latter case, we must break it.

		var charactersTrimmed = 0;
		var doppelganger = 0;
		var appendPoint = -1;

		if (cursor==spans.length) {

				if (charactersSeen < x) {
						// There aren't enough characters to go round. We
						// must add extra spaces to the start of the text.

						var padding = '';

						for (var i=0; i<(x-charactersSeen); i++) {
								padding = padding + ' ';
						}

						doppelganger = win__screen_doc.createElement('span');
						doppelganger.appendChild(win__screen_doc.createTextNode(padding));
				}

				// Just append the text.

		} else {
				if (charactersSeen < x) {

						// We've seen fewer characters than we were expecting, so the
						// last span is over-long: we must trim it.

						var amountToKeep = x - charactersSeen;

						if (text.length < spans[cursor].childNodes[0].data.length-amountToKeep) {
								// The whole of the new text fits within this node. Let's keep this
								// node before the new text, and create another node to go after it.
								doppelganger = spans[cursor].cloneNode(1);
								doppelganger.childNodes[0].data = doppelganger.childNodes[0].data.substring(amountToKeep+text.length);
						}

						charactersTrimmed = spans[cursor].childNodes[0].data.length - amountToKeep;

						spans[cursor].childNodes[0].data = spans[cursor].childNodes[0].data.substring(0, amountToKeep);

						// And push them on one place; they insert *after* us.
						cursor++;
				}

				appendPoint = cursor;

				if (cursor<spans.length) {
						// Delete any spans which are hidden by our span.
						var charactersDeleted = charactersTrimmed;
						var spansToDelete = 0;

						while (cursor<spans.length && charactersDeleted+spans[cursor].childNodes[0].data.length <= text.length) {
								charactersDeleted += spans[cursor].childNodes[0].data.length;
								cursor++;
								spansToDelete++;
						}

						// And trim the RHS of the first span after our new span.
						if (cursor<spans.length) {
								spans[cursor].childNodes[0].data = spans[cursor].childNodes[0].data.substring(text.length - charactersDeleted);
						}
				}

				// Now we've finished looking at the line, we can start modifying it.

				// Delete the spans which are underneath our text...
				for (var i=appendPoint; i<appendPoint+spansToDelete; i++) {
						current_line.removeChild(spans[appendPoint]); // the others will slide up.
				}

		}

		// ...add the broken span, if there was one...
		if (doppelganger) {
				current_line.insertBefore(doppelganger, spans[cursor]);
		}

		// ..and append our text.
		var newSpan = win__screen_doc.createElement('span');
		newSpan.setAttribute('style', style);
		newSpan.appendChild(win__screen_doc.createTextNode(text));

		if (appendPoint == -1) {
				current_line.appendChild(newSpan);
		} else {
				current_line.insertBefore(newSpan, spans[appendPoint]);
		}
}

////////////////////////////////////////////////////////////////
UPPER_HAPPY = 1;
////////////////////////////////////////////////////////////////
