// baf.js || -*- Mode: Java; tab-width: 2; -*-

var BAF_HAPPY = 0;

////////////////////////////////////////////////////////////////

var baf__genres_list = 0;
var baf__names_list = 0;

// The namespace of HTML.
var baf_HTML = 'http://www.w3.org/1999/xhtml';

////////////////////////////////////////////////////////////////

function baf_init() {
		var al = Components.classes['@mozilla.org/intl/nslocaleservice;1'].getService(Components.interfaces.nsILocaleService).GetApplicationLocale();
		var sbs = Components.classes['@mozilla.org/intl/stringbundle;1'].getService(Components.interfaces.nsIStringBundleService);

		baf__genres_list = sbs.createBundle('chrome://gnusto/locale/genres.baf.dat',al);
		baf__names_list = sbs.createBundle('chrome://gnusto/locale/names.baf.dat',al);
}

////////////////////////////////////////////////////////////////

function baf_id_to_name(n) {
		try {
				return baf__names_list.GetStringFromName('baf.'+n+'.name');
		} catch(e) {
				return 'Game number '+n;
		}
}

////////////////////////////////////////////////////////////////

function baf_describe_genre(which) {

		function genre_to_name(n) {
				return baf__genres_list.GetStringFromName('baf.genre.'+n);
		}

		function genre_to_desc(n) {
				return baf__genres_list.GetStringFromName('baf.genre.'+n+'.desc');
		}

		function genre_to_members(n) {
				return baf__genres_list.GetStringFromName('baf.genre.'+n+'.members');
		}

		baf__prepare_window();

		var holder = document.createElementNS(baf_HTML,'html:div');
		holder.setAttribute('class', 'baf');
		document.getElementById('infobox').appendChild(holder);

		var heading = document.createElementNS(baf_HTML,'html:h1');
		heading.appendChild(document.createTextNode(genre_to_name(which)));
		holder.appendChild(heading);

		holder.appendChild(document.createTextNode(genre_to_desc(which)));

		var members = genre_to_members(which).split(' ');

		var list = document.createElementNS(baf_HTML,'html:ul');

		for (i=0; i<members.length; i++) {
				var item = document.createElementNS(baf_HTML,'html:li');
				item.appendChild(document.createTextNode(baf_id_to_name(members[i])));
				list.appendChild(item);
		}

		holder.appendChild(list);		
}

////////////////////////////////////////////////////////////////
// Private functions
////////////////////////////////////////////////////////////////

function baf__prepare_window() {
		document.getElementById('screen').setAttribute('hidden','true');
		document.getElementById('infobox').setAttribute('hidden','false');
}

////////////////////////////////////////////////////////////////

// temporary...

function get_Baf_things() {
		alert('gbt');

		var f = new Components.Constructor("@mozilla.org/file/local;1",
																			 "nsILocalFile",
																			 "initWithPath")('/usr/local/mozilla/chrome/gnusto/locale/en-US/baf.zip');
		alert('f='+f);

		var zr = new Components.Constructor("@mozilla.org/libjar/zip-reader;1",
																				"nsIZipReader",
																				"init")(f);

		alert('zr='+zr);

		zr.open();
		var is = zr.getInputStream('genres');
		alert('is='+is);

		var sis = new Components.Constructor("@mozilla.org/scriptableinputstream;1",
																				 "nsIScriptableInputStream",
																				 "init")(is);
		alert('is='+sis);

		alert('read: '+sis.read(10));
}


////////////////////////////////////////////////////////////////
BAF_HAPPY = 1;
////////////////////////////////////////////////////////////////
