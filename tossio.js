// tossio.js || -*- Mode: Java; tab-width: 2; -*-
// The debugger in Gnusto.

var TOSSIO_HAPPY = 0;

//================================================================
//
// List of opcodes
//
// The keys are opcode numbers, except that extended opcodes are stored 1000
// above their number (so extended 12 is at 1012).
//
// The values are lists, whose entries are:
//  [0] : Name
//  [1] : Store?
//  [2] : Branch?
//  [3] : Text inline?
//  [4] : Indirect addressing?
//  [5] : *** not used *** (remove later)
//  [6] : Execution can never continue on from this opcode
//  [7] : A list of what to do with the arguments
//           5 = procedure call
//          10 = indirect referencing
//          11 = a ZSCII character
tossio_opcodes = {
//////////////////////////////////////////// 2-OPs ////////////////////////////
//      Name                 St?  Br? Txt? Ind? Con? Stp?
   1: [ 'je'                ,  0,   1,   0,   0,   0,   0,  [] ],
   2: [ 'jl'                ,  0,   1,   0,   0,   0,   0,  [] ],
   3: [ 'jg'                ,  0,   1,   0,   0,   0,   0,  [] ],
   4: [ 'dec_chk'           ,  0,   1,   0,   0,   0,   0,  [10] ],
   5: [ 'inc_chk'           ,  0,   1,   0,   0,   0,   0,  [10] ],
   6: [ 'jin'               ,  0,   1,   0,   0,   0,   0,  [] ],
   7: [ 'test'              ,  0,   1,   0,   0,   0,   0,  [] ],
   8: [ 'or'                ,  1,   0,   0,   0,   0,   0,  [] ],
   9: [ 'and'               ,  1,   0,   0,   0,   0,   0,  [] ],
  10: [ 'test_attr'         ,  0,   1,   0,   0,   0,   0,  [] ],
//      Name                 St?  Br? Txt? Ind? Con? Stp?
  11: [ 'set_attr'          ,  0,   0,   0,   0,   0,   0,  [] ],
  12: [ 'clear_attr'        ,  0,   0,   0,   0,   0,   0,  [] ],
  13: [ 'store'             ,  0,   0,   0,   0,   0,   0,  [10] ],
  14: [ 'insert_obj'        ,  0,   0,   0,   0,   0,   0,  [] ],
  15: [ 'loadw'             ,  1,   0,   0,   0,   0,   0,  [] ],
  16: [ 'loadb'             ,  1,   0,   0,   0,   0,   0,  [] ],
  17: [ 'get_prop'          ,  1,   0,   0,   0,   0,   0,  [] ],
  18: [ 'get_prop_addr'     ,  1,   0,   0,   0,   0,   0,  [] ],
  19: [ 'get_next_prop'     ,  1,   0,   0,   0,   0,   0,  [] ],
  20: [ 'add'               ,  1,   0,   0,   0,   0,   0,  [] ],
//      Name                 St?  Br? Txt? Ind? Con? Stp?
  21: [ 'sub'               ,  1,   0,   0,   0,   0,   0,  [] ],
  22: [ 'mul'               ,  1,   0,   0,   0,   0,   0,  [] ],
  23: [ 'div'               ,  1,   0,   0,   0,   0,   0,  [] ],
  24: [ 'mod'               ,  1,   0,   0,   0,   0,   0,  [] ],
  25: [ 'call_2s'           ,  1,   0,   0,   1,   0,   0,  [5] ],
  26: [ 'call_2n'           ,  0,   0,   0,   1,   0,   0,  [5] ],
  27: [ 'set_colour'        ,  0,   0,   0,   0,   0,   0,  [] ],
// mm, if the skin is en-us, maybe we should change that :)
  28: [ 'throw'             ,  0,   0,   0,   0,   0,   1,  [] ],

//////////////////////////////////////////// 1-OPs ////////////////////////////
//      Name                 St?  Br? Txt? Ind? Con? Stp?
 128: [ 'jz'                ,  0,   1,   0,   0,   0,   0,  [] ],
 129: [ 'get_sibling'       ,  1,   1,   0,   0,   0,   0,  [] ],
 130: [ 'get_child'         ,  1,   1,   0,   0,   0,   0,  [] ],
 131: [ 'get_parent'        ,  1,   0,   0,   0,   0,   0,  [] ],
 132: [ 'get_prop_len'      ,  1,   0,   0,   0,   0,   0,  [] ],
 133: [ 'inc'               ,  0,   0,   0,   0,   0,   0,  [10] ],
 134: [ 'dec'               ,  0,   0,   0,   0,   0,   0,  [10] ],
 135: [ 'print_addr'        ,  0,   0,   0,   0,   0,   0,  [] ],
 136: [ 'call_1s'           ,  1,   0,   0,   1,   0,   0,  [5] ],
 137: [ 'remove_obj'        ,  0,   0,   0,   0,   0,   0,  [] ],
 138: [ 'print_obj'         ,  0,   0,   0,   0,   0,   0,  [] ],
 139: [ 'ret'               ,  0,   0,   0,   0,   0,   1,  [] ],
 140: [ 'jump'              ,  0,   0,   0,   0,   0,   1,  [] ],
 141: [ 'print_paddr'       ,  0,   0,   0,   0,   0,   0,  [] ],
 142: [ 'load'              ,  1,   0,   0,   0,   0,   0,  [10] ],
 143: [ 'call_1n'           ,  0,   0,   0,   1,   0,   0,  [5] ],

//////////////////////////////////////////// 0-OPs ////////////////////////////
//      Name                 St?  Br? Txt? Ind? Con? Stp?
 176: [ 'rtrue'             ,  0,   0,   0,   0,   0,   1,  [] ],
 177: [ 'rfalse'            ,  0,   0,   0,   0,   0,   1,  [] ],
 178: [ 'print'             ,  0,   0,   1,   0,   0,   0,  [] ],
 179: [ 'print_ret'         ,  0,   0,   1,   0,   0,   1,  [] ],
 180: [ 'nop'               ,  0,   0,   0,   0,   0,   0,  [] ],
// 181 and 182 don't exist in v5
 183: [ 'restart'           ,  0,   0,   0,   0,   0,   1,  [] ],
 184: [ 'ret_popped'        ,  0,   0,   0,   0,   0,   1,  [] ],
 185: [ 'catch'             ,  0,   1,   0,   0,   0,   0,  [] ],
 186: [ 'quit'              ,  0,   0,   0,   0,   0,   1,  [] ],
 187: [ 'new_line'          ,  0,   0,   0,   0,   0,   0,  [] ],
// 188 doesn't exist in v5
 189: [ 'verify'            ,  0,   1,   0,   0,   0,   0,  [] ],
// 190 is the start of an extended opcode
 191: [ 'piracy'            ,  0,   1,   0,   0,   0,   0,  [] ],

/////////////////////////////////////////// VAR-OPs ///////////////////////////
//      Name                 St?  Br? Txt? Ind? Con? Stp?

 224: [ 'call_vs'           ,  1,   0,   0,   1,   0,   0,  [5] ],
 225: [ 'storew'            ,  0,   0,   0,   0,   0,   0,  [] ],
 226: [ 'storeb'            ,  0,   0,   0,   0,   0,   0,  [] ],
 227: [ 'put_prop'          ,  0,   0,   0,   0,   0,   0,  [] ],
 228: [ 'read'              ,  1,   0,   0,   0,   0,   0,  [] ],
 229: [ 'print_char'        ,  0,   0,   0,   0,   0,   0,  [11] ],
//      Name                 St?  Br? Txt? Ind? Con? Stp?
 230: [ 'print_num'         ,  0,   0,   0,   0,   0,   0,  [] ],
 231: [ 'random'            ,  1,   0,   0,   0,   0,   0,  [] ],
 232: [ 'push'              ,  0,   0,   0,   0,   0,   0,  [] ],
 233: [ 'pull'              ,  0,   0,   0,   0,   0,   0,  [10] ],
 234: [ 'split_window'      ,  0,   0,   0,   0,   0,   0,  [] ],
 235: [ 'set_window'        ,  0,   0,   0,   0,   0,   0,  [] ],
 236: [ 'call_vs2'          ,  1,   0,   0,   1,   0,   0,  [5] ],
 237: [ 'erase_window'      ,  0,   0,   0,   0,   0,   0,  [] ],
 238: [ 'erase_line'        ,  0,   0,   0,   0,   0,   0,  [] ],
 239: [ 'set_cursor'        ,  0,   0,   0,   0,   0,   0,  [] ],
//      Name                 St?  Br? Txt? Ind? Con? Stp?
 240: [ 'get_cursor'        ,  0,   0,   0,   0,   0,   0,  [] ],
 241: [ 'set_text_style'    ,  0,   0,   0,   0,   0,   0,  [] ],
 242: [ 'buffer_mode'       ,  0,   0,   0,   0,   0,   0,  [] ],
 243: [ 'output_stream'     ,  0,   0,   0,   0,   0,   0,  [] ],
 244: [ 'input_stream'      ,  0,   0,   0,   0,   0,   0,  [] ],
 245: [ 'sound_effect'      ,  0,   0,   0,   0,   0,   0,  [] ],
 246: [ 'read_char'         ,  1,   0,   0,   0,   0,   0,  [] ],
 247: [ 'scan_table'        ,  1,   1,   0,   0,   0,   0,  [] ],
 248: [ 'not'               ,  1,   0,   0,   0,   0,   0,  [] ],
 249: [ 'call_vn'           ,  0,   0,   0,   1,   0,   0,  [5] ],
//      Name                 St?  Br? Txt? Ind? Con? Stp?
 250: [ 'call_vn2'          ,  0,   0,   0,   1,   0,   0,  [5] ],
 251: [ 'tokenise'          ,  0,   0,   0,   0,   0,   0,  [] ],
 252: [ 'encode_text'       ,  0,   0,   0,   0,   0,   0,  [] ],
 253: [ 'copy_table'        ,  0,   0,   0,   0,   0,   0,  [] ],
 254: [ 'print_table'       ,  0,   0,   0,   0,   0,   0,  [] ],
 255: [ 'check_arg_count'   ,  0,   1,   0,   0,   0,   0,  [] ],

///////////////////////////////////////////// EXTs ////////////////////////////
//      Name                 St?  Br? Txt? Ind? Con? Stp?

1000: [ 'save'              ,  1,   0,   0,   0,   0,   0,  [] ],
1001: [ 'restore'           ,  1,   0,   0,   0,   0,   0,  [] ],
1002: [ 'log_shift'         ,  1,   0,   0,   0,   0,   0,  [] ],
1003: [ 'art_shift'         ,  1,   0,   0,   0,   0,   0,  [] ],
1004: [ 'set_font'          ,  1,   0,   0,   0,   0,   0,  [] ],
// ... no more in v5 until ...
1009: [ 'save_undo'         ,  1,   0,   0,   0,   0,   0,  [] ],
1010: [ 'restore_undo'      ,  1,   0,   0,   0,   0,   0,  [] ],
1011: [ 'print_unicode'     ,  0,   0,   0,   0,   0,   0,  [] ],
1012: [ 'check_unicode'     ,  0,   0,   0,   0,   0,   0,  [] ],
};

// c&p from gnusto-lib. use their version when tossio is linked in
// This should probably be done programmatically...
var zalphabet = {
		0: 'abcdefghijklmnopqrstuvwxyz',
		1: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
		2: 'T\n0123456789.,!?_#\'"/\\-:()', // T = magic ten bit flag
}

function zscii_char_to_ascii(zscii_code) {
		if (zscii_code<0 || zscii_code>1023) {
				gnusto_error(702, zscii_code); // illegal zscii code
		}

		var result;

		if (zscii_code==13)
				result = 10;
		else if ((zscii_code>=32 && zscii_code<=126) || zscii_code==0)
				result = zscii_code;
		else {
				gnusto_error(703, zscii_code); // unknown zscii code
		}

		return String.fromCharCode(result);
}

function zscii_from(address, max_length, tell_length) {
		var temp = '';
		var alph = 0;
		var running = 1;

		// Should be:
		//   -2 if we're not expecting a ten-bit character
		//   -1 if we are, but we haven't seen any of it
		//   n  if we've seen half of one, where n is what we've seen
		var tenbit = -2;

		// Should be:
		//    0 if we're not expecting an abbreviation
		//    z if we are, where z is the prefix
		var abbreviation = 0;

		if (!max_length) max_length = 65535;
		var stopping_place = address + max_length;

		while (running) {
				var word = get_unsigned_word(address);
				address += 2;

				running = !(word & 0x8000) && address<stopping_place;

				for (var j=2; j>=0; j--) {
						var code = ((word>>(j*5))&0x1f)

								if (abbreviation) {
										temp = temp + zscii_from(get_unsigned_word((32*(abbreviation-1)+code)*2+abbr_start)*2);
										abbreviation = 0;
								} else if (tenbit==-2) {
										if (code<1) { temp = temp + ' '; alph=0; }
										else if (code<4) { abbreviation = code; }
										else if (code<6) { alph = code-3; }
										else {
												if (alph==2 && code==6)
														tenbit = -1;
												else
														temp = temp +
																zalphabet[alph][code-6];
												alph = 0;
										}
								} else if (tenbit==-1) {
										tenbit = code;
								} else {
										temp = temp + zscii_char_to_ascii(
																											(tenbit<<5) + code);
										tenbit = -2;
								}
				}
		}
		if (tell_length) {
				return [temp, address];
		} else {
				return temp;
		}
}


function getbyte(address) {
    // Convoluted to work around the null byte problem.
    // See http://gnusto.mozdev.org/nullbytes.html

    var result = zbytes[address];

    if (isNaN(result)) {
				// it's not in the lookup table, so find it in the original
				result = 0;
				if (mangled.charCodeAt(fixups+address)!=89)
						result = mangled.charCodeAt(address);
				
				zbytes[address] = result;
    }

    return result;
}


function unsigned2signed(value) {
		return ((value & 0x8000)?~0xFFFF:0)|value;
}

function get_unsigned_word(addr) {
    return getbyte(addr)*256+getbyte(addr+1);
}

function string_for_varcode(varcode) {
		if (varcode==0)
				return 'SP';
		else if (varcode < 0x10)
				return 'L'+(varcode-1);
		else
				return 'G'+(varcode-16).toString(16);
}

////////////////////////////////////////////////////////////////

// Dictionary of points of interest in memory (related to Inform's
// concept of "sequence points").
// Types of point:
//    1 = You can get here from a previous instruction.
//    2 = You can get here by branching.
//    3 = This is a string (not implemented, but easily could be)
//    4 = not used (store-target?)
//    5 = start of procedure header
var points = {};

// A dictionary of dissembled instructions.
var asm = {};

// Function which sets up |points| based on the contents of memory.
// |addr| is the address to start at. Set |is_func| if |addr| is the
// address of the start of a function; clear it if |addr| is the
// address of an instruction (e.g. the beginning of the bootstrap).
// This function will recur as necessary to document as much memory
// as possible.
function tossio_scan(addr, is_func) {

		if (is_func) {
				// We're inside a function; mark the header as such:
				points[addr] = 5;
				// and move on past the header (it's only one byte in v5).
				addr++;
		}

		do {
				// If where we are isn't marked as a point, it should be.
				// Mark it as type "1" (you can get there by sequence).
				if (isNaN(points[addr])) points[addr] = 1;

				// The following is mostly duplicated from gnusto-lib.
				// We need to think of ways of factoring this out without
				// losing efficiency.

				// List of arguments to the opcode.
				var args = [];

				// Where we are now.
				var orig_addr = addr;

				// Inelegant function to load parameters according to a VAR byte.
				function handle_variable_parameters() {
						var types = getbyte(addr++);
						var argcursor = 0;

						while (1) {
								var current = types & 0xC0;
								if (current==0xC0) {
										break;
								} else if (current==0x00) {
										args[argcursor++] = get_unsigned_word(addr);
										addr+=2;
								} else if (current==0x40) {
										args[argcursor++] = getbyte(addr++);
								} else if (current==0x80) {
										args[argcursor++] =
												string_for_varcode(getbyte(addr++));
								} else {
										throw "impossible";
								}
								
								types = (types << 2) | 0x3;
						}
				}
				
				// So here we go...
				// what's the opcode?
				var instr = getbyte(addr++);

				if (instr==0) {
						// If we just get a zero, we've probably
						// been directed off into deep space somewhere.
						
						throw "lost in space";
				} else if (instr==190) { // Extended opcode.
						
						instr = 1000+getbyte(addr++);
						handle_variable_parameters();
						
				} else if (instr & 0x80) {
						if (instr & 0x40) { // Variable params
								
								if (!(instr & 0x20))
										// This is a 2-op, despite having
										// variable parameters; reassign it.
										instr &= 0x1F;
								
								handle_variable_parameters();

								if (instr==250 || instr==236)
										// We get more of them!
										handle_variable_parameters();
								
						} else { // Short. All 1-OPs except for one 0-OP.

								switch(instr & 0x30) {
								case 0x00:
								    args[0] = get_unsigned_word(addr);
										addr+=2;
										instr = (instr & 0x0F) | 0x80;
										break;
										
								case 0x10:
										args[0] = getbyte(addr++);
										instr = (instr & 0x0F) | 0x80;
										break;
										
								case 0x20:
										args[0] =
												string_for_varcode(getbyte(addr++));
										instr = (instr & 0x0F) | 0x80;
										break;

								case 0x30:
										// 0-OP. We don't need to get parameters, but we
										// *do* need to translate the opcode.
										instr = (instr & 0x0F) | 0xB0;
										break;
								}
						}
				} else { // Long
						
						if (instr & 0x40)
								args[0] =
										string_for_varcode(getbyte(addr++));
						else
								args[0] = getbyte(addr++);
						
						if (instr & 0x20)
								args[1] =
										string_for_varcode(getbyte(addr++));
						else
								args[1] = getbyte(addr++);

						instr &= 0x1F;
				}

				// Pull out the relevant row from the opcode table.
				var details = tossio_opcodes[instr];

				if (!details)
						throw "Hit something odd here: "+instr.toString(16)+" at "+addr.toString(16);

				// Okay, so let's build ourselves some assembly language.
				var zass = details[0];

				for (var i=0; i<args.length; i++) {
						zass += ' ';
						var param = args[i];

						// So, how should we handle this parameter?

						switch (details[7][i]) {
						case 5: // procedure call
								if (isNaN(param)) {
										// indirect procedure call. weird
										zass += '['+param+']';
								} else {
										param *= 4;
										zass += '@'+param.toString(16);
										if (points[param]!=5)
												// We haven't seen this one before;
												// better go and look at it now.
												tossio_scan(param, 1);
								}
								break;

						case 10: // an indirect variable reference
								if (isNaN(args[i]))
										// someone's actually *using* indirection! Eek!
										zass += '['+param+']';
								else
										// constant indirection; we'll dereference it here
										zass += string_for_varcode(param);
								break;

						case 11: // zscii
								if (isNaN(args[i]))
										zass += args[i];
								else if (args[i]<32 || args[i]>126)
										zass += '#'+args[i];
								else
										zass += "'"+String.fromCharCode(args[i])+"'";
								break;

						default:
								// just an ordinary number.
								if (isNaN(args[i]))
										zass += args[i];
								else
										zass += '#'+args[i].toString(16);
						}
				}

				if (details[1]) // store
						zass += ' -> '+string_for_varcode(getbyte(addr++));
		 
				if (details[2]) { // branch
						var whither = getbyte(addr++);
						var distance;

						zass += ' ';
						if (!(whither & 0x80)) zass += '~'; // jump if not...

						if (whither & 0x40) {
								distance = whither & 0x3F;
						} else {
								distance = ((whither & 0x3F)<<8) |
										getbyte(addr++);
								// And do sign extension:
								if (distance & 0x2000) distance |= (~0x3FFF);
						}

						if (distance==0)
								zass += '[RFALSE]';
						else if (distance==1)
								zass += '[RTRUE]';
						else {
								var referent = addr + (distance-2);

								zass += '('+referent.toString(16)+')';
								points[referent] = 2;
						}
				}

				if (details[3]) { // a string
						var temp = zscii_from(addr, 65535, 1);
						temp[0] = temp[0].replace('"','~').replace(String.fromCharCode(10),'^');
						if (temp[0].length > 40)
								zass += ' "' + temp[0].substring(0,36)+' ...';
						else
								zass += ' "' + temp[0]+'"';
						addr = temp[1];
				}
				
				asm[orig_addr] = zass;

				// We stop only when:
				//   details[6] is set (i.e. control can't continue)
				//   points[addr] is not set to 2
				//     (i.e. this function has not attempted to branch
				//      to this point yet.)
		} while (!(details[6] && points[addr]!=2));
}

var scanDone = 0;

function viewDissembly() {

		var menu = document.getElementById('view-dissembly');
		var splitter = document.getElementById('dissembly-split');
		var pane = document.getElementById('dissembly');

		if (pane.getAttribute('hidden')=='true') {
				splitter.setAttribute('hidden', 'false');
				pane.setAttribute('hidden', 'false');
				menu.setAttribute('label', 'Hide dissembly');

				if (!scanDone) {
						alert('Scan needed.');
						tossio_scan(get_unsigned_word(0x06), 0);
						alert('Scan finished.');

						for (var i in points) {
								var row = document.createElement('row');
								var a = document.createElement('label');
								a.setAttribute('value', i.toString(16));
								row.appendChild(a);

								if (asm[i]) {
										var b = document.createElement('label');
										b.setAttribute('value', asm[i]);
										row.appendChild(b);
								}
								document.getElementById('details').appendChild(row);
						}
						alert('Update finished.');

						scanDone = 1;
				}
		} else {
				splitter.setAttribute('hidden', 'true');
				pane.setAttribute('hidden', 'true');
				menu.setAttribute('label', 'Show dissembly');
		}
}

////////////////////////////////////////////////////////////////

function tossio_print(message) {
		gnustoglue_output(message);
}

////////////////////////////////////////////////////////////////

var show_js = 0;
var dissembly_done = 0;

var tossio_verbs = {
		'help': ['provide brief help on functions',
						'Provides a brief rundown of what a function does. Use "help" on its own to get information on all functions. "help step" will give you more detailed help on the "step" command, and so on.',
						function(a) {
								if (a.length==1) {
										for (var command in tossio_verbs) {
												tossio_print(command+': '+tossio_verbs[command][0]+'\n');
										}
								}
						}],
		'open': ['load a (mangled) story file',
						'Loads the named story file.',
						function(a) {
								//
								// Time will be that the menu option calls this verb.
								//
								if (a.length==2) {
										var zc = new Components.Constructor("@mozilla.org/file/local;1",
																												"nsILocalFile",
																												"initWithPath")(a[1]);
										if (loadMangledZcode(zc)) {
												if (single_step) {
														tossio_print('Loaded OK (use /run or /step now).');
												}
												play();
										} else {
												tossio_print('Load failed.');
										}
								} else {
										// FIXME: Should put up open dialogue if paramcount is 1.
										tossio_print('Wrong number of parameters for open.');
								}
						}],
		'status': ['print status',
							'...',
							function(a) {
									var temp = '';
									temp = '[PC='+pc.toString(16);

									if (asm[pc]) {
											temp = temp + ' || ' + asm[pc];
									}
									temp = temp+']';

									if (show_js) {
											if (!jit[pc]) {
													var saved_pc = pc;
													eval('jit[saved_pc]=' + dissemble());
													pc = saved_pc;
											}
											temp = temp + '\n' + jit[pc];
									}

									tossio_print(temp);
							}],
		'on': ['turn on debug mode',
							'...',
							function(a) {
									single_step = 1;
									debug_mode = 1;
									tossio_print('Debug mode on.');
							}],
		'showjs': ['show JS in status information',
							'...',
							function(a) {
									show_js = 1;
							}],
		'parser': ['show parser debug information',
							'...',
							function(a) {
									parser_debugging = 1;
									tossio_print('Parser debugging on.');
							}],
		'dis': ['calculate dissembly information',
					 '...',
					 function(a) {
							 if (!dissembly_done) {
									 asm = {};
									 points = {};
									 tossio_print('Scanning for dissembly information... ');
									 tossio_scan(get_unsigned_word(0x06), 0);
									 tossio_print('done.');
									 dissembly_done = 1;
							 }
					 }],
		'step': ['step one place through',
						'...',
						function(a) {
								single_step = 1;
								go_wrapper(0);
						}],
		'run': ['run through until something happens worth stopping for',
						'...',
					 // FIXME: This shouldn't work if we're stopped for, say,
					 // keyboard input.
						function(a) {
								single_step = 0;
								go_wrapper(0);
						}],
		'context': ['show context around program counter',
							 '...',
							 function(a) {
									 for (var i=pc-20; i<pc+20; i++) {
											 if (points[i]==5) {
													 tossio_print('\n=== Routine '+i.toString(16)+' ===\n');
											 }
											 if (asm[i]) {
													 tossio_print(i.toString(16)+'  '+asm[i]);
													 if (points[i]==2) {
															 tossio_print(' (target)');
													 }
													 if (i==pc) {
															 tossio_print(' <---******* PC');
													 }
													 tossio_print('\n');
											 }
									 }
							 }],
		'set': ['set a breakpoint',
					 '...',
					 function (a) {

							 // Make sure we have dissembly information.
							 tossio_debug_instruction(['dis']);
							 
							 // Right, now: what kind of instruction is this?

							 var addr = a[1]*1;

							 if (points[addr]==5) { // Start of a routine
									 tossio_print('[breaking on first instruction of that routine]\n');
									 addr++; // in v5; adjust for others
							 }

							 if (points[addr]==1 || points[addr]==2) {
									 breakpoints[addr] = 1;
									 jit = {}; // trash it, so the version that regrows will have the breakpoint
									 tossio_print('Breakpoint added OK.\n');
							 } else {
									 tossio_print('That\'s not a valid instruction (as far as I can see).\n');
							 }
					 }],
		'clear': ['clear a breakpoint',
						 '...',
						 function (a) {
							 var addr = a[1]*1;

							 if (breakpoints[addr]) {
									 delete breakpoints[addr];
									 tossio_print('OK, deleted.');
							 } else {
									 tossio_print('No breakpoint there!');
							 }
						 }],
		'show': ['show value of a variable',
						// Bzzt. This should use the new variable syntax ($, #, & and so on).
						// Call it "get" then.
						'...',
						function(a) {
								var which = a[2];
								if (a[1]=='local') {
										if (which>=0 && which<=15) {
												tossio_print('Value of L'+which+': '+locals[which]+'\n');
										} else {
												tossio_print('Unknown local variable.\n');
										}
								} else if (a[1]=='global') {
										if (which>=0 && which<=240) {
												tossio_print('Value of G'+which+': '+getword(vars_start+which*2)+'\n');
										} else {
												tossio_print('Unknown local variable.\n');
										}
								} else if (a[1]=='memory') {
										tossio_print('Value of address '+which+': byte='+getword(which)+'; word='+getword(which)+'\n');
								} else {
										tossio_print('Unknown variable.\n');
								}
						}],
		'put': ['set value of a variable',
					 '...',
					 function(a) {
							 //  $xxx = variable named xxx (not yet implemented)
							 //  #xxx = literal, hex xxx
							 //  &xxx = memory word xxx
							 //  *xxx = memory byte xxx
							 //  %xx  = global variable xx
							 //  !x   = local variable x
							 //  otherwise: literal, decimal

							 var t = a[1][0];
							 var n = eval('0x'+a[1].substring(1));
							 var v = a[2];

							 if (t=='%') {
									 setword(v, vars_start+n*2);
							 } else {
									 tossio_print('Unknown type in /put');
							 }

					 }],
		'ta': ['(temporary testing function for new screen handler)','',
					function(a) {
							var newLine = window_documents[0].createElement('span');

							var newSpan = window_documents[0].createElement('span');
							newSpan.appendChild(window_documents[0].createTextNode('Aaaaaaaaaa'));
							newLine.appendChild(newSpan);

							newSpan = window_documents[0].createElement('span');
							newSpan.appendChild(window_documents[0].createTextNode('Bbbbbbbbbb'));
							newLine.appendChild(newSpan);

							newSpan = window_documents[0].createElement('span');
							newSpan.appendChild(window_documents[0].createTextNode('Cccccccccc'));
							newLine.appendChild(newSpan);

							newSpan = window_documents[0].createElement('span');
							newSpan.appendChild(window_documents[0].createTextNode('Dddddddddd'));
							newLine.appendChild(newSpan);

							newSpan = window_documents[0].createElement('span');
							newSpan.appendChild(window_documents[0].createTextNode('Eeeeeeeeee'));
							newLine.appendChild(newSpan);

							newSpan = window_documents[0].createElement('span');
							newSpan.appendChild(window_documents[0].createTextNode('Ffffffffff'));
							newLine.appendChild(newSpan);

							newSpan = window_documents[0].createElement('span');
							newSpan.appendChild(window_documents[0].createTextNode('Gggggggggg'));
							newLine.appendChild(newSpan);

							newLine.appendChild(window_documents[0].createTextNode('\n'));

							windows[0].appendChild(newLine);
					}],
		'tb': ['(temporary testing function for new screen handler)','',
					function(a) {
							window_current_x[0] = 25;
							window_current_y[0] = 0;
							chalk(0, 0, 0, 0, 'X');
					}],
		'about': ['show the about box',
						 '...',
						 function (a) {
								 // simple JS alert for now.
								 alert('Gnusto v0.2.0\nby Thomas Thurman <thomas@thurman.org.uk>\n'+
											 'Early prealpha\n\nhttp://gnusto.mozdev.org\nhttp://marnanel.org\n\n'+
											 'Copyright (c) 2003 Thomas Thurman.\nDistrubuted under the GNU GPL.');
						 }],
};

function tossio_debug_instruction(command) {

		// FIXME: these should be equivalences:
		//   /%2E=177 and /put %2E 177
		//   /%2E     and /get %2E

		if (tossio_verbs[command[0]])
				tossio_verbs[command[0]][2](command);
		else
				tossio_print('Unknown command: /'+command[0]+'. Try "/help".');

		tossio_print('\n');
}

function tossio_notify_breakpoint_hit() {
		tossio_print('\n ** Hit breakpoint. **\n');
}

////////////////////////////////////////////////////////////////
TOSSIO_HAPPY = 1;
////////////////////////////////////////////////////////////////
