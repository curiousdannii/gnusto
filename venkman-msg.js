// gnusto-lib.js || -*- Mode: Java; tab-width: 2; -*-
// The Gnusto JavaScript Z-machine library.
// $Header: /cvs/gnusto/src/gnusto/content/venkman-msg.js,v 1.1 2003/03/27 07:04:42 marnanel Exp $

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

/* The Original Code is The JavaScript Debugger
 * 
 * The Initial Developer of the Original Code is
 * Netscape Communications Corporation
 * Portions created by Netscape are
 * Copyright (C) 1998 Netscape Communications Corporation.
 *
 * Contributor(s):
 *  Robert Ginda, <rginda@netscape.com>, original author
 *
 * Some modifications made by Thomas Thurman <marnanel@marnanel.org>
 *
 */

function initStringBundle (bundlePath)
{
    const nsIPropertyElement = Components.interfaces.nsIPropertyElement;

    var pfx;
    if (console.bundleList.length == 0)
        pfx = "";
    else
        pfx = console.bundleList.length + ":";

    var bundle = srGetStrBundle(bundlePath);
    console.bundleList.push(bundle);
    var enumer = bundle.getSimpleEnumeration();

    while (enumer.hasMoreElements())
    {
        var prop = enumer.getNext().QueryInterface(nsIPropertyElement);
        var ary = prop.key.match (/^(msg|msn)/);
        if (ary)
        {
            var constValue;
            var constName = prop.key.toUpperCase().replace (/\./g, "_");
            if (ary[1] == "msn")
                constValue = pfx + prop.key;
            else
                constValue = prop.value.replace (/^\"/, "").replace (/\"$/, "");

            window[constName] = constValue;
        }
    }

    return bundle;
}

function getMsg (msgName, params, deflt)
{
    try
    {    
        var bundle;
        var ary = msgName.match (/(\d+):(.+)/);
        if (ary)
        {
            return (getMsgFrom(console.bundleList[ary[1]], ary[2], params,
                               deflt));
        }
        
        return (getMsgFrom(console.bundleList[0], msgName, params, deflt));
    }
    catch (ex)
    {
        ASSERT (0, "Caught exception getting message: " + msgName + "/" +
                params);
        return deflt ? deflt : msgName;
    }
}

function getMsgFrom (bundle, msgName, params, deflt)
{
    try 
    {
        var rv;
        
        if (params && params instanceof Array)
            rv = bundle.formatStringFromName (msgName, params, params.length);
        else if (params)
            rv = bundle.formatStringFromName (msgName, [params], 1);
        else
            rv = bundle.GetStringFromName (msgName);
        
        /* strip leading and trailing quote characters, see comment at the
         * top of venkman.properties.
         */
        rv = rv.replace (/^\"/, "");
        rv = rv.replace (/\"$/, "");

        return rv;
    }
    catch (ex)
    {
        if (typeof deflt == "undefined")
        {
            ASSERT (0, "caught exception getting value for ``" + msgName +
                    "''\n" + ex + "\n");
            return msgName;
        }
        return deflt;
    }

    return null;    
}

/* message types, don't localize */
const MT_ATTENTION = "ATTENTION";
const MT_CONT      = "CONT";
const MT_ERROR     = "ERROR";
const MT_HELLO     = "HELLO";
const MT_HELP      = "HELP";
const MT_WARN      = "WARN";
const MT_INFO      = "INFO";
const MT_SOURCE    = "SOURCE";
const MT_STEP      = "STEP";
const MT_STOP      = "STOP";
const MT_ETRACE    = "ETRACE";
const MT_LOG       = "LOG";
const MT_USAGE     = "USAGE";
const MT_EVAL_IN   = "EVAL-IN";
const MT_EVAL_OUT  = "EVAL-OUT";
const MT_FEVAL_IN  = "FEVAL-IN";
const MT_FEVAL_OUT = "FEVAL-OUT";

/* these messages might be needed to report an exception at startup, before
 * initMsgs() has been called. */
window.MSN_ERR_STARTUP        = "msg.err.startup";
window.MSN_FMT_JSEXCEPTION    = "msn.fmt.jsexception";

/* exception number -> localized message name map, keep in sync with ERR_* from
 * venkman-static.js */
const exceptionMsgNames = ["err.notimplemented", 
                           "err.required.param",
                           "err.invalid.param",
                           "err.subscript.load",
                           "err.no.debugger",
                           "err.failure",
                           "err.no.stack"];
