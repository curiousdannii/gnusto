var zbytes = []

function loadZcode(filename) {
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
	}
}

function getbyte(address) {
	return zbytes[address];
}

function setbyte(q,value, address) {
	if (value<0) throw "too low "+value;
	if (value>255) throw "too high "+value;
	zbytes[address] = value;
}

function print_text(what) {
	if (what!='')
		document.getElementById("tty").appendChild(
			document.createTextNode(what));
}

function output(what) {
	var newline;

	while (what.indexOf && (newline=what.indexOf('\n'))!=-1) {
		print_text(what.substring(0, newline));
		what = what.substring(newline+1);

		document.getElementById("tty").appendChild(
			document.createElement('br'));
	}

	print_text(what);
	window.scrollBy(0, 9999);
}

function input() {
	quit();
}

function play() {
	try {
                loadZcode('/home/marnanel/proj/old/blorple/troll.z5');
		setup();
		execute_loop();
	} catch (e) {
		alert('Unhandled exception. I shall now crash horribly.\n\n'+e);
		throw e;
	}
}

