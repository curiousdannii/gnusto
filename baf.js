// baf.js || -*- Mode: Java; tab-width: 2; -*-

// This file will be split in two in the great renaming:
// one half will handle Baf's Guide access, and the other
// will handle updating the screen.

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

		var doc = barbarix_get_document(BARBARIX_INFOBOX);
		var infobox = doc.getElementsByTagName('body')[0];

		barbarix_clear(infobox);

		function genre_to_name(n) {
				if (n==0) return 'Genres';

				try {
						return baf__genres_list.GetStringFromName('baf.genre.'+n);
				} catch(e) {
						return 'Genre '+n;
				}
		}

		function genre_to(n, something) {
				try {
						return baf__genres_list.GetStringFromName('baf.genre.'+n+'.'+something);
				} catch(e) {
						return '';
				}
		}

		function genre_list(n, something) {
				var temp = genre_to(n, something);
				if (temp=='')
						return [];
				else
						return temp.split(' ');
		}

		var holder = doc.createElementNS(baf_HTML,'html:div');
		holder.setAttribute('class', 'baf');
		infobox.appendChild(holder);

		var heading = doc.createElementNS(baf_HTML,'html:h1');
		var ancestors = genre_list(which, 'ancestors');

		if (which!=0) {
				// stick "genres" in at the start
				ancestors.unshift(0);
		}

		for (i=0; i<ancestors.length; i++) {
				var link = doc.createElementNS(baf_HTML,'html:a');
				link.setAttribute('href', "javascript://verb('bafgenre "+ancestors[i]+"')");
				link.setAttribute('onclick', "camenesbounce_throw(this);");
				link.appendChild(document.createTextNode(genre_to_name(ancestors[i])));

				heading.appendChild(link);
				heading.appendChild(document.createTextNode(' > '));
		}

		heading.appendChild(document.createTextNode(genre_to_name(which)));
		holder.appendChild(heading);

		holder.appendChild(document.createTextNode(genre_to(which, 'desc')));

		var children = genre_list(which, 'children');

		var list = doc.createElementNS(baf_HTML,'html:ul');

		for (i=0; i<children.length; i++) {
				var item = doc.createElementNS(baf_HTML,'html:li');

				var link = doc.createElementNS(baf_HTML,'html:a');
				link.setAttribute('href', "javascript://verb('bafgenre "+children[i]+"')");
				link.setAttribute('onclick', "camenesbounce_throw(this);");
				link.appendChild(document.createTextNode(genre_to_name(children[i])));

				item.appendChild(link);

				list.appendChild(item);
		}

		holder.appendChild(list);

		holder.appendChild(doc.createElementNS(baf_HTML,'html:hr'));

		var members = genre_list(which, 'members');

		list = doc.createElementNS(baf_HTML,'html:ul');

		for (i=0; i<members.length; i++) {
				var item = doc.createElementNS(baf_HTML,'html:li');
				item.appendChild(document.createTextNode(baf_id_to_name(members[i])));
				list.appendChild(item);
		}

		holder.appendChild(list);

		var credit = doc.createElementNS(baf_HTML,'html:p');
		credit.appendChild(document.createTextNode('Review information from '));
		var link = doc.createElementNS(baf_HTML,'html:a');
		link.setAttribute('href','http://wurb.com/if/');
		link.setAttribute('target','_blank');
		link.appendChild(document.createTextNode("Baf's Guide to the IF Archive"));
		credit.appendChild(link);
		credit.appendChild(document.createTextNode(', copyright Carl Muckenhoupt. Used with permission.'));
		holder.appendChild(credit);
}

////////////////////////////////////////////////////////////////
// Private functions
////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////

// temporary...

/*
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

*/


////////////////////////////////////////////////////////////////
BAF_HAPPY = 1;
////////////////////////////////////////////////////////////////
