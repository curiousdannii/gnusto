// gnusto-lib.js || -*- Mode: Java; tab-width: 2; -*-
// The Gnusto JavaScript Z-machine library.
// $Header: /cvs/gnusto/src/gnusto/content/Attic/gnusto-lib.js,v 1.9 2003/02/25 16:58:37 marnanel Exp $
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
/////////////////////// Global variables ///////////////////////
////////////////////////////////////////////////////////////////

// These are all initialised in the function setup().

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
var jit;

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

// |dict_start| is the address of the dictionary in the Z-machine's memory.
var dict_start;

// |objs_start| is the address of the object table in the Z-machine's memory.
var objs_start;

// |vars_start| is the address of the global variables in the Z-machine's
// memory.
var vars_start;

// Not sure what this does. It doesn't seem to be used, anyway.
// We should probably remove it.
var stat_start;

// Address of the start of the abbreviations table in memory. (Can this
// be changed? If not, we could decode them all first.)
var abbr_start;

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

// The function object to run first next time go() gets called,
// before any other execution gets under way. Its argument will be the
// |answer| formal parameter of go(). It can also be 0, which
// is a no-op. go() will clear it to 0 after running it, whatever
// happens.
var rebound;

// Whether we're writing output to the ordinary screen (stream 1).
var output_to_console;

// Whether we're writing output to a game transcript (stream 2).
var output_to_transcript;

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

// If this is 1:
//   * dissemble() won't group JS for more than one opcode together.
//   * go() will "wimp out" after every opcode.
var debug_mode;

////////////////////////////////////////////////////////////////
//////////////// Functions to support handlers /////////////////
////////////////////////////////////////////////////////////////
//
// Each of these functions is used by the members of the
// |handlers| array, below.
//
////////////////////////////////////////////////////////////////

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
		var temp = getbyte(pc++);
		var target_address = temp & 0x3F;

		if (temp & 0x80) inverted = 0;
		if (!(temp & 0x40)) {
				target_address = (target_address << 8) | getbyte(pc++);
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

		if (target_address == 0)
				return if_statement + '{gnusto_return(0);return;}'
						if (target_address == 1)
								return if_statement + '{gnusto_return(1);return;}'

										target_address = (pc + target_address) - 2;

		// This is an optimisation that's currently unimplemented:
		// if there's no code there, we should mark that we want it later.
		//  [ if (!jit[target_address]) jit[target_address]=0; ]

		return if_statement + '{pc='+
				(target_address)+';return;}';
}

function code_for_varcode(varcode) {
		if (varcode==0)
				return 'gamestack.pop()'
						else if (varcode < 0x10)
								return 'locals['+(varcode-1)+']';
		else
				return 'getword('+(vars_start+(varcode-16)*2)+')';

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
		} else if (lvalue.substring(0,8)=='getword(') {
				return 'setword('+rvalue+','+lvalue.substring(8);
		} else if (lvalue.substring(0,8)=='getbyte(') {
				return 'setbyte('+rvalue+','+lvalue.substring(8);
		} else {
				return lvalue + '=' + rvalue;
		}
}

function storer(rvalue) {
		return store_into(code_for_varcode(getbyte(pc++)), rvalue);
}

function simple_call(target, arguments) {
		compiling=0; // Got to stop after this.
		var functino = "function(r){"+storer("r")+";});";
		// (get it calculated so's the pc will be right)
		return "gosub("+pc_translate(target)+",["+arguments+"],"+pc+","+
				functino;
}

function simple_print(a) {
		var zf = zscii_from(pc,65535,1);
		var message=(zf[0].
								 replace('\\','\\\\','g').
								 replace('"','\\"','g').
								 replace('\n','\\n','g')); // not elegant
		pc=zf[1];
		return 'output("'+message+'")';
}

////////////////////////////////////////////////////////////////
// Effect codes, returned from go(). See the explanation below
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

// Returned if we've run for more than a certain number of iterations.
// This means that the environment gets a chance to do some housekeeping
// if we're stuck deep in computation, or to break an infinite loop
// within the Z-code.
//
// Any value may be used as an answer; it will be ignored.
var GNUSTO_EFFECT_WIMP_OUT   = 0x500;

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
// (FIXME: Consider using named functions instead: Venkman will probably
// prefer it.)
var handlers = {

		1: function(a) { // je
				if (a.length<2)
				return ''; // it's a no-op
				else if (a.length==2)
				return brancher(a[0]+'=='+a[1]);
				else {
						var condition = '';
						for (var i=1; i<a.length; i++) {
								if (i!=1) condition = condition + '||';
								condition = condition + 't=='+a[i];
						}
						return 't='+a[0]+';'+brancher(condition);
				}
		},
		2: function(a) { return brancher(a[0]+'<'+a[1]); }, // jl
		3: function(a) { return brancher(a[0]+'>'+a[1]); }, // jg

		4: function(a) { // dec_chk
				return brancher('('+
												code_for_varcode(a[0])+
												'--)<'+a[1]);
		},
		5: function(a) { // inc_chk
				return brancher('('+
												code_for_varcode(a[0])+
												'++)<'+a[1]);
		},
		6: function(a) { // jin
				return brancher("obj_in("+a[0]+','+a[1]+')');
		},
		7: function(a) { // test
				return 't='+a[1]+';'+brancher('('+a[0]+'&t)==t');
		},
		8: function(a) { // or
				return storer('('+a[0]+'|'+a[1]+')&0xffff');
		},
		9: function(a) { // and
				return storer(a[0]+'&'+a[1]+'&0xffff');
		},
		10: function(a) { // test_attr
				return brancher('test_attr('+a[0]+','+a[1]+')');
		},
		11: function(a) { // set_attr
				return 'set_attr('+a[0]+','+a[1]+')';
		},
		12: function(a) { // clear_attr
				return 'clear_attr('+a[0]+','+a[1]+')';
		},
		13: function(a) { // store
				return store_into(code_for_varcode(a[0]), a[1]);
		},
		14: function(a) { // insert_obj
				return "insert_obj("+a[0]+','+a[1]+")";
		},
		15: function(a) { // loadw
				return storer("getword(1*"+a[0]+"+2*"+a[1]+")");
		},
		16: function(a) { // loadb
				return storer("getbyte(1*"+a[0]+"+1*"+a[1]+")");
		},
		17: function(a) { // get_prop
				return storer("get_prop("+a[0]+','+a[1]+')');
		},
		18: function(a) { // get_prop_addr
				return storer("get_prop_addr("+a[0]+','+a[1]+')');
		},
		19: function(a) { // get_next_prop
				return storer("get_next_prop("+a[0]+','+a[1]+')');
		},
		20: function(a) { return storer(a[0]+'+'+a[1]); }, // add
		21: function(a) { return storer(a[0]+'-'+a[1]); }, // sub
		22: function(a) { return storer(a[0]+'*'+a[1]); }, // mul
		23: function(a) { return storer(
																		'rounded_divide('+a[0]+','+a[1]+')'); }, // div
		24: function(a) { return storer(a[0]+'%'+a[1]); }, // mod

		25: function(a) { // call_2s
				return simple_call(a[0], a[1]);
		},
		26: function(a) { // call_2n
				// can we use simple_call here, too?
				compiling=0; // Got to stop after this.
				return "gosub("+pc_translate(a[0])+",["+a[1]+"],"+pc+",0)"
		},
		128: function(a) { // jz
				return brancher(a[0]+'==0');
		},
		129: function(a) { // get_sibling
				return "t=get_sibling("+a[0]+");"+
				storer("t")+";"+
				brancher("t");
		},
		130: function(a) { // get_child
				return "t=get_child("+a[0]+");"+
				storer("t")+";"+
				brancher("t");
		},
		131: function(a) { // get_parent
				return storer("get_parent("+a[0]+")");
		},
		132: function(a) { // get_prop_len
				return storer("get_prop_len("+a[0]+')');
		},
		133: function(a) { // inc
				var c=code_for_varcode(a[0]);
				return store_into(c, c+'+1');
		},
		134: function(a) { // dec
				var c=code_for_varcode(a[0]);
				return store_into(c, c+'-1');
		},
		135: function(a) { // print_addr
				return "output(zscii_from("+pc_translate(a[0])+"))";
		},
		136: function(a) { // call_1s
				return simple_call(a[0], '');
		},
		137: function(a) { // remove_obj
				return "remove_obj("+a[0]+','+a[1]+")";
		},
		138: function(a) { // print_obj
				return "output(name_of_object("+a[0]+"))";
		},
		139: function(a) { // ret
				compiling=0;
				return "gnusto_return("+a[0]+');return';
		},
		140: function(a) { compiling=0; // jump
											 if (a[0] & 0x8000)
											 a[0] = (~0xFFFF) | a[0];

											 var addr=(a[0] + pc) - 2;
											 return "pc="+addr+";return";
		},
		141: function(a) { // print_paddr
				return "output(zscii_from("+pc_translate(a[0])+"))";
		},
		// code_for_varcode() problem!
		// not implemented:  *     1OP:142 E       load (variable) -> (result)               load '"},
		143: function(a) { // call_1n
				// can we use simple_call here, too?
				compiling=0; // Got to stop after this.
				return "gosub("+pc_translate(a[0])+",[],"+pc+",0)"
		},

		176: function(a) { // rtrue
				compiling=0;
				return "gnusto_return(1);return";
		},
		177: function(a) { // rfalse
				compiling=0;
				return "gnusto_return(0);return";
		},
		178: simple_print, // print
		179: function(a) { // print_ret
				compiling = 0;
				return simple_print() + ';gnusto_return(1);return';
		},
		180: function(a) { // nop
				return "";
		},

		184: function(a) { // ret_popped
				compiling=0;
				return "gnusto_return(gamestack.pop());return";
		},
		// not implemented:           0OP:185 9   5/6 catch -> (result)

		186: function(a) { // quit
				compiling=0;
				return "return "+GNUSTO_EFFECT_QUIT;
		},

		187: function(a) {
				return "output('\\n')";
		},

		// not implemented:        *  0OP:189 D   3   verify ?(label)
		// "verify" would probably best be implemented as an effect opcode:
		// the environment would pass back a boolean.

		// 190 can't be generated; it's the start of an extended opcode
		190: function(a) { gnusto_error(199); },

		191: function(a) { // piracy
				return brancher("1");
		},

		224: function(a) { // call_vs
				return storer(call_vn(a,1));
		},

		225: function(a) { // storew
				return "setword("+a[2]+",1*"+a[0]+"+2*"+a[1]+")";
		},

		226: function(a) { // storeb
				return "setbyte("+a[2]+",1*"+a[0]+"+1*"+a[1]+")";
		},

		227 : function(a) { // put_prop
				return "put_prop("+a[0]+','+a[1]+','+a[2]+')';
		},
		228: function(a) { // read, aread, sread, whatever it's called today
				// That's something that we can't deal with within gnusto:
				// ask the environment to magic something up for us.

				if (a[3]) {
						// ...then we should do something with a[2] and a[3],
						// which are timed input parameters. For now, though,
						// we'll just ignore them.
				}

				compiling = 0;

				var setter = "rebound=function(n){" +
				storer("aread(n," + a[0]+","+a[1] + ")") +
				"};";

				return "pc="+pc+";"+setter+"return "+GNUSTO_EFFECT_INPUT;
		},
		229: function(a) { // print_char
				return 'output(zscii_char_to_ascii('+a[0]+'))';
		},
		230: function(a) { // print_num
				return "output("+a[0]+")";
		},
		231: function(a) { // random
				return storer("gnusto_random("+a[0]+")");
		},
		232: function(a) { // push
				return store_into('gamestack.pop()', a[0]);
		},
		233: function(a) { // pull
				var c=code_for_varcode(a[0]);
				return store_into(c, 'gamestack.pop()');
		},
		234: function(a) { // split_window
				return 'gnustoglue_split_window('+a[0]+')';
		},
		235: function(a) { // set_window
				return 'gnustoglue_set_window('+a[0]+')';
		},
		236: function(a) { // call_vs2
				return storer(call_vn(a,1));
		},
		237: function(a) { // erase_window
				return 'gnustoglue_erase_window('+a[0]+')';
		},
		238: function(a) { // erase_line
				return 'gnustoglue_erase_line('+a[0]+')';
		},
		239: function(a) { // set_cursor
				return 'gnustoglue_set_cursor('+a[0]+','+a[1]+')';
		},

		// not implemented:   VAR:240 10 4/6 get_cursor array get_cursor '"},

		241: function(a) { // set_text_style
				return 'gnustoglue_set_text_style('+a[0]+')';
		},
		
		242: function(a) { // buffer_mode
				return 'gnustoglue_set_buffer_mode('+a[0]+')';
		},

		243: function(a) { // output_stream
				return 'set_output_stream('+a[0]+','+a[1]+')';
		},

		// not implemented:   VAR:244 14 3 input_stream number input_stream '"},
		// not implemented:   VAR:245 15 5/3 sound_effect number effect volume routine sound_effect '"},

		246: function(a) { // read_char
				// Maybe factor out "read" and this?

				// a[0] is always 1; probably not worth checking for this

				if (a[3]) {
						// ...then we should do something with a[2] and a[3],
						// which are timed input parameters. For now, though,
						// we'll just ignore them.
				}

				compiling = 0;

				var setter = "rebound=function(n) { " +
				storer("n") +
				"};";

				return "pc="+pc+";"+setter+"return "+GNUSTO_EFFECT_INPUT_CHAR;
		},

		// not implemented:   * * VAR:247 17 4 scan_table x table len form -> (result)

		248: function(a) { // not
				return storer('~'+a[1]+'&0xffff');
		},

		249: call_vn,

		250: call_vn, // call_vn2,

		251: function(a) {
				return "tokenise("+a[0]+","+a[1]+","+a[2]+","+a[3]+")";
		},

		// not implemented:   VAR:252 1C 5 encode_text zscii-text length from coded-text encode_text'"},
		// not implemented:   VAR:253 1D 5 copy_table first second size copy_table '"},
		// not implemented:   VAR:254 1E 5 print_table zscii-text width height skip print_table '"},

		255: function(a) { // check_arg_count
				return brancher(a[0]+'<=param_count()');
		},
	
		1000: function(a) { // save
				compiling=0;
				var setter = "rebound=function(n) { " +
				storer('n') + "};";
				return "pc="+pc+";"+setter+";return "+GNUSTO_EFFECT_SAVE;
		},

		1001: function(a) { // restore
				compiling=0;
				var setter = "rebound=function(n) { " +
				storer('n') + "};";
				return "pc="+pc+";"+setter+";return "+GNUSTO_EFFECT_RESTORE;
		},

		1009: function(a) { // save_undo
				return storer('-1'); // not yet supplied
		},

		1010: function(a) { // restore_undo
				gnusto_error(700); // spurious restore_undo
				return storer('0');
		},

}

function getword(addr) {
		return unsigned2signed(get_unsigned_word(addr));
}

function unsigned2signed(value) {
		return ((value & 0x8000)?~0xFFFF:0)|value;
}

function signed2unsigned(value) {
		return value & 0xFFFF;
}

function get_unsigned_word(addr) {
		return getbyte(addr)*256+getbyte(addr+1);
}

function setword(value, addr) {
		setbyte((value>>8) & 0xFF, addr);
		setbyte((value) & 0xFF, addr+1);
}

// dissemble() returns a string of JavaScript code representing the
// instruction at the program counter (and possibly the next few
// instructions, too). It will change the PC to point to the end of the
// code it's dissembled.
function dissemble() {

		var args = [];
		var argcursor = 0;

		function handle_variable_parameters() {
				var types = getbyte(pc++);
				types = (types << 2) | 0x3;

				while (1) {
						var current = types & 0xC0;
						if (current==0xC0) {
								break;
						} else if (current==0x00) {
								args[argcursor++] = getword(pc);
								pc+=2;
						} else if (current==0x40) {
								args[argcursor++] = getbyte(pc++);
						} else if (current==0x80) {
								args[argcursor++] =
										code_for_varcode(getbyte(pc++));
						} else {
								gnusto_error(171); // impossible
						}
				}
		}

		compiling = !debug_mode;
		code = '';

		while(compiling) {

				args = [];
				argcursor = 0;

				var instr = getbyte(pc++);

				if (instr==0) {
						// If we just get a zero, we've probably
						// been directed off into deep space somewhere.

						gnusto_error(201, pc-1); // lost in space
				} else if (instr==190) {

						// Extended opcode.

						instr = 1000+getbyte(pc++);
						handle_variable_parameters();

				} else if (instr & 0x80) {
						if (instr & 0x40) { // Variable

								// if (instr & 0x20)... according to the z-spec.
								// I haven't seen any evidence of this.
								// (Ask on the list.)

								handle_variable_parameters();

								if (instr==250 || instr==236)
										// We get more of them!
										handle_variable_parameters();

								instr = instr & 0x1F;

						} else { // Short

								switch(instr & 0x30) {
								case 0x00:
										args[0] = getword(pc);
										pc+=2;
										break;

								case 0x10:
										args[0] = getbyte(pc++);
										break;

								case 0x11:
										args[0] =
												code_for_varcode(getbyte(pc++));
										break;
								}
						}
				} else {
						// Long opcodes.
	
						if (instr & 0x20)
								args[0] =
										code_for_varcode(getbyte(pc++));
						else
								args[0] = getbyte(pc++);

						if (instr & 0x40)
								args[1] =
										code_for_varcode(getbyte(pc++));
						else
								args[1] = getbyte(pc++);
						
				}

				if (handlers[instr]) {
						code = code + handlers[instr](args)+';';
				} else {
						gnusto_error(200, instr, pc.toString(16)); // no handler
				}

		}

		// When we're not in debug mode, dissembly only stops at places where
		// the PC must be reset; but in debug mode it's perfectly possible
		// to have |code| not read or write to the PC at all. So we need to
		// set it automatically at the end of each fragment.
		if (debug_mode) code = code + 'pc='+pc;

		return 'function(){'+code+'}';
}

////////////////////////////////////////////////////////////////
// Library functions

function rounded_divide(over, under) {

		if (under==0) {
				gnusto_error(701); // division by zero
				return 0;
		}

		var result = over / under;

		if (result<0)
				return Math.ceil(result);
		else
				return Math.floor(result);
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

function gnusto_random(arg) {
		if (arg>0) {
				return 1 + (arg * Math.random());
		} else {
				// Else we should reseed the RNG. Um.
		}
}

function clear_locals() {
		for (var i=0; i<16; i++) locals[i]=0;
}

function func_prologue(actuals) {
		var count = getbyte(pc++);
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

function look_up(word) {

		var separator_count = getbyte(dict_start);
		var entry_length = getbyte(dict_start+separator_count+1);
		var entries_count = getword(dict_start+separator_count+2);
		var entries_start = dict_start+separator_count+4;

		word = into_zscii(word);

		for (var i=0; i<entries_count; i++) {
				var address = entries_start+i*entry_length;

				var j=0;
				while (j<word.length &&
							 getbyte(address+j)==word.charCodeAt(j))
						j++;

				if (j==word.length) return address;
		}
		return 0;
}

// See aread() for caveats.
// Maybe we should allow aread() to pass in the correct value stored
// in text_buffer, since it knows it already. It means we don't have
// to figure it out ourselves.
function tokenise(text_buffer, parse_buffer, dictionary, overwrite) {
		if (dictionary) gnusto_error(101, 'no user dictionaries yet', dictionary);
		if (overwrite) gnusto_error(101, 'no overwrite yet');

		var max_chars = getbyte(text_buffer);

		var result = '';

		for (var i=0;i<getbyte(text_buffer + 1);i++)
				result += String.fromCharCode(getbyte(text_buffer + 2 + i));

		var words_count = parse_buffer + 1;
		setbyte(0, words_count);
		parse_buffer+=2;

		var words = result.split(' ');
		var position = 0;

		for (var i in words) {
				var lexical = look_up(words[i]);

				setword(lexical, parse_buffer);
				parse_buffer+=2;
				setbyte(words[i].length, parse_buffer++);
				setbyte(position, parse_buffer++);
		
				position += words[i].length+1;
				setbyte(getbyte(words_count)+1, words_count);
		}

		return 10;
}

// Very very very limited implementation:
//  * Doesn't properly handle terminating characters (always returns 10).
//  * Doesn't handle word separators.
function aread(source, text_buffer, parse_buffer) {
		var max_chars = getbyte(text_buffer);
		var result = source.substring(0,max_chars);

		setbyte(result.length, text_buffer + 1);
	
		for (var i=0;i<result.length;i++)
				setbyte(result.charCodeAt(i), text_buffer + 2 + i);

		if (parse_buffer!=0)
				tokenise(text_buffer, parse_buffer, 0, 0);

		return 10;
}

function gnusto_return(value) {
		var eater = result_eaters.pop();

		for (var i=locals_stack.shift(); i>0; i--) {
				locals.shift();
		}
		param_counts.shift()
				pc = call_stack.pop();
		if (eater) eater(value);
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

		var value = getbyte(address-1);

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
				return getword(temp[0]);
		} else if (temp[1]==1) {
				return getbyte(temp[0]); // should this be treated as signed?
		} else
				// get_prop used on a property of the wrong length
				gnusto_error(706, object, property);

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
		var props_address = get_unsigned_word(objs_start + 124 + object*14);

		props_address = props_address + getbyte(props_address)*2 + 1;

		var previous_prop = 0;

		while(1) {
				var len = 1;

				var prop = getbyte(props_address++);

				if (prop & 0x80) {
						// Long format.
						len = getbyte(props_address++) & 0x3F;
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
		var value = getbyte(address);
		setbyte(value | (128>>(bit%8)), address);
}

function clear_attr(object, bit) {
		if (object==0) return; // Kill that V0EFH before it starts.

		var address = objs_start + 112 + object*14 + (bit>>3);
		var value = getbyte(address);
		setbyte(value & ~(128>>(bit%8)), address);
}

function test_attr(object, bit) {
		if (object==0) return 0; // Kill that V0EFH before it starts.

		if ((getbyte(objs_start + 112 + object*14 +(bit>>3)) &
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
				setbyte(value & 0xff, address[0]);
		} else if (address[1]==2) {
				setword(value&0xffff, address[0]);
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
		return get_unsigned_word(
														 objs_start + 112 + relationship + from*14);
}

function get_parent(from)  { return get_family(from, PARENT_REC); }
function get_child(from)   { return get_family(from, CHILD_REC); }
function get_sibling(from) { return get_family(from, SIBLING_REC); }

function set_family(from, to, relationship) {
		setword(to,
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
				set_transcribing(1);
		} else if (target==3) {

				if (streamthrees.length>15)
						gnusto_error(202); // too many nested stream-3s

				streamthrees.unshift([address, address+2]);

		} else if (target==4) {
				output_to_script = 1;
		} else if (target==-1) {
				output_to_console = 0;
		} else if (target==-2) {
				set_transcribing(0);
		} else if (target==-3) {

				if (streamthrees.length<1)
						gnusto_error(203); // not enough nested stream-3s

				var latest = streamthrees.shift();
				setword((latest[1]-latest[0])-2, latest[0]);

		} else if (target==-4) {
				output_to_script = 0;
		} else
				gnusto_error(204, target); // weird output stream number
}

// Returns whether the Z-machine has transcription turned on.
function is_transcribing() {
		return output_to_transcript;
}

// Turns transcription on or off. Can be called by the environment.
function set_transcribing(whether) {
		if (whether)
				output_to_transcript = 1;
		else
				output_to_transcript = 0;

		// And notify the environment about it.
		gnustoglue_notify_transcription(output_to_transcript);
}

////////////////////////////////////////////////////////////////

// setup()
//
// Initialises global variables.
//
// Since this function reads certain values out of the Z-machine's
// memory, the story must be loaded before this function is called.

function setup() {
		jit = [];
		compiling = 0;
		gamestack = [];

		call_stack = [];
		locals = [];
		locals_stack = [];
		param_counts = [];
		result_eaters = [];

		setbyte(0x1c, 1); // flags 1
		// (This is partially dependent on the environment...
		// it should probably ask what's available.)
		setbyte(80, 32); // width (notional)
		setbyte(25, 33); // height (notional)
		himem      = get_unsigned_word(0x4)
				pc         = get_unsigned_word(0x6)
				dict_start = get_unsigned_word(0x8)
				objs_start = get_unsigned_word(0xA)
				vars_start = get_unsigned_word(0xC)
				stat_start = get_unsigned_word(0xE)
				abbr_start = get_unsigned_word(0x18)

				rebound = 0;

		output_to_console = 1;
		set_transcribing(0);
		streamthrees = [];
		output_to_script = 0;
		debug_mode = 0;

		clear_locals();
}

////////////////////////////////////////////////////////////////

// Main point of entry for gnusto. Be sure to call setup() before calling
// this the first time.
//
// This function returns an effect code when the machine pauses, stating
// why the machine was paused. More details, and the actual values, are
// given above.
// 
// |answer| is for returning answers to earlier effect codes. If you're
// not answering an effect code, pass 0 here.
function go(answer) {
		var start_pc = 0;
		var stopping = 0;
		var turns = 0;
		var turns_limit = debug_mode? 1: 1000;

		if (rebound) {
				rebound(answer);
				rebound = 0;
		}

		while(!stopping) {

				if (turns++ >= turns_limit)
						// Wimp out for now.
						return GNUSTO_EFFECT_WIMP_OUT;

				start_pc = pc;
				if (!jit[start_pc]) eval('jit[start_pc]=' + dissemble());
				stopping = jit[start_pc]();
		}

		// so, return an effect code.
		return stopping;
}

// This should probably be done programmatically...
var zalphabet = {
		0: 'abcdefghijklmnopqrstuvwxyz',
		1: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
		2: 'T\n0123456789.,!?_#\'"/\\-:()', // T = magic ten bit flag
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

// This function is specifically for encoding ASCII to ZSCII to match
// against dictionary words. It's not (yet) possible to implement
// encode_text using it.
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
						emit(ch-59);
				} else if (ch>=97 && ch<=122) { // a to z
						emit(ch-91);
				} else {
						var z2 = zalphabet[2].indexOf(ch);

						if (z2!=-1) {
								emit(5);
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
				return zscii_from(get_unsigned_word(aa)+1);
		}
}

function output(text) {
		if (streamthrees.length) {
				// Stream threes disable any other stream while they're on.

				var current = streamthrees[0];
				var address = streamthrees[0][1];

				for (var i=0; i<text.length; i++)
						setbyte(text.charCodeAt(i), address++)

								streamthrees[0][1] = address;
		} else {
				if (output_to_console) gnustoglue_output(text);
				if (output_to_transcript) gnustoglue_transcribe(text);
		}
}
