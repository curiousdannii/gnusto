// gnusto-lib.js || -*- Mode: Java; tab-width: 2; -*-
// upper.js -- upper window handler.
//
// Currently doesn't allow for formatted text. Will do later.
// $Header: /cvs/gnusto/src/gnusto/content/upper.js,v 1.6 2003/03/30 06:19:53 marnanel Exp $
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

var window_documents = [];
var windows = [];
var window_current_x = [];
var window_current_y = [];

function window_setup() {
    window_documents[0] = frames[1].document;
    window_documents[1] = frames[0].document;

    windows[0] = window_documents[0].getElementById('text');
    windows[1] = window_documents[1].getElementById('text');

    window_current_x[0] = window_current_y[0] = 0;
    window_current_x[1] = window_current_y[1] = 0;
}

////////////////////////////////////////////////////////////////

function chalk(win, fg, bg, style, text) {

    // This function is written in terms of subchalk(). All *we*
    // have to do is split up |text| so that it never goes
    // over the edge of the screen, and break at newlines.

    // FIXME: We need some way of figuring out the font size,
    // especially relative to the screen width and height.
    // For now, we'll assume the screen is 80 characters wide.

    text = text.toString().split('\n');

    for (var line in text) {

				var message = text[line];

				while (message!='') {

						if (message.length > (80 - window_current_x[win])) {
								
								// The message is longer than the rest of this line.

								var amount = 80 - window_current_x[win];
								
								// Fairly pathetic wordwrap. FIXME: replace later
								// with a better dynamic programming algorithm.

								while (amount!=0 && message[amount]!=' ') {
										amount--;
								}
					
								if (amount==0) {
										// ah, whatever, just put it back and forget the
										// wordwrap.
										amount = 80 - window_current_x[win];
								}

								subchalk(win, fg, bg, style, message.substring(0, amount));
								
								window_current_x[win] = 0;
								window_current_y[win]++;
								message = message.substring(amount+1);
						} else {
								
								// The message is shorter.

								subchalk(win, fg, bg, style, message);
								window_current_x[win] += message.length;
								message = '';
						}
				}

				if (line<text.length-1) {
						window_current_x[win] = 0;
						window_current_y[win]++;
				}
    }
}

////////////////////////////////////////////////////////////////

function subchalk(win, fg, bg, style, text) {

    // Firstly, decide on the CSS styles we're going to
    // use in this section.

    // Don't bother for now, but FIXME: do later.
    var css_styles = '';

    // Secondly... FIXME: Here we will need a translation for the lower window.
    // A request to write on line N is mapped to a request to write
    // on the topmost visible line plus N, if there's more lines
    // than fit on the screen.

    // Thirdly, let's get a handle on the line we want
    // to modify.

    var lines = windows[win].childNodes;

    // Fourthly, if the line doesn't yet exist we must create it.
    while (lines.length <= window_current_y[win]) {
				var newLine = window_documents[win].createElement('span');
				newLine.appendChild(window_documents[win].createTextNode('\n'));
				windows[win].appendChild(newLine);
    }

    // Fifthly, we delete any bits of that line we're going to overwrite,
		// and work out where to insert the new span. The line consists of a
		// number of spans plus a carriage return (which we should ignore).
    var current_line = lines[window_current_y[win]];

		var spans = current_line.childNodes;

		var charactersSeen = 0;
		var cursor = 0;

		// Go past all the spans before us.

		while (cursor<spans.length-1 && charactersSeen+spans[cursor].childNodes[0].data.length <= window_current_x[win]) {
				charactersSeen += spans[cursor].childNodes[0].data.length;
				cursor++;
		} 

		// |cursor| is now either pointing at the point where we want to
		// write the current span, or at the span which contains that
		// point. In the latter case, we must break it.

		var charactersTrimmed = 0;
		var doppelganger = 0;

		if (charactersSeen < window_current_x[win]) {

				var amountToKeep = window_current_x[win] - charactersSeen;

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

		var appendPoint = cursor;

		if (cursor<spans.length-1) {
				// Delete any spans which are hidden by our span.
				var charactersDeleted = charactersTrimmed;
				var spansToDelete = 0;
				while (charactersDeleted+spans[cursor].childNodes[0].data.length <= text.length) {
						charactersDeleted += spans[cursor].childNodes[0].data.length;
						cursor++;
						spansToDelete++;
				}
				
				// And trim the RHS of the first span after our new span.
				spans[cursor].childNodes[0].data = spans[cursor].childNodes[0].data.substring(text.length - charactersDeleted);
		}


		// Now we've finished looking at the line, we can start modifying it.

		// FIXME: If we're after the current end of the line, we may need to add spaces.

		// Delete the spans which are underneath our text...
		for (var i=appendPoint; i<appendPoint+spansToDelete; i++) {
				current_line.removeChild(spans[appendPoint]); // the others will slide up.
		}

		// ...add the broken span, if there was one...
		if (doppelganger) {
				current_line.insertBefore(doppelganger, spans[cursor]);
		}

		// ..and append our text.
		var newSpan = window_documents[win].createElement('span');
		newSpan.appendChild(window_documents[win].createTextNode(text));
		current_line.insertBefore(newSpan, spans[appendPoint]);
}

////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////

//                 OLD STUFF IS BELOW

////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////



var u_width = 80;
var u_height = 3;
var u_x = 0;
var u_y = 0;

// When we can do formatted text:
//   u_contents should be a list of rows, each of which is a list
//   of spans, each of which is a pair of style and content.

var u_contents;

function u_setup(w, h) {
	u_width = w;
	u_height = h;

	u_contents = [];

	var temp = '';

	for (var i=0; i<u_width; i++)
		temp = temp + ' ';

	for (var i=0; i<u_height; i++)
		u_contents.push(temp);
}

function u_gotoxy(x,y) {
	u_x = x;
	u_y = y;
}

function u_write(message, x, y) {

	if (isNaN(x)) x=u_x;
	if (isNaN(y)) y=u_y;

	var current = u_contents[y];
	if (!current) current = '';

	var endpoint = x+message.length;

	u_x = endpoint; u_y = y;

	if (endpoint > current.length) {
		// Part of it's not our problem...
		var breaking = current.length-x;
		u_write(message.substring(breaking), 0, (y+1)%u_height);

		// And part of it is (but only one part).
		message = message.substring(0, breaking);
	}

	u_contents[y] =
		current.substring(0, x) +
		message +
		current.substring(endpoint);
}

function u_preformatted() {
	return u_contents.join('\n');
}

////////////////////////////////////////////////////////////////
UPPER_HAPPY = 1;
////////////////////////////////////////////////////////////////
