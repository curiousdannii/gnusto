// This script was adapted from the uninstall script for the radial context menu.  I've
// heartlessly mangled it so that it can now uninstall gnusto, but I don't claim to fully
// understand all aspects of it.  The RCM folks claim to have shamelessly stolen the code 
// from the mozgest project, which in turn copied it from a skin. Isn't open-source great?
// Kludging together fourth-hand code that hasn't been understood by anyone for at least
// three generations.  Wheeee

/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Mouse Gesture for Mozilla.
 *
 * The Initial Developer of the Original Code is Pavol Vaskovic.
 * Portions created by the Initial Developer are Copyright (C) 2001
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *  Chase Tingley <tingley@sundell.net>
 *  David Perry <d.perry@utoronto.ca>
 *  Pavol Vaskovic <pali@pali.sk>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */



 // semaphore for synchronizig with RDF changes, so that we do not shut down
// sooner then everything is safely written to disk
var semaphore= 3; // there will be 3 async operations
var timerID;

var rcRemoved= "Gnusto has been successfully uninstalled from Mozilla. The changes will take effect when you restart the browser.";
var dirNotDeleted= "'gnusto' directory was not deleted.\nYou can delete it manually from here:\n";
var uninstallWarning= "You are about to uninstall Gnusto. You should close and reopen the browser immediately aftercompletion.\n  Do you wish to continue?"; 

function confirmUninstall(){
	if(confirm(uninstallWarning))
		rcUninstall();
}

function rcUninstall(){
	// remove all references to our package from various rdf files, we also delete 
	// 'gnusto' directory in this function, because chromeDir is defined in there
	removePackageReferences(); 

	// shut down mozilla, that's the only way to get rid of our own overlays
	// running, which would try to read preferences etc...

	timerID= setInterval("if (semaphore== 0) { clearInterval(timerID); alert(rcRemoved); goQuitApplication();};", 500);
	
}

function removePackageReferences(){
	dump("Gnusto: removePackageReferences\n");
	// nsAppDirectoryServiceDefs.h contains many other useful magic words for
	// finding other places (prefs, profile, etc).

	const kDirServiceCID= Components.ID("{f00152d0-b40b-11d3-8c9c-000064657374}");
	const nsIProperties= Components.interfaces.nsIProperties;
	const nsIFileIID= Components.ID("{c8c0a080-0868-11d3-915f-d9d889d48e3c}");
	const magicChromeKey= "AChrom";

	var dirService= Components.classesByID[kDirServiceCID].getService(nsIProperties);

	var chromeDir= dirService.get(magicChromeKey, nsIFileIID);

	// chromeUrl is the file:// url of the chrome directory, eg
	// file:///home/tingley/src/mozilla/dist/bin/chrome/
	var chromeUrl= "file:///"+ chromeDir.path+ "/";
	dump("\tchrome url is "+ chromeUrl+ "\n");
  
	// remove our references from chrome/chrome.rdf
	dump("Attempting to load "+ chromeUrl+ "chrome.rdf\n");
	RDFU.loadDataSource(chromeUrl+ "chrome.rdf", removeFromChrome);

	// let's remove our overlays (these were installed from our contents.rdf)
	var overlay1= new overlayRemover(chromeUrl+ 
		"overlayinfo/communicator/content/overlays.rdf",
		"chrome://communicator/content/tasksOverlay.xul",
		"chrome://gnusto/content/gnustooverlay_moz.xul");
	overlay1.remove();

	// delete gnusto directory
	var ios= Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces['nsIIOService']);
	var fileUri= ios.newURI(chromeUrl+ "gnusto", null, null);
	fileUri= fileUri.QueryInterface(Components.interfaces.nsIFileURL);
	dump("\tDeleting gnusto directory: \n\t"+ fileUri.spec+ "\n");
	try {
		fileUri.file.remove(true);
		dump("\tgnusto directory deleted OK\n");
	} catch(err) {
		dump("\tgnusto directory NOT deleted. ERROR:\n"+ err+ "\n");
		alert(dirNotDeleted+ chromeDir.path);
	}
	semaphore--; // asyncronous operation finished
}

// removeFromChrome is listener that removes all gnusto references from 
// chrome/chrome.rdf when this DataSource is loaded
var removeFromChrome= {
	
	onDataSourceReady: function(aDS) {
		dump("Gnusto: removeFromChrome\n");

		// get the sequence that holds all the packages
		var rootSeq= RDFU.findSeq(aDS, "urn:mozilla:package:root");
		// get resource and node for your package
		var myResource= gRDF.GetResource("urn:mozilla:package:gnusto");
		var myNode= myResource.QueryInterface(Components.interfaces.nsIRDFNode);
		// and snip out your arc
		rootSeq.RemoveElement(myNode, true);

		// now remove everything else we know about your package
		var arcs= aDS.ArcLabelsOut(myResource);

		while(arcs.hasMoreElements()) {
			var arc= arcs.getNext();
    
			// each arc is a property
			var prop= arc.QueryInterface(Components.interfaces.nsIRDFResource);

			// For each property, get all targets, and unassert.  nested 
			// enumeration is the best!
			var targets= aDS.GetTargets(myResource, prop, true);

			while(targets.hasMoreElements()) {
				var target= targets.getNext();
				var targetNode= target.QueryInterface(Components.interfaces.nsIRDFNode);
				aDS.Unassert(myResource, prop, targetNode);
			}
		}

		// now flush the datasource back to disk
		RDFU.saveDataSource(aDS);
		dump("Gnusto: removeFromChrome OK\n");
		semaphore--; // asyncronous operation finished
	},

	onError: function(aStatus, aErrorMsg) {
		dump("Gnusto: removeFromChrome ERROR: status= "+ aStatus+ ", ", aErrorMsg);
	}
};

// overlayRemover removes target from sequence in datasourceURI
// we clean our references from overlay files with these
function overlayRemover(datasourceURI, seq, target) {
	this.mDS= datasourceURI;
	this.mTarget= target;
	this.mSeq= seq;
};

overlayRemover.prototype= {

	remove: function() {
		RDFU.loadDataSource(this.mDS, this);
	},

	onDataSourceReady: function(aDS) {
		dump("Gnusto: overlayRemover: Attempting to remove\n\t"+ this.mTarget+ "\n\tfrom sequence "+ this.mSeq+ "\n");
 		var seq= RDFU.findSeq(aDS, this.mSeq);
		var target= gRDF.GetLiteral(this.mTarget);
		seq.RemoveElement(target, true);
		RDFU.saveDataSource(aDS);
		dump("Gnusto: overlayRemover: OK\n");
		semaphore--; // asyncronous operation finished
	},

	onError: function(aStatus, aErrorMsg) {
		dump("Gnusto: overlayRemover: Error: status= "+ aStatus+ ", ", aErrorMsg);
	}
};
