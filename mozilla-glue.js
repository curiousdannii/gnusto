var zbytes = []

HTML = 'http://www.w3.org/1999/xhtml'

function loadZcode(filename) {

	var percentBar = document.getElementById("tty");

	var zcode = new Components.Constructor(
							"@mozilla.org/file/local;1",
							"nsILocalFile",
   		  					"initWithPath")(filename);

	if (!zcode.exists())
		throw 'Zcode file '+filename+" doesn't exist.";

	var fc = new Components.Constructor(
							"@mozilla.org/network/local-file-channel;1",
						    "nsIFileChannel")();

	var sis = new Components.Constructor(
							"@mozilla.org/scriptableinputstream;1",
							"nsIScriptableInputStream")();

	fc.init(zcode, 1, 0);
	sis.init(fc.open());

	for (var i=0; i<zcode.fileSize; i++) {
		var b = sis.read(1);
		if (b.length==0)
			zbytes[i] = 0;
		else
			zbytes[i] = b.charCodeAt(0);

		if (i%100 == 0) {
			percentBar.setAttribute("value", Math.floor(100 * (zcode.fileSize / i)));
		}
	}
	percentBar.setAttribute("value", "100");
}

function getbyte(address) {
	return zbytes[address];
}

function setbyte(value, address) {
	if (value<0) throw "too low "+value;
	if (value>255) throw "too high "+value;
	zbytes[address] = value;
}

var current_text_holder = 0;

function style_text(how) {
	if (current_window==0) {
		current_text_holder = 
			document.createElementNS(HTML, 'html:div');
		current_text_holder.setAttribute('style', how);
		document.getElementById("tty").appendChild(current_text_holder);
	}
}

function print_text(what) {
	if (what!='')
		current_text_holder.appendChild(
			document.createTextNode(what));
}

function print_newline() {
	if (current_window==0) {
		current_text_holder.appendChild(
			document.createElementNS(HTML, 'html:br'));
	} else {
		// fixme: have a method to do this inside upper
		u_x = 0;
		u_y = (u_y + 1) % u_height;
	}
}

function gnustoglue_output(what) {
	if (current_window==0) {
		var newline;

		while (what.indexOf && (newline=what.indexOf('\n'))!=-1) {
			print_text(what.substring(0, newline));
			what = what.substring(newline+1);
	
			print_newline();
		}

		print_text(what);
	} else if (current_window==1) {
		u_write(what);
	}
}

function gnustoglue_set_text_style(style) {
	var styling = ''

	if (style!=0) {
		if (style & 0x1)
			// "reverse video", whatever that means for us
			styling = styling + 'background-color: #777777;color: #000000;';

		if (style & 0x2)
			// bold
			styling = styling + 'font-weight:bold;';

		if (style & 0x4)
			// italic
			styling = styling + 'font-style: italic;';

		if (style & 0x8)
			// monospace
			styling = styling + 'font-family: monospace;';
	}

	style_text(styling);
}

function gnustoglue_split_window(lines) {
	u_setup(80, lines);
	set_upper_window();
}

var current_window = 0;

function gnustoglue_set_window(window) {
	u_setup(80,0);
	set_upper_window();

}

function gnustoglue_erase_window(window) {
	if (current_window==1)
		u_setup(u_width, u_height);
	else if (current_window==1)
		throw "Can't handle clearing lower window yet";
}

function gnustoglue_set_cursor(y, x) {
	if (current_window == 1) u_gotoxy(x, y);
}

var reasonForStopping = GNUSTO_EFFECT_WIMP_OUT; // safe default

function go_wrapper(answer) {
	do {
		reasonForStopping = go(answer);
	} while (reasonForStopping == GNUSTO_EFFECT_WIMP_OUT);

	alert('Stopped on '+reasonForStopping.toString(16));
}

function set_upper_window() {
	var upper = document.getElementById("upper");
	var replacing = upper.firstChild;

	if (replacing) {
		alert('replacing');
		upper.replaceChild(upper.firstChild,
				document.createTextNode(u_preformatted()));
	} else {
		alert('app');
		upper.appendChild(
				document.createTextNode(u_preformatted()));
	}
}

function play() {
	try {
		u_setup(80,0);
		set_upper_window();

		style_text('');
                loadZcode('/home/marnanel/proj/old/blorple/troll.z5');
		setup();
		go_wrapper(0);
	} catch (e) {
		alert('Unhandled exception. I shall now crash horribly.\n\n'+e);
		throw e;
	}
}

function gotInput(keycode) {
	if (keycode==13 && reasonForStopping==GNUSTO_EFFECT_INPUT) {
		var inputBox = document.getElementById("input");
		var value = inputBox.value;

		inputBox.value = '';

		go_wrapper(value);
	}
}
