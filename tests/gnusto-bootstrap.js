/*
 * Gnusto Bootstrapper
 *
 * Copyright (c) 2003-2010 The Parchment/Gnusto Contributors
 * Licenced under the GPL v2
 * http://github.com/curiousdannii/gnusto
 */

// FatalError and logfunc
var FatalError = Error,
logfunc = window.console && console.log ?
	function(msg) { console.log(msg); } :
	function() {} ;

// File download - largely taken from Parchment's file.js
// Will only work with good modern browsers, and only if the file is in the same domain

function text_to_array(text, array)
{
	var array = array || [], i = 0, l;
	for (l = text.length % 8; i < l; ++i)
		array.push(text.charCodeAt(i) & 0xff);
	for (l = text.length; i < l;)
		// Unfortunately unless text is cast to a String object there is no shortcut for charCodeAt,
		// and if text is cast to a String object, it's considerably slower.
		array.push(text.charCodeAt(i++) & 0xff, text.charCodeAt(i++) & 0xff, text.charCodeAt(i++) & 0xff, text.charCodeAt(i++) & 0xff,
			text.charCodeAt(i++) & 0xff, text.charCodeAt(i++) & 0xff, text.charCodeAt(i++) & 0xff, text.charCodeAt(i++) & 0xff);
	return array;
}

function download_to_array( url, callback )
{
	// Ajax options
	var options = {
		beforeSend: function ( XMLHttpRequest )
		{
			XMLHttpRequest.overrideMimeType('text/plain; charset=x-user-defined');
		},
		error: function ( XMLHttpRequest, textStatus )
		{
			throw 'Error loading story: ' + textStatus;
		},
		success: function ( data )
		{
			callback( text_to_array( $.trim( data )));
		},
		url: url
	};
	
	// Log the options for debugging
	logfunc( options );
	
	// Get the file
	$.ajax(options);
}

// Out Gnusto bootstrap runner, taken somewhat from test_gnusto_engine.js
function gnusto_runner( engine, commands )
{
	engine.run();
	var retval = 1,
	effect = '"' + engine.effect(0) + '"',
	text = engine.consoleText(),
	desc = '[' + effect + ']',
	response;

	// Display Gnusto's output
	if ( text )
	{
		if ( !window.PROFILE )
			logfunc( text );
			
		text = text.replace( /\n/g, '<br>' );
		$('#output').append( text );
	}

	switch (effect) {
		case GNUSTO_EFFECT_INPUT:
			// Prompt for user response - I know it's a horrible alert box, but it will do for now
			if ( commands[engine.commandID] )
			{
				response = commands[engine.commandID];
				engine.commandID++;
			}
			else
			{
				response = prompt('Text input' ) || '';
				if ( response == '\\walkthrough' && commands[0] )
				{
					response = commands[0];
					engine.commandID = 1;
				}
			}
				
			desc = '[GNUSTO_EFFECT_INPUT]';
			desc += ' (responding with "' + response + '")';
			$('#output').append( response + '<br>' );
			// Answer Gnusto
			engine.answer(1, response);
			break;
		case GNUSTO_EFFECT_QUIT:
			desc = '[GNUSTO_EFFECT_QUIT]';
			retval = 0;
			break;
		default:
			break;
	};

	// Log it
	if ( !window.PROFILE )
		logfunc( desc );
	
	return retval;
}

// Bootstrap Gnusto with a given story URL
function bootstrap_gnusto( url, walkthrough )
{
	// Instantiate Gnusto, load the story, and run till you can no more
	window.engine = new GnustoEngine( logfunc );
	download_to_array( url, function( data ) {
	
		var run = function( commands )
		{		
			engine.loadStory( data );
			engine.commandID = -1;
			while ( gnusto_runner( engine, commands ) ) {}
		};
		
		// Get the walkthrough if one is provided.
		if ( walkthrough )
		{
			$.get( walkthrough, function( commands ) {
				commands = commands.split('\n');
				run( commands );
			});
		}
		else
			run([]);
		
	});
}
