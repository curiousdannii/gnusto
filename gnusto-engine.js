// gnusto-lib.js || -*- Mode: Java; tab-width: 2; -*-
// The Gnusto JavaScript Z-machine library.
// $Header: /cvs/gnusto/src/gnusto/content/Attic/gnusto-lib.js,v 1.97 2003/08/12 23:42:28 marnanel Exp $
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

////////////////////////////////////////////////////////////////
/////////////////////// Global variables ///////////////////////
		////////////////////////////////////////////////////////////////

		// This will hold the filename of the current game file (so we can
		// reset the memory from it as needed.
		var local_game_file = 0;

// These are all initialised in the function engine_start_game().

// The actual memory of the Z-machine, one byte per element.
var engine__memory = [];

// |jit| is a cache for the results of dissemble(): it maps
// memory locations to JS function objects. Theoretically,
// executing the function associated with a given address is
// equivalent to executing the z-code at that address.
//
// Note: the results of dissembly in dynamic memory should never
// be put into this array, since the code can change.
//
// Planned features:
//    1) dissemble() should know about this array, and should stop
//       dissembly if its program counter reaches any key in it.
//    2) putting a flag value (probably zero) into this array will
//       have the effect of 1), but won't stop us replacing it with
//       real code later.
var jit = [];

// In ordinary use, dissemble() attempts to make the functions
// it creates as long as possible. Sometimes, though, we have to
// stop dissembling (for example, when we reach a RETURN) or it
// will seem a good idea (say, when we meet an unconditional jump).
// In such cases, a subroutine anywhere along the line may set
// |compiling| to 0, and dissemble() will stop after the current
// iteration.
var compiling;

// |gamestack| is the Z-machine's stack.
var gamestack;

// |himem| is the high memory mark. This is rarely used in practice;
// we might stop noting it.
var himem;

// |pc| is the Z-machine's program counter.
var pc;

// |this_instr_pc| is the address of the current instruction.
var this_instr_pc;

// |dict_start| is the address of the dictionary in the Z-machine's memory.
var dict_start;

// |objs_start| is the address of the object table in the Z-machine's memory.
var objs_start;

// |vars_start| is the address of the global variables in the Z-machine's
// memory.
var vars_start;

// |stat_start| is the address of the bottom of static memory.
// Anything below this can change during the games. Anything
// above this does not change like the shifting shadows.
var stat_start;

// Address of the start of the abbreviations table in memory. (Can this
// be changed? If not, we could decode them all first.)
var abbr_start;

// Address of the start of the header extension table in memory.
var hext_start;

// Address of custom alphabet table (if any).
var alpha_start;

// Address of Unicode Translation Table (if any).
var unicode_start = 0;
var custom_unicode_charcount = 0;

// Information about the defined list of word separators
var separator_count = 0;
var separators = [];

// |call_stack| stores all the return addresses for all the functions
// which are currently executing.
var call_stack;

// |locals| is an array of the Z-machine's local variables.
var locals;

// |locals_stack| is a stack of the values of |locals| for functions
// further down the call stack than the current function.
var locals_stack;

// |param_counts| is an array which stores the number of parameters for
// each of the variables on |call_stack|, and the current function (so
// that the number of parameters to the current function is in
// param_counts[0]). (Hmm, that's a bit inconsistent. We should change it.)
var param_counts;

// |result_eaters| is a stack whose use parallels |call_stack|. Instead of
// storing return addresses, though, |result_eaters| stores function objects.
// Each of these gets executed as the function returns. For example, if a
// function contains:
//
//    b000: locals[7] = foo(locals[1])
//    b005: something else
//
// and we're just now returning from the call to foo() in b000, the only
// legitimate value we can set the PC to is b005 (b000 would cause an
// infinite loop, after all), but we can't go on to b005 because we haven't
// finished executing b000 yet. So on the top of |result_eaters| there'll be
// a function object which stores values in locals[7].
//
// |result_eaters| may contain zeroes as well as function objects. These are
// treated as no-ops.
//
// It might seem sensible to do without |call_stack| altogether, since an entry
// in |result_eaters| may set the PC. However, having a list of return
// addresses enables us to print a call stack.
var result_eaters;

// The function object to run first next time engine_run() gets called,
// before any other execution gets under way. Its argument will be the
// |answer| formal parameter of engine_run(). It can also be 0, which
// is a no-op. engine_run() will clear it to 0 after running it, whatever
// happens.
var rebound;

// Whether we're writing output to the ordinary screen (stream 1).
var output_to_console;

// Stream 2 is whether we're writing output to a game transcript,
// but the state for that is stored in a bit in "Flags 2" in the header.

// A list of streams writing out to main memory (collectively, stream 3).
// The stream at the start of the list is the current one.
// Each stream is represented as a list with two elements: [|start|, |end|].
// |start| is the address at the start of the memory block where the length
// of the block will be stored after the stream is closed. |end| is the
// current end of the block.
var streamthrees;

// Whether we're writing copies of input to a script file (stream 4).
// fixme: This is really something we need to tell the environment about,
// since we can't deal with it ourselves.
var output_to_script;

// FIXME: Clarify the distinction here
// If this is 1, engine_run() will "wimp out" after every opcode.
var single_step = 0;
var debug_mode = 0;
var parser_debugging = 0;

// Hash of breakpoints. If dissemble() reaches one of these, it will stop
// before executing that instruction with GNUSTO_EFFECT_BREAKPOINT, and the
// PC set to the address of that instruction.
//
// The keys of the hash are opcode numbers. The values are not yet stably
// defined; at present, all values should be 1, except that if a breakpoint's
// value is 2, it won't trigger, but it will be reset to 1.
var breakpoints = {};

// Buffer of text written to console.
var engine__console_buffer = '';

// Buffer of text written to transcript.
var engine__transcript_buffer = '';

// Effect parameters hold additional information for effect codes.
var engine__effect_parameters = 0;

var engine__random_seed = 0;
var engine__use_seed = 0; 

// Values of the bottom two bits in Flags 2 (address 0x11),
// used by the zOut function.
// See <http://mozdev.org/bugs/show_bug.cgi?id=3344>.
var engine__printing_header_bits = 0;

// Leftover text which should be printed next engine_run(), since
// we couldn't print it this time because the flags had
// changed.
var engine__leftovers = '';

////////////////////////////////////////////////////////////////
//////////////// Functions to support handlers /////////////////
////////////////////////////////////////////////////////////////
//
// Each of these functions is used by the members of the
// |handlers| array, below.
//
////////////////////////////////////////////////////////////////
//
// Returns a string of JS code to set the PC to the address in
// |packed_target|, based on the current architecture.
function pc_translate(packed_target) {

		// Well, we only support z5 at the moment.
		// Numbers assigned to the PC in z5 are treated as unsigned
		// and multiplied by four.
		return '(('+packed_target+')&0xFFFF)*4';

		// Would be good if we could pick up when it was a constant...
}

function call_vn(args, offset) {
		//VERBOSE burin('call_vn','gosub(' + args[0] + '*4, args)');
		compiling = 0;
		var address = pc;
		if (offset) { address += offset; }

		return 'gosub('+
				pc_translate(args[0])+','+
				'['+args.slice(1)+'],'+
				(address) + ',0)';
}

function brancher(condition) {
		var inverted = 1;
		var temp = zGetByte(pc++);
		var target_address = temp & 0x3F;

		if (temp & 0x80) inverted = 0;
		if (!(temp & 0x40)) {
				target_address = (target_address << 8) | zGetByte(pc++);
				// and it's signed...

				if (target_address & 0x2000) {
						// sign bit's set; propagate it
						target_address =
								(~0x1FFF) | (target_address & 0x1FFF);
				}
		}

		var if_statement = condition;

		if (inverted) {
				if_statement = 'if(!('+if_statement+'))';
		} else {
				if_statement = 'if('+if_statement+')';
		}

		// Branches to the addresses 0 and 1 are actually returns with
		// those values.

		if (target_address == 0)
				return if_statement + '{gnusto_return(0);return;}';

		if (target_address == 1)
				return if_statement + '{gnusto_return(1);return;}';

		target_address = (pc + target_address) - 2;

		// This is an optimisation that's currently unimplemented:
		// if there's no code there, we should mark that we want it later.
		//  [ if (!jit[target_address]) jit[target_address]=0; ]

		return if_statement + '{pc='+
				(target_address)+';return;}';
}

function code_for_varcode(varcode) {
		if (varcode==0)
				return 'gamestack.pop()';
		else if (varcode < 0x10)
				return 'locals['+(varcode-1)+']';
		else
				return 'zGetWord('+(vars_start+(varcode-16)*2)+')';

		gnusto_error(170); // impossible
}

function store_into(lvalue, rvalue) {
		if (rvalue.substring && rvalue.substring(0,5)=='gosub') {
				// Special case: the results of gosubs can't
				// be stored synchronously.

				compiling = 0; // just to be sure we stop here.

				if (rvalue.substring(rvalue.length-3)!=',0)') {
						// You really shouldn't pass us gosubs with
						// the result function filled in.
						gnusto_error(100, rvalue); // can't modify gosub
				}

				// Twist the lvalue into a function definition.

				return rvalue.substring(0,rvalue.length-2) +
						'function(r){'+
						store_into(lvalue,'r')+
						'})';
		}

		if (lvalue=='gamestack.pop()') {
				return 'gamestack.push('+rvalue+')';
		} else if (lvalue.substring(0,9)=='zGetWord(') {
				return 'zSetWord('+rvalue+','+lvalue.substring(9);
		} else if (lvalue.substring(0,9)=='zGetByte(') {
				return 'zSetByte('+rvalue+','+lvalue.substring(9);
		} else {
				return lvalue + '=' + rvalue;
		}
}

function storer(rvalue) {
		return store_into(code_for_varcode(zGetByte(pc++)), rvalue);
}

////////////////////////////////////////////////////////////////
// Effect codes, returned from engine_run(). See the explanation below
// for |handlers|.

// Returned when we're expecting a line of keyboard input.
// TODO: The lowest nibble may be 1 if the Z-machine has asked
// for timed input.
//
// Answer with the string the user has entered.
var GNUSTO_EFFECT_INPUT      = 0x100;

// Returned when we're expecting a single keypress (or mouse click).
// TODO: The lowest nibble may be 1 if the Z-machine has asked
// for timed input.
//
// Answer with the ZSCII code for the key pressed (see the Z-spec).
var GNUSTO_EFFECT_INPUT_CHAR = 0x110;

// Returned when the Z-machine requests we save the game.
// Answer as in the Z-spec: 0 if we can't save, 1 if we can, or
// 2 if we've just restored.
var GNUSTO_EFFECT_SAVE       = 0x200;

// Returned when the Z-machine requests we load a game.
// Answer 0 if we can't load. (If we can, we won't be around to answer.)
var GNUSTO_EFFECT_RESTORE    = 0x300;

// Returned when the Z-machine requests we quit.
// Not to be answered, obviously.
var GNUSTO_EFFECT_QUIT       = 0x400;

// Returned when the Z-machine requests that we restart a game.
// Assumedly, we won't be around to answer
var GNUSTO_EFFECT_RESTART    = 0x410;

// Returned if we've run for more than a certain number of iterations.
// This means that the environment gets a chance to do some housekeeping
// if we're stuck deep in computation, or to break an infinite loop
// within the Z-code.
//
// Any value may be used as an answer; it will be ignored.
var GNUSTO_EFFECT_WIMP_OUT   = 0x500;

// Returned if we hit a breakpoint.
// Any value may be used as an answer; it will be ignored.
var GNUSTO_EFFECT_BREAKPOINT = 0x510;

// Returned if either of the two header bits which
// affect printing have changed since last time
// (or if either of them is set on first printing).
var GNUSTO_EFFECT_FLAGS_CHANGED                 = 0x520;

// Returned if the story wants to verify its own integrity.
// Answer 1 if its checksum matches, or 0 if it doesn't.
var GNUSTO_EFFECT_VERIFY     = 0x600;

// Returned if the story wants to check whether it's been pirated.
// Answer 1 if it is, or 0 if it isn't.
// You probably just want to return 0.
var GNUSTO_EFFECT_PIRACY     = 0x610;

// Returned if the story wants to set the text style.
// engine_effect_parameters() will return a list:
//  [0] = a bitcoded text style, as in the Z-spec,
//         or -1 not to set the style.
//  [1] = the foreground colour to use, as in the Z-spec
//  [2] = the background colour to use, as in the Z-spec
// Any value may be used as an answer; it will be ignored.
var GNUSTO_EFFECT_STYLE          = 0x700;

// Returned if the story wants to cause a sound effect.
// engine_effect_parameters() will return a list, whose
// vales aren't fully specified at present.
// (Just go "bleep" for now.)
//
// Any value may be used as an answer; it will be ignored.
var GNUSTO_EFFECT_SOUND          = 0x800;

var GNUSTO_EFFECT_SPLITWINDOW    = 0x900;
var GNUSTO_EFFECT_SETWINDOW      = 0x910;
var GNUSTO_EFFECT_ERASEWINDOW    = 0x920;
var GNUSTO_EFFECT_ERASELINE      = 0x930;

// Returned if the story wants to set the position of
// the cursor in the upper window. The upper window should
// be currently active.
//
// engine_effect_parameters() will return a list:
//  [0] = the new Y coordinate
//  [1] = the new X coordinate
// Any value may be used as an answer; it will be ignored.
var GNUSTO_EFFECT_SETCURSOR      = 0x940;

var GNUSTO_EFFECT_SETBUFFERMODE  = 0x950;
var GNUSTO_EFFECT_SETINPUTSTREAM = 0x960;
var GNUSTO_EFFECT_GETCURSOR = 0x970;

// Returned if the story wants to print a table, as with
// @print_table. (This is complicated enough to get its
// own effect code, rather than just using an internal buffer
// as most printing does.)
//
// engine_effect_parameters() will return a list of lines to print.
//
// Any value may be used as an answer; it will be ignored.
var GNUSTO_EFFECT_PRINTTABLE     = 0xA00;

////////////////////////////////////////////////////////////////
//
// Support functions for the functions within |handlers|

function handler_call(target, arguments) {
		compiling=0; // Got to stop after this.
		var functino = "function(r){"+storer("r")+";});";
		// (get it calculated so's the pc will be right)
		return "gosub("+pc_translate(target)+",["+arguments+"],"+pc+","+
				functino;
}

// Returns a JS string that calls zOut() correctly to print
// the line of text in |text|. (See zOut() for details of
// what constitutes "correctly".)
//
// If |is_return| is set, the result will cause a Z-machine
// return with a result of 1 (the same result as @rtrue).
// If it's clear, the result will set the PC to the
// address immediately after the current instruction.
function handler_zOut(text, is_return) {

		var setter;

		if (is_return) {
				setter = 'gnusto_return(1)';
		} else {
				setter = 'pc=0x'+pc.toString(16);
		}

		return 'if(zOut('+text+')){' + setter +
				';return '+ GNUSTO_EFFECT_FLAGS_CHANGED +	'}';
}

// Returns a JS string which will print the text encoded
// immediately after the current instruction.
//
// |dummy| is a dummy parameter that's never checked. It's
// here so that this function can be directly used as a handler
// in its own right (so it'll get passed the argument list,
// which is always empty for @print and @print_ret).
//
// |suffix| is a string to add to the encoded string. It may
// be null, in which case no string will be added.
//
// |is_return| is passed through unchanged to handler_zOut()
// (this function is written in terms of that function).
// See the comments for that function for details.
function handler_print(dummy, suffix, is_return) {
		
		var zf = zscii_from(pc,65535,1);
		var message = zf[0];

		if (suffix) message = message + suffix;

		message=message.
				replace('\\','\\\\','g').
				replace('"','\\"','g').
				replace('\n','\\n','g'); // not elegant
		pc=zf[1];
		//VERBOSE burin('print',message);
		return handler_zOut('"'+message+'"', is_return);
}

////////////////////////////////////////////////////////////////
//
// |handlers|
//
// An array mapping opcodes to functions. Each function is passed
// a series of arguments (between zero and eight, as the Z-machine
// allows) as an array, called |a| below. It returns a string of JS,
// called |r| in these comments, which can be evaluated to do the job of that
// opcode. Note, again, that this is a string (not a function object).
//
// Extended ("EXT") opcodes are stored 1000 higher than their number.
// For example, 1 is "je", but 1001 is "restore".
//
// |r|'s code may set |compiling| to 0 to stop dissemble() from producing
// code for any more opcodes after this one. (dissemble() likes to group
// code up into blocks, where it can.)
//
// |r|'s code may contain a return statement for two reasons: firstly, to
// prevent execution of any further generated code before we get to take
// our bearings again (for example, |r| must cause a return if it knows that
// the program counter has been modified: PC changes can't take effect until
// the next lookup of a code block, so we need to force that to happen
// immediately). In such cases, return zero or an undefined result. Secondly,
// we can return a numeric value to cause an effect in the external
// environment. See "effect codes" above for the values.
//
// If |r|'s code contains a return statement, it must make sure to set the PC
// somehow, either directly or, for example, via gnusto_return().
//
var handlers = {

		1: function Z_je(a) { 		

				if (a.length<2) { 
						//VERBOSE burin('je','noop');
						return ''; // it's a no-op
				} else if (a.length==2) { 
						//VERBOSE burin('je',a[0] + '==' + a[1]);
						return brancher(a[0]+'=='+a[1]);
				} else {
						var condition = '';
						for (var i=1; i<a.length; i++) {
								if (i!=1) condition = condition + '||';
								condition = condition + 't=='+a[i];
						}
						//VERBOSE burin('je','t=' + a[0] + ';' + condition);
						return 't='+a[0]+';'+brancher(condition);
				}
		},
		2: function Z_jl(a) {
				//VERBOSE burin('jl',a[0] + '<' + a[1]); 
				return brancher(a[0]+'<'+a[1]); },
		3: function Z_jg(a) { 
				//VERBOSE burin('jg',a[0] + '>'+a[1]);
				return brancher(a[0]+'>'+a[1]); },

		4: function Z_dec_chk(a) {
				var value = code_for_varcode(a[0]);
				//VERBOSE burin('dec_chk',value + '-1 < ' + a[1]);
				return 't=('+value+')-1;'+
				store_into(value,'t')+';'+
				brancher('t<'+a[1]);
		},
		5: function Z_inc_chk(a) {
				var value = code_for_varcode(a[0]);
				//VERBOSE burin('inc_chk',value + '+1 > ' + a[1]);
				return 't=('+value+')+1;'+
				store_into(value,'t')+';'+
				brancher('t>'+a[1]);
		},
		6: function Z_jin(a) {
				//VERBOSE burin('jin',a[0] + ',' + a[1]);
				return brancher("obj_in("+a[0]+','+a[1]+')');
		},
		7: function Z_test(a) {
				//VERBOSE burin('test','t='+a[1]+';br(' + a[0] + '&t)==t)');
				return 't='+a[1]+';'+brancher('('+a[0]+'&t)==t');
		},
		8: function Z_or(a) {
				//VERBOSE burin('or','('+a[0] + '|' + a[1]+')&0xFFFF');
				return storer('('+a[0]+'|'+a[1]+')&0xffff');
		},
		9: function Z_and(a) {
				//VERBOSE burin('and',a[0] + '&' + a[1] + '&0xFFFF');
				return storer(a[0]+'&'+a[1]+'&0xffff');
		},
		10: function Z_test_attr(a) {
				//VERBOSE burin('test_attr',a[0] + ',' + a[1]);
				return brancher('test_attr('+a[0]+','+a[1]+')');
		},
		11: function Z_set_attr(a) {
				//VERBOSE burin('set_attr',a[0] + ',' + a[1]);
				return 'set_attr('+a[0]+','+a[1]+')';
		},
		12: function Z_clear_attr(a) {
				//VERBOSE burin('clear_attr',a[0] + ',' + a[1]);
				return 'clear_attr('+a[0]+','+a[1]+')';
		},
		13: function Z_store(a) {
				//VERBOSE burin('store_into',a[0] + ',' + a[1]);
				return store_into(code_for_varcode(a[0]), a[1]);
		},
		14: function Z_insert_obj(a) {
				//VERBOSE burin('insert_obj',a[0] + ',' + a[1]);
				return "insert_obj("+a[0]+','+a[1]+")";
		},
		15: function Z_loadw(a) {
				//VERBOSE burin('loadw',"zGetWord((1*"+a[0]+"+2*"+a[1]+")&0xFFFF)");
				return storer("zGetWord((1*"+a[0]+"+2*"+a[1]+")&0xFFFF)");
		},
		16: function Z_loadb(a) {
				//VERBOSE burin('loadb',"zGetByte((1*"+a[0]+"+1*"+a[1]+")&0xFFFF)");
				return storer("zGetByte((1*"+a[0]+"+1*"+a[1]+")&0xFFFF)");
		},
		17: function Z_get_prop(a) {
				//VERBOSE burin('get_prop',a[0]+','+a[1]);
				return storer("get_prop("+a[0]+','+a[1]+')');
		},
		18: function Z_get_prop_addr(a) {
				//VERBOSE burin('get_prop_addr',a[0]+','+a[1]);
				return storer("get_prop_addr("+a[0]+','+a[1]+')');
		},
		19: function Z_get_next_prop(a) {
				//VERBOSE burin('get_next_prop',a[0]+','+a[1]);
				return storer("get_next_prop("+a[0]+','+a[1]+')');
		},
		20: function Z_add(a) { 
				//VERBOSE burin('add',a[0]+'+'+a[1]);
				return storer(a[0]+'+'+a[1]); },
		21: function Z_sub(a) { 
				//VERBOSE burin('sub',a[0]+'-'+a[1]);
				return storer(a[0]+'-'+a[1]); },
		22: function Z_mul(a) { 
				//VERBOSE burin('mul',a[0]+'*'+a[1]);
				return storer(a[0]+'*'+a[1]); },
		23: function Z_div(a) {
				//VERBOSE burin('div',a[0]+'/'+a[1]);
				return storer('trunc_divide('+a[0]+','+a[1]+')');
		},
		24: function Z_mod(a) { 
				//VERBOSE burin('mod',a[0]+'%'+a[1]);
				return storer(a[0]+'%'+a[1]);
		},
		25: function Z_call_2s(a) {
				//VERBOSE burin('call2s',a[0]+'-'+a[1]);
				return handler_call(a[0], a[1]);
		},
		26: function Z_call_2n(a) {
				//VERBOSE burin('call2n','gosub(('+a[0]+'&0xFFFF)*4),'+ a[1]+','+pc +',0');
				// can we use handler_call here, too?
				compiling=0; // Got to stop after this.
				return "gosub("+pc_translate(a[0])+",["+a[1]+"],"+pc+",0)";
		},
		27: function Z_set_colour(a) {
				//VERBOSE burin('set_colour',a[0] + ',' + a[1]);
				return "pc="+pc+";engine__effect_parameters=[-1,"+a[0]+','+a[1]+"];return "+GNUSTO_EFFECT_STYLE;
		},
		28: function Z_throw(a) {
				// FIXME: I don't know whether this works; Inform never uses this
				// opcode, and I don't have any of Infocom's original games around.
				// If you know whether it works or doesn't, please say at
				// <http://mozdev.org/bugs/show_bug.cgi?id=3467>. Thanks.
		 		//VERBOSE burin('throw','throw_stack_frame('+a[0]+');return');
				compiling = 0;
				return "throw_stack_frame("+a[0]+");return";
		},
		128: function Z_js(a) {
				//VERBOSE burin('js',a[0]+'==0');
				return brancher(a[0]+'==0');
		},
		129: function Z_get_sibling(a) {
				//VERBOSE burin('get_sibling',"t=get_sibling("+a[0]+");");
				return "t=get_sibling("+a[0]+");"+storer("t")+";"+brancher("t");
		},
		130: function Z_get_child(a) {
				//VERBOSE burin('get_child',"t=get_child("+a[0]+");");
				return "t=get_child("+a[0]+");"+
				storer("t")+";"+
				brancher("t");
		},
		131: function Z_get_parent(a) {
				//VERBOSE burin('get_parent',"get_parent("+a[0]+");");
				return storer("get_parent("+a[0]+")");
		},
		132: function Z_get_prop_len(a) {
				//VERBOSE burin('get_prop_len',"get_prop_len("+a[0]+");");
				return storer("get_prop_len("+a[0]+')');
		},
		133: function Z_inc(a) {
				var c=code_for_varcode(a[0]);
				//VERBOSE burin('inc',c + '+1');
				return store_into(c, c+'+1');
		},
		134: function Z_dec(a) {
				var c=code_for_varcode(a[0]);
				//VERBOSE burin('dec',c + '-1');
				return store_into(c, c+'-1');
		},
		135: function Z_print_addr(a) {
				//VERBOSE burin('print_addr','zscii_from('+a[0]+')');
				return handler_zOut('zscii_from('+a[0]+')',0);
		},
		136: function Z_call_1s(a) {
				//VERBOSE burin('call_1s','handler_call('+a[0]+')');
				return handler_call(a[0], '');
		},
		137: function Z_remove_obj(a) {
				//VERBOSE burin('remove_obj',"remove_obj("+a[0]+','+a[1]+")");
				return "remove_obj("+a[0]+','+a[1]+")";
		},
		138: function Z_print_obj(a) {
				//VERBOSE burin('print_obj','name_of_object('+a[0]+',0)');
				return handler_zOut("name_of_object("+a[0]+")",0);
		},
		139: function Z_ret(a) {
				//VERBOSE burin('ret',"gnusto_return("+a[0]+');return');
				compiling=0;
				return "gnusto_return("+a[0]+');return';
		},
		140: function Z_jump(a) {
				compiling=0;
				if (a[0] & 0x8000) {
						a[0] = (~0xFFFF) | a[0];
				}
				
				var addr=(a[0] + pc) - 2;
				//VERBOSE burin('jump',"pc="+addr+";return");
				return "pc="+addr+";return";
		},
		141: function Z_print_paddr(a) {
				//VERBOSE burin('print_paddr',"zscii_from((("+a[0]+")&0xFFFF)*4)");
				return handler_zOut("zscii_from("+pc_translate(a[0])+")",0);
		},
		142: function Z_load(a) {
				
				// Warning: This has never been tested, since Inform does
				// not generate this opcode. If you're able to test it,
				// please report the results at
				// <http://mozdev.org/bugs/show_bug.cgi?id=3468>.
				
				var c=code_for_varcode(a[0]);
				//VERBOSE burin('load',"store " + c);
				return storer(c);
		},
		143: function Z_call_1n(a) {
				// can we use handler_call here, too?
				compiling=0; // Got to stop after this.
				//VERBOSE burin('call_1n',"gosub(" + a[0] + '*4)');
				return "gosub("+pc_translate(a[0])+",[],"+pc+",0)"
		},
		
		176: function Z_rtrue(a) {
				//VERBOSE burin('rtrue',"gnusto_return(1);return");
				compiling=0;
				return "gnusto_return(1);return";
		},
		177: function Z_rfalse(a) {
				//VERBOSE burin('rfalse',"gnusto_return(0);return");
				compiling=0;
				return "gnusto_return(0);return";
		},
		178: handler_print, // (Z_print)
		179: function Z_print_ret(a) {
				compiling = 0;
				//VERBOSE burin('printret',"see handler_print");
				return handler_print(0,'\n',1)+';gnusto_return(1);return';
		},
		180: function Z_nop(a) {
				//VERBOSE burin('noop','');
				return "";
		},
		
		//181: save (illegal in V5)
		
		//182: restore (illegal in V5)
		
		//183: restart (currently unimplemented)
		183: function Z_restart(a) {
				//VERBOSE burin('restart','');
				compiling=0;
				return "return "+GNUSTO_EFFECT_RESTART;	
		},
		
		184: function Z_ret_popped(a) {
				//VERBOSE burin('pop',"gnusto_return(gamestack.pop());return");
				compiling=0;
				return "gnusto_return(gamestack.pop());return";
		},
		185: function Z_catch(a) {
				// The stack frame cookie is specified by Quetzal 1.3b s6.2
				// to be the number of frames on the stack.
				//VERBOSE burin('catch',"store call_stack.length");
				return storer("call_stack.length");
		},
		186: function Z_quit(a) {
				//VERBOSE burin('quit','');
				compiling=0;
				return "return "+GNUSTO_EFFECT_QUIT;
		},

		187: function Z_new_line(a) {
				//VERBOSE burin('newline','');
				return handler_zOut("'\\n'",0);
		},
		
		188: function Z_show_status(a){ //(illegal from V4 onward)
				//VERBOSE burin('illegalop','188');
				gnusto_error(199);
		},

		189: function Z_verify(a) {
				compiling = 0;

				var setter = 'rebound=function(n){'+brancher('n')+'};';
				//VERBOSE burin('verify',"pc="+pc+";"+setter+"return GNUSTO_EFFECT_VERIFY");
				return "pc="+pc+";"+setter+"return "+GNUSTO_EFFECT_VERIFY;
		},
		
		190: function Z_illegal_extended(a) {
				// 190 can't be generated; it's the start of an extended opcode
				//VERBOSE burin('illegalop','190');
				gnusto_error(199);
		},
		
		191: function Z_piracy(a) {
				compiling = 0;
				
				var setter = 'rebound=function(n){'+brancher('(!n)')+'};';
				//VERBOSE burin('piracy',"pc="+pc+";"+setter+"return GNUSTO_EFFECT_PIRACY");
				return "pc="+pc+";"+setter+"return "+GNUSTO_EFFECT_PIRACY;
		},
		
		224: function Z_call_vs(a) {
				//VERBOSE burin('call_vs','see call_vn');
				return storer(call_vn(a,1));
		},

		225: function Z_store_w(a) {
				//VERBOSE burin('storew',"zSetWord("+a[2]+",1*"+a[0]+"+2*"+a[1]+")");
				return "zSetWord("+a[2]+",1*"+a[0]+"+2*"+a[1]+")";
		},

		226: function Z_storeb(a) {
				//VERBOSE burin('storeb',"zSetByte("+a[2]+",1*"+a[0]+"+1*"+a[1]+")");
				return "zSetByte("+a[2]+",1*"+a[0]+"+1*"+a[1]+")";
		},

		227: function Z_putprop(a) {
				//VERBOSE burin('putprop',"put_prop("+a[0]+','+a[1]+','+a[2]+')');
				return "put_prop("+a[0]+','+a[1]+','+a[2]+')';
		},
		228: function Z_read(a) {
				
				// read, aread, sread, whatever it's called today.
				// That's something that we can't deal with within gnusto:
				// ask the environment to magic something up for us.

				if (a[3]) {
						// ...then we should do something with a[2] and a[3],
						// which are timed input parameters. For now, though,
						// we'll just ignore them.
						//VERBOSE burin('read',"should have been timed-- not yet supported");
				}

				compiling = 0;
				
				var setter = "rebound=function(n){" +
				storer("aread(n, a0," + a[1] + ")") +
				"};";

				//VERBOSE burin('read',"var a0=eval("+ a[0] + ");" + "pc=" + pc + ";" +
				setter + "engine__effect_parameters={"+
				"'recaps':" + "zGetByte(a0+1),"+
				"'maxchars':" + "zGetByte(a0),"+
				"};" + "return GNUSTO_EFFECT_INPUT";

				return "var a0=eval("+ a[0] + ");" +
				"pc=" + pc + ";" +
				setter +
				"engine__effect_parameters={"+
				"'recaps':"   + "zGetByte(a0+1),"+
				"'maxchars':" + "zGetByte(a0),"+
				"};" +
				"return "+GNUSTO_EFFECT_INPUT;
		},
		229: function Z_print_char(a) {
				//VERBOSE burin('print_char','zscii_char_to_ascii('+a[0]+')');
				return handler_zOut('zscii_char_to_ascii('+a[0]+')',0);
		},
		230: function Z_print_num(a) {
				//VERBOSE burin('print_num','handler_zout('+a[0]+')');
				return handler_zOut(a[0],0);
		},
		231: function Z_random(a) {
				//VERBOSE burin('random',"gnusto_random("+a[0]+")");
				return storer("gnusto_random("+a[0]+")");
		},
		232: function Z_push(a) {
				//VERBOSE burin('push',a[0]);
				return store_into('gamestack.pop()', a[0]);
		},
		233: function Z_pull(a) {
				var c=code_for_varcode(a[0]);
				//VERBOSE burin('pull',c +'=gamestack.pop()');
				return store_into(c, 'gamestack.pop()');
		},
		234: function Z_split_window(a) {
				compiling=0;
				//VERBOSE burin('split_window','lines=' + a[0]);
				return "pc="+pc+";engine__effect_parameters="+a[0]+";return "+GNUSTO_EFFECT_SPLITWINDOW;
		},
		235: function Z_set_window(a) {
				compiling=0;
				//VERBOSE burin('set_window','win=' + a[0]);
				return "pc="+pc+";engine__effect_parameters="+a[0]+";return "+GNUSTO_EFFECT_SETWINDOW;
		},
		236: function Z_call_vs2(a) {
				//VERBOSE burin('call_vs2',"see call_vn");
				return storer(call_vn(a,1));
		},
		237: function Z_erase_window(a) {
				compiling=0;
				//VERBOSE burin('erase_window','win=' + a[0]);
				return "pc="+pc+";engine__effect_parameters="+a[0]+";return "+GNUSTO_EFFECT_ERASEWINDOW;
		},
		238: function Z_erase_line(a) {
				compiling=0;
				//VERBOSE burin('erase_line',a[0]);
				return "pc="+pc+";engine__effect_parameters="+a[0]+";return "+GNUSTO_EFFECT_ERASELINE;
		},
		239: function Z_set_cursor(a) {
				compiling=0;
				//VERBOSE burin('set_cursor',' ['+a[0]+', ' + a[1] + '] ');
				return "pc="+pc+";engine__effect_parameters=["+a[0]+","+a[1]+"];return "+GNUSTO_EFFECT_SETCURSOR;
		},
		
		240: function Z_get_cursor(a) {
				compiling=0;
				//VERBOSE burin('get_cursor',a[0]);
				return "pc="+pc+";engine__effect_parameters="+a[0]+";return "+GNUSTO_EFFECT_GETCURSOR;
		},
		
		241: function Z_set_text_style(a) {
				compiling=0;
				//VERBOSE burin('set_text_style',a[0]);
				return "pc="+pc+";engine__effect_parameters=["+a[0]+",0,0];return "+GNUSTO_EFFECT_STYLE;
		},
		
		242: function Z_buffer_mode(a) {
				compiling=0;
				//VERBOSE burin('buffer_mode',a[0]);
				return "pc="+pc+";engine__effect_parameters="+a[0]+";return "+GNUSTO_EFFECT_SETBUFFERMODE;
		},
		
		243: function Z_output_stream(a) {
				//VERBOSE burin('output_stream',a[0]+', ' + a[1]);
				return 'set_output_stream('+a[0]+','+a[1]+')';
		},
		
		244: function Z_input_stream(a) {
				compiling=0;
				//VERBOSE burin('input_stream',a[0]);
				return "pc="+pc+";engine__effect_parameters="+a[0]+";return "+GNUSTO_EFFECT_SETINPUTSTREAM;
		},
		
		245: function Z_sound_effect(a) {
				// We're rather glossing over whether and how we
				// deal with callbacks at present.
				
				compiling=0;
				//VERBOSE burin('sound_effect','better logging later');
				while (a.length < 5) { a.push(0); }
				return "pc="+pc+';engine__effect_parameters=['+a[0]+','+a[1]+','+a[2]+','+a[3]+','+a[4]+'];return '+GNUSTO_EFFECT_SOUND;
		},
		
		246: function Z_read_char(a) {
				// Maybe factor out "read" and this?
				//VERBOSE burin('read_char','');
				// a[0] is always 1; probably not worth checking for this
				
				if (a[3]) {
						// ...then we should do something with a[2] and a[3],
						// which are timed input parameters. For now, though,
						// we'll just ignore them.
						//VERBOSE burin('read_char','should have been timed-- not yet supported');
				}
				
				compiling = 0;
				
				var setter = "rebound=function(n) { " +
				storer("n") +
				"};";
				
				return "pc="+pc+";"+setter+"return "+GNUSTO_EFFECT_INPUT_CHAR;
		},
		
		247: function Z_scan_table(a) { 
				//VERBOSE burin('scan_table',"t=scan_table("+a[0]+','+a[1]+"&0xFFFF,"+a[2]+"&0xFFFF," + a[3]+");");
				if (a.length == 4) {
						return "t=scan_table("+a[0]+','+a[1]+"&0xFFFF,"+a[2]+"&0xFFFF," + a[3]+");" +
						storer("t") + ";" +  brancher('t');
				} else { // must use the default for Form, 0x82
						return "t=scan_table("+a[0]+','+a[1]+"&0xFFFF,"+a[2]+"&0xFFFF," + 0x82 +");" +
						storer("t") + ";" +  brancher('t');
				}
		},
		
		248: function Z_not(a) {
				//VERBOSE burin('not','~'+a[1]+'&0xffff');
				return storer('~'+a[1]+'&0xffff');
		},
		
		249: call_vn,
		
		250: call_vn, // call_vn2,
		
		251: function Z_tokenise(a) {
				//VERBOSE burin('tokenise',"engine__tokenise("+a[0]+","+a[1]+","+a[2]+","+a[3]+")");
				return "engine__tokenise("+a[0]+","+a[1]+","+a[2]+","+a[3]+")";
		},
		
		252: function Z_encode_text(a) {
				//VERBOSE burin('tokenise',"engine__encode_text("+a[0]+","+a[1]+","+a[2]+","+a[3]+")");
				return "engine__encode_text("+a[0]+","+a[1]+","+a[2]+","+a[3]+")";
		},

		253: function Z_copy_table(a) {
				//VERBOSE burin('copy_table',"copy_table("+a[0]+','+a[1]+','+a[2]+")");
				return "copy_table("+a[0]+','+a[1]+','+a[2]+")";
		},
		
		254: function Z_print_table(a) {
				
				// Jam in defaults:
				if (a.length < 4) { a.push(1); } // default height
				if (a.length < 5) { a.push(0); } // default skip
				//VERBOSE burin('print_table',"print_table("+a[0]+','+a[1]+','+a[2]+',' + a[3]+')');
				return "pc="+pc+";engine__effect_parameters=engine__print_table("+a[0]+","+a[1]+","+a[2]+","+a[3]+");return "+GNUSTO_EFFECT_PRINTTABLE;
		},
		
		255: function Z_check_arg_count(a) {
				//VERBOSE burin('check_arg_count',a[0]+'<=param_count()');
				return brancher(a[0]+'<=param_count()');
		},
		
		1000: function Z_save(a) {
				//VERBOSE burin('save','');
				compiling=0;
				var setter = "rebound=function(n) { " +
				storer('n') + "};";
				return "pc="+pc+";"+setter+";return "+GNUSTO_EFFECT_SAVE;
		},
		
		1001: function Z_restore(a) {
				//VERBOSE burin('restore','');
				compiling=0;
				var setter = "rebound=function(n) { " +
				storer('n') + "};";
				return "pc="+pc+";"+setter+";return "+GNUSTO_EFFECT_RESTORE;
		},
		
		1002: function Z_log_shift(a) {
				//VERBOSE burin('log_shift',"log_shift("+a[0]+','+a[1]+')');
				// log_shift logarithmic-bit-shift.  Right shifts are zero-padded
				return storer("log_shift("+a[0]+','+a[1]+')');
		},

		1003: function Z_art_shift(a) {
				//VERBOSE burin('log_shift',"art_shift("+a[0]+','+a[1]+')');
				// arithmetic-bit-shift.  Right shifts are sign-extended
				return storer("art_shift("+a[0]+','+a[1]+')');
		},

		1004: function Z_set_font(a) {
				//VERBOSE burin('set_font','('+a[0]+'<2?1:0) <<We only provide font 1.>>');
				// We only provide font 1.
				return storer('('+a[0]+'<2?1:0)');
		},
		
		//1005: draw_picture (V6 opcode)
		
		//1006: picture_dat (V6 opcode)
		
		//1007: erase_picture (V6 opcode)
		
		//1008: set_margins (V6 opcode)

		1009: function Z_save_undo(a) {
				//VERBOSE burin('save_undo','unsupported');
				return storer('-1'); // not yet supplied
		},

		1010: function Z_restore_undo(a) {
				//VERBOSE burin('restore_undo','unsupported');
				gnusto_error(700); // spurious restore_undo
				return storer('0');
		},

		1011: function Z_print_unicode(a) {
				//VERBOSE burin('print_unicode',"String.fromCharCode(" +a[0]+")");
				return handler_zOut("String.fromCharCode(" +a[0]+")",0);
		},

		1012: function Z_check_unicode(a) {
				//VERBOSE burin('check_unicode','we always say yes');
				// We have no way of telling from JS whether we can
				// read or write a character, so let's assume we can
				// read and write all of them. We can always provide
				// methods to do so somehow (e.g. with an onscreen keyboard).
				return storer('3');
		},
		
		//1013-1015: illegal
		
		//1016: move_window (V6 opcode)
		
		//1017: window_size (V6 opcode)
		
		//1018: window_style (V6 opcode)
		
		//1019: get_wind_prop (V6 opcode)		
		
		//1020: scroll_window (V6 opcode)
		
		//1021: pop_stack (V6 opcode)
		
		//1022: read_mouse (V6 opcode)
		
		//1023: mouse_window (V6 opcode)
		
		//1024: push_stack (V6 opcode)
		
		//1025: put_wind_prop (V6 opcode)
		
		//1026: print_form (V6 opcode)
		
		//1027: make_menu (V6 opcode)
		
		//1028: picture_table (V6 opcode)
}

function log_shift(value, shiftbits) {
		// log_shift logarithmic-bit-shift.  Right shifts are zero-padded
		if (shiftbits < 0) {		
				return (value >>> (-1* shiftbits)) & 0x7FFF;
		}
		else {
				return (value << shiftbits) & 0x7FFF;
		}
}

function art_shift(value, shiftbits){
		// arithmetic-bit-shift.  Right shifts are sign-extended
		if (shiftbits < 0) {		
				return (value >> (-1* shiftbits)) & 0x7FFF;
		}
		else {
				return (value << shiftbits) &0x7FFF;
		}	
}

// Called when we reach a possible breakpoint. |addr| is the opcode
// address. If we should break, sets |pc| to |addr| and returns true;
// else returns false.
function is_valid_breakpoint(addr) {
		if (addr in breakpoints) {
				if (breakpoints[addr]==2) {
						// A breakpoint we've just reurned from.
						breakpoints[addr]=1; // set it ready for next time
						return 0; // it doesn't trigger again this time.
				} else if (breakpoints[addr]==1) {
						// a genuine breakpoint!
						pc = addr;
						return 1;
				}

				gnusto_error(170); // not really impossible, though
				return 0;
		} else
				// not listed in the breakpoints table
				return 0; // Well, duh.
}

/*
	function golden_print(text) {
	var transcription_file = new Components.Constructor("@mozilla.org/network/file-output-stream;1","nsIFileOutputStream","init")(new Components.Constructor("@mozilla.org/file/local;1","nsILocalFile","initWithPath")('/tmp/gnusto.golden.txt'), 0x1A, 0600, 0);
	transcription_file.write(text, text.length);
	transcription_file.close();
	}

	function golden_trail(addr) {
	var text = 'pc : '+addr.toString(16);
	burin('gold',text);

	// Extra debugging information which may sometimes be useful
	var v = 0;

	for (var jj=0; jj<16; jj++) {
	v = locals[jj] & 65535;
	text = text + ' '+jj.toString(16)+'='+v.toString(16);
	}

	if (gamestack.length!=0) {
	v = gamestack[gamestack.length-1] & 65535;
	text = text + ' s='+v.toString(16);
	}

	text = text + '\n';
	golden_print(text);
	}
*/

// dissemble() returns a string of JavaScript code representing the
// instruction at the program counter (and possibly the next few
// instructions, too). It will change the PC to point to the end of the
// code it's dissembled.
function dissemble() {

		compiling = 1;
		code = '';
		var starting_pc = pc;

		do {

				// List of arguments to the opcode.
				var args = [];

				// Inelegant function to load parameters according to a VAR byte (or word).
				function handle_variable_parameters(types, bytecount) {
						var argcursor = 0;

						if (bytecount==1) {
								types = (types<<8) | 0xFF;
						}

						while (1) {
								var current = types & 0xC000;
								if (current==0xC000) {
										return;
								} else if (current==0x0000) {
										args[argcursor++] = zGetWord(pc);
										pc+=2;
								} else if (current==0x4000) {
										args[argcursor++] = zGetByte(pc++);
								} else if (current==0x8000) {
										args[argcursor++] =
												code_for_varcode(zGetByte(pc++));
								} else {
										gnusto_error(171); // impossible
								}
						
								types = (types << 2) | 0x3;
						}
				}

				this_instr_pc = pc;

				// Check for a breakpoint.
				if (pc in breakpoints) {
						code = code + 'if(is_valid_breakpoint('+pc+'))return 0x510;';
						//VERBOSE burin(code,'');
				}

				// Golden Trail code. Usually commented out for efficiency.
				// code = code + 'golden_trail('+pc+');';
				// code = code + 'burin("gold","'+pc.toString(16)+'");';
				
				// So here we go...
				// what's the opcode?
				var instr = zGetByte(pc++);

				if (instr==0) {
						// If we just get a zero, we've probably
						// been directed off into deep space somewhere.
						
						gnusto_error(201); // lost in space

				} else if (instr==190) { // Extended opcode.
						
						instr = 1000+zGetByte(pc++);
						handle_variable_parameters(zGetByte(pc++), 1);
						
				} else if (instr & 0x80) {
						if (instr & 0x40) { // Variable params
								
								if (!(instr & 0x20))
										// This is a 2-op, despite having
										// variable parameters; reassign it.
										instr &= 0x1F;
								
								if (instr==250 || instr==236) {
										// We get more of them!
										var types = zGetUnsignedWord(pc);
										pc += 2;
										handle_variable_parameters(types, 2);
								} else
										handle_variable_parameters(zGetByte(pc++), 1);
								
						} else { // Short. All 1-OPs except for one 0-OP.

								switch(instr & 0x30) {
								case 0x00:
								    args[0] = zGetWord(pc);
										pc+=2;
										instr = (instr & 0x0F) | 0x80;
										break;
										
								case 0x10:
										args[0] = zGetByte(pc++);
										instr = (instr & 0x0F) | 0x80;
										break;
										
								case 0x20:
										args[0] =
												code_for_varcode(zGetByte(pc++));
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
										code_for_varcode(zGetByte(pc++));
						else
								args[0] = zGetByte(pc++);
						
						if (instr & 0x20)
								args[1] =
										code_for_varcode(zGetByte(pc++));
						else
								args[1] = zGetByte(pc++);

						instr &= 0x1F;
				}

				if (handlers[instr]) {
						code = code + handlers[instr](args)+';';
						//VERBOSE burin(code,'');
				} else if (instr>=1128 && instr<=1255 &&
									 "special_instruction_EXT"+(instr-1000) in this) {

						// ZMSD 14.2: We provide a hook for plug-in instructions.

						code = code +
								this["special_instruction_EXT"+(instr-1000)](args)+
								';';
						//VERBOSE burin(code,'');

				} else {
						gnusto_error(200, instr, pc.toString(16)); // no handler
				}

		} while(compiling);

		// When we're not in debug mode, dissembly only stops at places where
		// the PC must be reset; but in debug mode it's perfectly possible
		// to have |code| not read or write to the PC at all. So we need to
		// set it automatically at the end of each fragment.

		if (single_step||debug_mode) {
				code = code + 'pc='+pc; 
				//VERBOSE burin(code,'');
		}

		// Name the function after the starting position, to make life
		// easier for Venkman.
		return 'function J'+starting_pc.toString(16)+'(){'+code+'}';
}

////////////////////////////////////////////////////////////////
// Library functions


function trunc_divide(over, under) {
	
		var result;

		if (under==0) {
				gnusto_error(701); // division by zero
				return 0;
		}

		result = over / under;

		if (result > 0) {
				return Math.floor(result);
		} else {
				return Math.ceil(result);
		}			
		  
}

function zscii_char_to_ascii(zscii_code) {
		if (zscii_code<0 || zscii_code>1023) {
				gnusto_error(702, zscii_code); // illegal zscii code
		}

		var result;

		if (zscii_code==13 || zscii_code==10)
				result = 10;
		else if ((zscii_code>=32 && zscii_code<=126) || zscii_code==0)
				result = zscii_code;
		else if (zscii_code>=155 && zscii_code<=251) {
				// Extra characters.

				if (unicode_start == 0) 
						return String.fromCharCode(default_unicode_translation_table[zscii_code]);
				else { // if we're using a custom unicode translation table...
						if ((zscii_code-154)<= custom_unicode_charcount) 
								return String.fromCharCode(zGetUnsignedWord(unicode_start + ((zscii_code-155)*2)));					
						else 
								gnusto_error(703, zscii_code); // unknown zscii code
                                  
				}


				// FIXME: It's not clear what to do if they request a character
				// that's off the end of the table.
		}	else {
				gnusto_error(703, zscii_code); // unknown zscii code
		}

		return String.fromCharCode(result);
}

function gnusto_random(arg) {
		if (arg==0) {  //zero returns to true random mode-- seed from system clock
				engine__use_seed = 0;
				return 0;
		} else {
				if (arg>0) {  //return a random number between 1 and arg.
						if (engine__use_seed == 0) {
								return 1 + Math.round((arg -1) * Math.random());
						} else {
								engine__random_seed--;
								return Math.round(Math.abs(Math.tan(engine__random_seed))*8.71*arg)%arg;
						}
	  	  } else {
						// Else we should reseed the RNG and return 0.
						engine__random_seed = arg;
						engine__use_seed = 1;
						return 0;
				}
		}
}

function func_prologue(actuals) {
		var count = zGetByte(pc++);
		for (var i=count; i>=0; i--) {
				if (i<actuals.length) {
						locals.unshift(actuals[i]);
				} else {
						locals.unshift(0); // except in v.3, but hey
				}
		}
		locals_stack.unshift(count+1);
}

function gosub(to_address, actuals, ret_address, result_eater) {
		call_stack.push(ret_address);
		pc = to_address;
		func_prologue(actuals);
		param_counts.unshift(actuals.length);
		result_eaters.push(result_eater);

		if (to_address==0) {
				// Rare special case.
				gnusto_return(0);
		}
}

////////////////////////////////////////////////////////////////
// Tokenises a string.
//
// See aread() for caveats.
// Maybe we should allow aread() to pass in the correct value stored
// in text_buffer, since it knows it already. It means we don't have
// to figure it out ourselves.
//
function engine__tokenise(text_buffer, parse_buffer, dictionary, overwrite) {

		if (isNaN(dictionary)) dictionary = 0;
		if (isNaN(overwrite)) overwrite = 0;

		// burin('tokenise', text_buffer+' '+parse_buffer+' '+dictionary+' '+overwrite);

		function look_up(word, dict_addr) {

				var entry_length = zGetByte(dict_addr+separator_count+1);
				var entries_count = zGetWord(dict_addr+separator_count+2);
				var entries_start = dict_addr+separator_count+4;

				// Whether the dictionary is sorted.
				// We don't use this at present (it would be a
				// useful optimisation, though).
				var is_sorted = 1;

				if (entries_count < 0) {

						// This should actually only happen on user dictionaries,
						// but the distinction isn't a useful one, and so we don't
						// bother to check.

						is_sorted = 0;
						entries_count = -entries_count;
				}

				var oldword = word;				
				word = into_zscii(word);

				for (var i=0; i<entries_count; i++) {
						//really ugly kludge until into_zscii is fixed properly
						var address = entries_start+i*entry_length;
					 	if (zscii_from(address)==oldword) {
								return address;}

						var j=0;
						while (j<word.length &&		
									 zGetByte(address+j)==word.charCodeAt(j))
								j++;

						if (j==word.length)return address;
				}
				
				return 0;
		}

		if (dictionary==0) {
				// Use the standard game dictionary.
				dictionary = dict_start;
		}

		var max_chars = zGetByte(text_buffer);

		var result = '';

		for (var i=0;i<zGetByte(text_buffer + 1);i++)
				result += String.fromCharCode(zGetByte(text_buffer + 2 + i));

		var words_count = parse_buffer + 1;
		zSetByte(0, words_count);
		var cursor = parse_buffer+2;
		//var cursor = ((zGetByte[cursor+1]&0xFF)*4) + 2

		var words = [];
		var curword = '';
		var wordindex = 0;
		
		for (var cpos=0; cpos < result.length; cpos++) {
				if (result[cpos]  == ' ') {
						if (curword != '') {
								words[wordindex++] = curword;
								curword = '';
						}
				} else {
						if (IsSeparator(result[cpos])) {
								if (curword != '') {
										words[wordindex++] = curword;}
								words[wordindex++] = result[cpos];
								curword = '';		
						} else {
								curword += result[cpos];	
						}
				}
		}
		
		if (curword != '') words[wordindex++] = curword;
		
		//display the broken-up text for visual validation 
		//for (var i=0; i < words.length; i++){
		//  alert (i + ': ' + words[i] + ' ' + words[i].length);
		//}

		var position = 2;

		for (var i in words) {
				if ((words[i] != '') && (words[i] != ' ')) {
						var lexical = look_up(words[i], dictionary);

						// burin('token', words[i]+' '+lexical);

						if (!(overwrite && lexical==0)) {
								zSetWord(lexical, cursor);
						}

						cursor+=2;
						zSetByte(words[i].length, cursor++);
						zSetByte(position, cursor++);
		
						position += words[i].length+1;
						zSetByte(zGetByte(words_count)+1, words_count);
				}
		}
}

// Very very very limited implementation:
//  * Doesn't properly handle terminating characters (always returns 10).
//  * Doesn't handle word separators.
function aread(source, text_buffer, parse_buffer) {
		var max_chars = zGetByte(text_buffer);
		var result = source.substring(0,max_chars);

		zSetByte(result.length, text_buffer + 1);
	
		for (var i=0;i<result.length;i++)
				zSetByte(result.charCodeAt(i), text_buffer + 2 + i);

		if (parse_buffer!=0)
				engine__tokenise(text_buffer, parse_buffer, 0, 0);

		// Return the ASCII value for the Enter key. aread() is supposed
		// to return the value of the key which terminated the string, but
		// at present we only support termination using Enter.
		return 10;
}

// Returns from a z-machine routine.
// |value| is the numeric result of the routine.
// It can also be null, in which case the remaining results of
// the current opcode won't be executed (it won't run the "result eater").
function gnusto_return(value) {
		for (var i=locals_stack.shift(); i>0; i--) {
				locals.shift();
		}
		param_counts.shift();
		pc = call_stack.pop();

		var eater = result_eaters.pop();
		if (eater && (value!=null)) {
				eater(value);
		}
}

function throw_stack_frame(cookie) {
		// Not tested. See caveats for @throw, above.

		// The cookie is the value of call_stack.length when @catch was
		// called. It cannot be less than 1 or greater than the current
		// value of call_stack.length.

		if (cookie>call_stack.length || cookie<1) {
				gnusto_error(207, cookie);
		}

		while (call_stack.length > cookie-1) {
				gnusto_return(null);
		}
}

function get_prop_addr(object, property) {
		var result = property_search(object, property, -1);
		if (result[2]) {
				return result[0];
		} else {
				return 0;
		}
}

function get_prop_len(address) {
		// The last byte before the data is either the size byte of a 2-byte
		// field, or the only byte of a 1-byte field. We can tell the
		// difference using the top bit.

		var value = zGetByte(address-1);

		if (value & 0x80) {
				// A two-byte field, so we take the bottom five bits.
				value = value & 0x1F;

				if (value==0)
						return 64;
				else
						return value;
		} else {
				// A one-byte field. Our choice rests on a single bit.
				if (value & 0x40)
						return 2;
				else
						return 1;
		}

		gnusto_error(172); // impossible
}

function get_next_prop(object, property) {

		if (object==0) return 0; // Kill that V0EFH before it starts.

		var result = property_search(object, -1, property);

		if (result[2]) {
				// There's a real property number in there;
				// return it.
				return result[3];
		} else {
				// There wasn't a valid property following the one
				// we wanted. Why not?

				if (result[4]) {
						// Because the one we wanted was the last one.
						// Tell them to go back to square one.
						return 0;
				} else {
						// Because the one we wanted didn't exist.
						// They shouldn't have asked for it: barf.
						gnusto_error(205, property);
				}
		}

		gnusto_error(173); // impossible
}

function get_prop(object, property) {

		if (object==0) return 0; // Kill that V0EFH before it starts.

    var temp = property_search(object, property, -1);

		if (temp[1]==2) {
				return zGetWord(temp[0]);
		} else if (temp[1]==1) {
				return zGetByte(temp[0]); // should this be treated as signed?
		} else {
				// get_prop used on a property of the wrong length
				gnusto_error(706, object, property);
				return zGetWord(temp[0]);
		}

    gnusto_error(174); // impossible
}

// This is the function which does all searching of property lists.
// It takes three parameters:
//    |object| -- the number of the object you're interested in
//
// The next parameters allow us to specify the property in two ways.
// If you use both, it will "or" them together.
//    |property| -- the number of the property you're interested in,
//                     or -1 if you don't mind.
//    |previous_property| -- the number of the property BEFORE the one
//                     you're interested in, or 0 if you want the first one,
//                     or -1 if you don't mind.
//
// If you specify a valid property, and the property doesn't exist, this
// function will return the default value instead (and tell you it's done so).
//
// The function returns an array with these elements:
//    [0] = the property address.
//    [1] = the property length.
//    [2] = 1 if this property really belongs to the object, or
//	    0 if it doesn't (and if it doesn't, and you've specified
//          a valid |property|, then [0] and [1] will be properly
//          set to defaults.)
//    [3] = the number of the property.
//          Equal to |property| if you specified it.
//          May be -1, if |property| is -1 and [2]==0.
//    [4] = a piece of state only useful to get_next_prop():
//          if the object does not contain the property (i.e. if [2]==0)
//          then this will be 1 if the final property was equal to
//          |previous_property|, and 0 otherwise. At all other times it will
//          be 0.
function property_search(object, property, previous_property) {
		var props_address = zGetUnsignedWord(objs_start + 124 + object*14);

		props_address = props_address + zGetByte(props_address)*2 + 1;

		var previous_prop = 0;

		while(1) {
				var len = 1;

				var prop = zGetByte(props_address++);

				if (prop & 0x80) {
						// Long format.
						len = zGetByte(props_address++) & 0x3F;
						if (len==0) len = 64;
				} else {
						// Short format.
						if (prop & 0x40) len = 2;
				}
				prop = prop & 0x3F;

				if (prop==property || previous_prop==previous_property) {
						return [props_address, len, 1, prop, 0];
				} else if (prop < property) {

						// So it's not there. Can we get it from the defaults?

						if (property>0)
								// Yes, because it's a real property.
								return [objs_start + (property-1)*2,
												2, 0, property, 0];
						else
								// No: they didn't specify a particular
								// property.
								return [-1, -1, 0, property,
												previous_prop==property];
				}

				props_address += len;
				previous_prop = prop;
		}
		gnusto_error(175); // impossible
}

////////////////////////////////////////////////////////////////
// Functions that modify the object tree

function set_attr(object, bit) {
		if (object==0) return; // Kill that V0EFH before it starts.

		var address = objs_start + 112 + object*14 + (bit>>3);
		var value = zGetByte(address);
		zSetByte(value | (128>>(bit%8)), address);
}

function clear_attr(object, bit) {
		if (object==0) return; // Kill that V0EFH before it starts.

		var address = objs_start + 112 + object*14 + (bit>>3);
		var value = zGetByte(address);
		zSetByte(value & ~(128>>(bit%8)), address);
}

function test_attr(object, bit) {
		if (object==0) return 0; // Kill that V0EFH before it starts.

		if ((zGetByte(objs_start + 112 + object*14 +(bit>>3)) &
				 (128>>(bit%8)))) {
				return 1;
		} else {
				return 0;
		}
}

function put_prop(object, property, value) {
		var address = property_search(object, property, -1);

		if (!address[2]) gnusto_error(704); // undefined property
		if (address[1]==1) {
				zSetByte(value & 0xff, address[0]);
		} else if (address[1]==2) {
				zSetWord(value&0xffff, address[0]);
		} else
				gnusto_error(705); // weird length
}

PARENT_REC = 6;
SIBLING_REC = 8;
CHILD_REC = 10;

function object_address(object) {
		return objs_start + 112 + object*14;
}

function get_older_sibling(object) {
		// Start at the eldest child.
		var candidate = get_child(get_parent(object));

		if (object==candidate) {
				// evidently nothing doing there.
				return 0;
		}

		while (candidate) {
				next_along = get_sibling(candidate);
				if (next_along==object) {
						return candidate; // Yay! Got it!
				}
				candidate = next_along;
		}

		// We ran out, so the answer's 0.
		return 0;
}

function insert_obj(mover, new_parent) {

		// First, remove mover from wherever it is in the tree now.

		var old_parent = get_parent(mover);
		var older_sibling = get_older_sibling(mover);
		var younger_sibling = get_sibling(mover);

		if (old_parent && get_child(old_parent)==mover) {
				set_child(old_parent, younger_sibling);
		}

		if (older_sibling) {
				set_sibling(older_sibling, younger_sibling);
		}

		// Now, slip it into the new place.

		set_parent(mover, new_parent);

		if (new_parent) {
				set_sibling(mover, get_child(new_parent));
				set_child(new_parent, mover);
		}
}

function remove_obj(mover, new_parent) {
		insert_obj(mover, 0);
}

////////////////////////////////////////////////////////////////

function get_family(from, relationship) {
		return zGetUnsignedWord(
														objs_start + 112 + relationship + from*14);
}

function get_parent(from)  { return get_family(from, PARENT_REC); }
function get_child(from)   { return get_family(from, CHILD_REC); }
function get_sibling(from) { return get_family(from, SIBLING_REC); }

function set_family(from, to, relationship) {
		zSetWord(to,
						 objs_start + 112 + relationship + from*14);
}

function set_parent(from, to)  { return set_family(from, to, PARENT_REC); }
function set_child(from, to)   { return set_family(from, to, CHILD_REC); }
function set_sibling(from, to) { return set_family(from, to, SIBLING_REC); }

function obj_in(child, parent) {
		return get_parent(child) == parent;
}

function param_count() {
		return param_counts[0];
}

function set_output_stream(target, address) {
		if (target==0) {
				// then it's a no-op.
		} else if (target==1) {
				output_to_console = 1;
		} else if (target==2) {
				zSetByte(zGetByte(0x11) | 0x1);
		} else if (target==3) {

				if (streamthrees.length>15)
						gnusto_error(202); // too many nested stream-3s

				streamthrees.unshift([address, address+2]);

		} else if (target==4) {
				output_to_script = 1;
		} else if (target==-1) {
				output_to_console = 0;
		} else if (target==-2) {
				zSetByte(zGetByte(0x11) & ~0x1);
		} else if (target==-3) {

				if (streamthrees.length<1)
						gnusto_error(203); // not enough nested stream-3s

				var latest = streamthrees.shift();
				zSetWord((latest[1]-latest[0])-2, latest[0]);

		} else if (target==-4) {
				output_to_script = 0;
		} else
				gnusto_error(204, target); // weird output stream number
}

////////////////////////////////////////////////////////////////

// Implements @copy_table, as in the Z-spec.
function copy_table(first, second, size) {
		if (second==0) {

				// Zero out the first |size| bytes of |first|.

				for (var i=0; i<size; i++) {
						zSetByte(0, i+first);
				}
		} else {

				// Copy |size| bytes of |first| into |second|.

				var copy_forwards = 0;

				if (size<0) {
						size = -size;
						copy_forwards = 1;
				} else {
						if (first > second) {
								copy_forwards = 1;
						} else {
								copy_forwards = 0;
						}
				}

				if (copy_forwards) {
						for (var i=0; i<size; i++) {
								zSetByte(zGetByte(first+i), second+i);
						}
				} else {
						for (var i=size-1; i>=0; i--) {
								zSetByte(zGetByte(first+i), second+i);
						}
				}
		}
}


////////////////////////////////////////////////////////////////
// Implements @scan_table, as in the Z-spec.
function scan_table(target_word, target_table, table_length, table_form) {
	                         
		burin('Actually scanning table','');
		var jumpby = table_form & 0x7F;
		var usewords = ((table_form & 0x80) == 0x80);
				
		if (usewords) 
				{ //if the table is in the form of word values
						var lastlocation = target_table + (table_length << 1);
						while (target_table < lastlocation) 
								{
										if (((zGetByte(target_table)&0xFF) == ((target_word>>8)&0xFF)) &&
												((zGetByte(target_table+1)&0xFF) == (target_word&0xFF))) 
												{
														return target_table;
												}
										target_table += jumpby;
								}
				}
		else 
				{ //if the table is in the form of byte values
						var lastlocation = target_table + table_length;
						while (target_table < lastlocation) 
								{
										if ((zGetByte(target_table)&0xFF) == (target_word&0xFFFF)) 
												{
														return target_table;
												}
										target_table += jumpby;
								}
				}
		return 0;	
}

////////////////////////////////////////////////////////////////

// Returns the lines that @print_table should draw, as in
// the Z-spec.
//
// It's rather poorly defined there:
//   * How is the text in memory encoded?
//       [Straight ZSCII, not five-bit encoded.]
//   * What happens to the cursor? Moved?
//       [We're guessing not.]
//   * Is the "table" a table in the Z-machine sense, or just
//     a contiguous block of memory?
//       [Just a contiguous block.]
//   * What if the width takes us off the edge of the screen?
//   * What if the height causes a [MORE] event?
//
// It also goes largely un-noted that this is the only possible
// way to draw on the lower window away from the current
// cursor position. (If we take the view that v5 windows are
// roughly the same thing as v6 windows, though, windows don't
// "own" any part of the screen, so there's no such thing as
// drawing on the lower window per se.)

function engine__print_table(address, width, height, skip) {

		var lines = [];

		for (var y=0; y<height; y++) {

				var s='';

        for (var x=0; x<width; x++) {
		        s=s+zscii_char_to_ascii(zGetByte(address++));
				}

				lines.push(s);

				address += skip;
		}

		return lines;
}

////////////////////////////////////////////////////////////////

// engine_start_game()
//
// Initialises global variables.

function engine_start_game(memory) {

		engine__memory = memory;

		jit = [];
		compiling = 0;
		gamestack = [];

		call_stack = [];
		locals = [];
		locals_stack = [];
		param_counts = [];
		result_eaters = [];

		himem      = zGetUnsignedWord(0x4);
		pc         = zGetUnsignedWord(0x6);
		dict_start = zGetUnsignedWord(0x8);
		objs_start = zGetUnsignedWord(0xA);
		vars_start = zGetUnsignedWord(0xC);
		stat_start = zGetUnsignedWord(0xE);
		abbr_start = zGetUnsignedWord(0x18);
		alpha_start = zGetUnsignedWord(0x34);
		hext_start = zGetUnsignedWord(0x36);		
	
		separator_count = zGetByte(dict_start);
		for (var i=0; i<separator_count; i++) {		  
				separators[i]=zscii_char_to_ascii(zGetByte(dict_start + i+1));
		}	
	
		// If there is a header extension...
		if (hext_start > 0) {
				unicode_start = zGetUnsignedWord(hext_start+6);  // get start of custom unicode table, if any
				if (unicode_start > 0) { // if there is one, get the char count-- characters beyond that point are undefined.
						custom_unicode_charcount = zGetByte(unicode_start);
						unicode_start += 1;
				}
		}		

		rebound = 0;

		output_to_console = 1;
		streamthrees = [];
		output_to_script = 0;

		engine__console_buffer = '';
		engine__transcript_buffer = '';
		
		// Reset the default alphabet on reload.  Yes these are already defined in tossio,
		// but that's because it might use them before they get defined here.
		zalphabet[0] = 'abcdefghijklmnopqrstuvwxyz';
		zalphabet[1] = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
		zalphabet[2] = 'T\n0123456789.,!?_#\'"/\\-:()'; // T = magic ten bit flag		
		
		var newchar;
		var newcharcode;		
		if (alpha_start > 0) { // If there's a custom alphabet...
				for (var alpharow=0; alpharow<3; alpharow++){
						var alphaholder = '';
						for (var alphacol=0; alphacol<26; alphacol++) {	
								newcharcode = zGetByte(alpha_start + (alpharow*26) + alphacol);
								if ((newcharcode >=155) && (newcharcode <=251)) {		     
										// Yes, custom alphabets can refer to custom unicode tables.  Whee...
										if (unicode_start == 0) {
												alphaholder += String.fromCharCode(default_unicode_translation_table[newcharcode]);
										} else {
												if ((newcharcode-154)<= custom_unicode_charcount)
														alphaholder += String.fromCharCode(zGetUnsignedWord(unicode_start + ((newcharcode-155)*2)));					
												else
														alphaholder += ' ';
										}
								} else {
										newchar = String.fromCharCode(newcharcode);
										if (newchar == '^') newchar = '\n';  // This is hackish, but I don't know a better way.
										alphaholder += newchar;
								}
						}		    
						zalphabet[alpharow]= alphaholder;  // Replace the current row with the newly constructed one.
				}
		}
		

		// We don't also reset the debugging variables, because
		// they need to persist across re-creations of this object.

		// Clear the Z-engine's local variables.
		for (var i=0; i<16; i++) locals[i]=0;

		engine__printing_header_bits = 0;

		engine__leftovers = '';
}

////////////////////////////////////////////////////////////////

// Main point of entry for gnusto. Be sure to call engine_start_game()
// before calling this the first time.
//
// This function returns an effect code when the machine pauses, stating
// why the machine was paused. More details, and the actual values, are
// given above.
// 
// |answer| is for returning answers to earlier effect codes. If you're
// not answering an effect code, pass 0 here.
function engine_run(answer) {
		// burin('run', answer);
		var start_pc = 0;
		var stopping = 0;
		var turns = 0;
	  var jscode;
		var turns_limit = single_step? 1: 10000;

		if (rebound) {
				rebound(answer);
				rebound = 0;
		}

		while(!stopping) {

				if (turns++ >= turns_limit)
						// Wimp out for now.
						return GNUSTO_EFFECT_WIMP_OUT;

				start_pc = pc;

				if (jit[start_pc]) {
						jscode = jit[start_pc];
				} else {
						eval('jscode=' + dissemble());
						if (start_pc >= stat_start)
								jit[start_pc] = jscode;
				}

				// Some useful debugging code:
				//burin('eng pc', start_pc);
				//burin('eng jit', jscode);

				stopping = jscode();
		}

		// so, return an effect code.
		return stopping;
}

var default_unicode_translation_table = {
		155:0xe4, // a-diaeresis
		156:0xf6, // o-diaeresis
		157:0xfc, // u-diaeresis
		158:0xc4, // A-diaeresis
		159:0xd6, // O-diaeresis
		160:0xdc, // U-diaeresis
		161:0xdf, // German "sz" ligature
		162:0xbb, // right quotation marks
		163:0xab, // left quotation marks
		164:0xeb, // e-diaeresis
		165:0xef, // i-diaeresis
		166:0xff, // y-diaeresis
		167:0xcb, // E-diaeresis
		168:0xcf, // I-diaeresis
		169:0xe1, // a-acute
		170:0xe9, // e-acute
		171:0xed, // i-acute
		172:0xf3, // o-acute
		173:0xfa, // u-acute
		174:0xfd, // y-acute
		175:0xc1, // A-acute
		176:0xc9, // E-acute
		177:0xcd, // I-acute
		178:0xd3, // O-acute
		179:0xda, // U-acute
		180:0xdd, // Y-acute
		181:0xe0, // a-grave
		182:0xe8, // e-grave
		183:0xec, // i-grave
		184:0xf2, // o-grave
		185:0xf9, // u-grave
		186:0xc0, // A-grave
		187:0xc8, // E-grave
		188:0xcc, // I-grave
		189:0xd2, // O-grave
		190:0xd9, // U-grave
		191:0xe2, // a-circumflex
		192:0xea, // e-circumflex
		193:0xee, // i-circumflex
		194:0xf4, // o-circumflex
		195:0xfb, // u-circumflex
		196:0xc2, // A-circumflex
		197:0xca, // E-circumflex
		198:0xce, // I-circumflex
		199:0xd4, // O-circumflex
		200:0xdb, // U-circumflex
		201:0xe5, // a-ring
		202:0xc5, // A-ring
		203:0xf8, // o-slash
		204:0xd8, // O-slash
		205:0xe3, // a-tilde
		206:0xf1, // n-tilde
		207:0xf5, // o-tilde
		208:0xc3, // A-tilde
		209:0xd1, // N-tilde
		210:0xd5, // O-tilde
		211:0xe6, // ae-ligature
		212:0xc6, // AE-ligature
		213:0xe7, // c-cedilla
		214:0xc7, // C-cedilla
		215:0xfe, // thorn
		216:0xf0, // eth
		217:0xde, // Thorn
		218:0xd0, // Eth
		219:0xa3, // pound sterling sign
		220:0x153, // oe-ligature
		221:0x152, // OE-ligature
		222:0xa1, // inverted pling
		223:0xbf, // inverted query
};

//var zalphabet2 = '\n0123456789.,!?_#\'"/\\-:()';

function zscii_from(address, max_length, tell_length) {

		if (address in jit) {
				//VERBOSE burin('zscii_from ' + address,'already in JIT');

				// Already seen this one.

				if (tell_length)
						return jit[address];
				else
						return jit[address][0];
		}

		var temp = '';
		var alph = 0;
		var running = 1;
		var start_address = address;

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
				var word = zGetUnsignedWord(address);
				address += 2;

				running = ((word & 0x8000)==0) && address<stopping_place;

				for (var j=2; j>=0; j--) {
						var code = ((word>>(j*5))&0x1f);

						if (abbreviation) {
								temp = temp + zscii_from(zGetUnsignedWord((32*(abbreviation-1)+code)*2+abbr_start)*2);
								abbreviation = 0;
						} else if (tenbit==-2) {

								if (code>5) {
										if (alph==2 && code==6)
												tenbit = -1;
										else
												temp = temp + zalphabet[alph][code-6];
												
										alph = 0;
								} else {
										if (code==0) { temp = temp + ' '; alph=0; }
										else if (code<4) { abbreviation = code; }
										else { alph = code-3; }
								}

						} else if (tenbit==-1) {
								tenbit = code;
						} else {
								temp = temp + zscii_char_to_ascii((tenbit<<5) + code);
								tenbit = -2;
						}
				}
		}

		if (start_address >= stat_start) {
				jit[start_address] = [temp, address];
		}

		//VERBOSE burin('zscii_from ' + address,temp);
		if (tell_length) {
				return [temp, address];
		} else {
				return temp;
		}
}

////////////////////////////////////////////////////////////////
//
// engine__encode_text
//
// Implements the @encode_text opcode.
//   |zscii_text|+|from| is the address of the unencoded text.
//   |length|            is its length.
//                         (It may also be terminated by a zero byte.)
//   |coded_text|        is where to put the six bytes of encoded text.
function engine__encode_text(zscii_text, length, from, coded_text) {

		zscii_text += from;
    var source = '';

    while (length>0) {
		    var b = zGetByte(zscii_text);

				if (b==0) break;

				source = source + zscii_char_to_ascii(b);
				zscii_text++;
				length--;
		}

    var result = into_zscii(source);

    for (var i=0; i<result.length; i++) {
				var c = result[i].charCodeAt(0);
		    zSetByte(c, coded_text++);
		}
}

////////////////////////////////////////////////////////////////
//
// Encodes the ZSCII string |str| to its compressed form,
// and returns it.
// 
function into_zscii(str) {
		var result = '';
		var buffer = [];
		var set_stop_bit = 0;

		function emit(value) {

				buffer.push(value);

				if (buffer.length==3) {
						var temp = (buffer[0]<<10 | buffer[1]<<5 | buffer[2]);

						// Weird, but it seems to be the rule:
						if (result.length==4) temp += 0x8000;

						result = result +
								String.fromCharCode(temp >> 8) +
								String.fromCharCode(temp &  0xFF);
						buffer = [];
				}
		}

		// Need to handle other alphabets. At present we only
		// handle alphabetic characters (A0).
		// Also need to handle ten-bit characters.
		
		var cursor = 0;

		while (cursor<str.length && result.length<6) {
				var ch = str.charCodeAt(cursor++);

				if (ch>=65 && ch<=90) { // A to Z
						// These are NOT mapped to A1. ZSD3.7
						// explicitly forbids use of upper case
						// during encoding.
						emit(ch-59);
				} else if (ch>=97 && ch<=122) { // a to z
						emit(ch-91);
				} else {
						var z2 = zalphabet[2].indexOf(ch);

						if (z2!=-1) {
								emit(5); // shift to weird stuff

								// XXX FIXME. This ought logically to be z2+6
								// (and Frotz also uses 6 here.) For some reason,
								// it seems not to work unless it's z2+9.
								// Find out what's up.
								emit(z2+6);
						} else {
								emit(5);
								emit(6);
								emit(ch >> 5);
								emit(ch &  0x1F);
						}
				}
		}

		cursor = 0;

		while (result.length<6) emit(5);

		return result.substring(0,6);
}

function name_of_object(object) {

		if (object==0)
				return "<void>";
		else {
				var aa = objs_start + 124 + object*14;
				return zscii_from(zGetUnsignedWord(aa)+1);
		}
}

////////////////////////////////////////////////////////////////
//
// Function to print the contents of engine__leftovers.

function engine__print_leftovers() {
		zOut(engine__leftovers);

		// May as well clear it out and save memory,
		// although we won't be called again until it's
		// set otherwise.
		engine__leftovers = '';
}

////////////////////////////////////////////////////////////////
//
// Prints the text |text| on whatever input streams are
// currently enabled.
//
// If this returns false, the text has been printed.
// If it returns true, the text hasn't been printed, but
// you must return the GNUSTO_EFFECT_FLAGS_CHANGED effect
// to your caller. (There's a function handler_zOut()
// which does all this for you.)

function zOut(text) {
		if (streamthrees.length) {

				// Stream threes disable any other stream while they're on.
				// (And they can't cause flag changes, I suppose.)

				var current = streamthrees[0];
				var address = streamthrees[0][1];

				for (var i=0; i<text.length; i++) {
						zSetByte(text.charCodeAt(i), address++);
				}

				streamthrees[0][1] = address;
		} else {

				var bits = zGetByte(0x11) & 0x03;
				var changed = bits != engine__printing_header_bits;
				engine__effect_parameters = engine__printing_header_bits; 
				engine__printing_header_bits = bits;

				// OK, so should we bail?

				if (changed) {

						engine__leftovers = text;
						rebound = engine__print_leftovers;

						return 1;

				} else {

						if (output_to_console) {
								engine__console_buffer = engine__console_buffer + text;
						}

						if (bits & 1) {
								engine__transcript_buffer = engine__transcript_buffer + text;
						}
				}
		}

		return 0;
}

////////////////////////////////////////////////////////////////

function engine_console_text() {
		var temp = engine__console_buffer;
		engine__console_buffer = '';
		return temp;
}

function engine_transcript_text() {
		var temp = engine__transcript_buffer;
		engine__transcript_buffer = '';
		return temp;
}

function engine_effect_parameters() {
		return engine__effect_parameters;
}

////////////////////////////////////////////////////////////////

function zGetByte(address) {
    return engine__memory[address];
}

function zSetByte(value, address) {
    engine__memory[address] = value;
}

function zGetWord(addr) {
		return unsigned2signed((engine__memory[addr]<<8)|
													 engine__memory[addr+1]);
}

function unsigned2signed(value) {
		return ((value & 0x8000)?~0xFFFF:0)|value;
}

function signed2unsigned(value) {
		return value & 0xFFFF;
}

function zGetUnsignedWord(addr) {
		return (engine__memory[addr]<<8)|engine__memory[addr+1];
}

function zSetWord(value, addr) {
		zSetByte((value>>8) & 0xFF, addr);
		zSetByte((value) & 0xFF, addr+1);
}

function IsSeparator(value) {
		for (var sepindex=0; sepindex < separator_count; sepindex++) {
				if (value == separators[sepindex]) return 1;	
		}
		return 0;	
}
////////////////////////////////////////////////////////////////
GNUSTO_LIB_HAPPY = 1;
////////////////////////////////////////////////////////////////
