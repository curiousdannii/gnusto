///////////////////////////////////////////////////////////////
//
// This is a very early release of the Gnusto JavaScript
// Z-machine library.
//
// Copyright (c) 2002, Thomas Thurman <marnanel@marnanel.org>
// Released under the GNU GPL.
//
////////////////////////////////////////////////////////////////

var jit = []
var compiling = 0;
var gamestack = [];
var sp=0;

////////////////////////////////////////////////////////////////

function word2signed(value) {
	if (value & 0x8000)
		return (~0xFFFF) | value;
	else
		return value;

}
////////////////////////////////////////////////////////////////

function call_vn(args, offset) {
	compiling = 0;
	var address = pc;
	if (offset) { address += offset; }

	return 'gosub('+
		args[0]+'*4,'+
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

	// No code there? Mark that we want it later.
	if (!jit[target_address]) jit[target_address]=0;

	return if_statement + '{pc='+
		(target_address)+';return;}';
//	return if_statement + '{print("'+if_statement+' TAKEN");pc='+
//		(target_address)+';return;}else{print("'+if_statement+' NOT TAKEN")}';
}

function code_for_varcode(varcode) {
	if (varcode==0) {
		return 'gamestack.pop()'
	} else if (varcode < 0x10) {
		return 'locals['+(varcode-1)+']';
	} else {
		address = vars_start+(varcode-16)*2;
		return 'getword('+address+')';
	}
}

function store_into(lvalue, rvalue) {
	if (rvalue.substring && rvalue.substring(0,5)=='gosub') {
		// Special case: the results of gosubs can't
		// be stored synchronously.

		compiling = 0; // just to be sure we stop here.

		if (rvalue.substring(rvalue.length-3)!=',0)') {
			// You really shouldn't pass us gosubs with
			// the result function filled in.
			throw "can't modify gosub! "+rvalue;
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
		return 'setbyte("a",'+rvalue+','+lvalue.substring(8);
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
	return "t="+target+";gosub(t*4,["+arguments+"],"+pc+","+
		functino;
}

function simple_print(a) {
	var zf = zscii_from(pc,65535,1);
	var message=(zf[0].
		replace('\\','\\\\').
		replace('"','\\"').
		replace('\n','\\n')); // not elegant
	pc=zf[1];
	return 'output("'+message+'")';
}

function cursor_handling_is_a_bit_advanced(a) {
	return ""; // so just pretend
}

////////////////////////////////////////////////////////////////
//
// handlers
//
// An array mapping opcodes to functions. Each function returns
// a string of JS which can be evaluated to do the job of that
// opcode. (These can be concatenated to form functions.)
//
var handlers = {

	1: function(a) { // je
		// This could be optimised a good deal.
		// Use a multiway if statement:
		// Length <  2: do nothing.
		// Length == 2: direct comparison
		// Length >  2: set t, then compare against it
		//		(length must be 3 or 4)

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
	23: function(a) { return storer(a[0]+'/'+a[1]); }, // div
	24: function(a) { return storer(a[0]+'%'+a[1]); }, // mod

	25: function(a) { // call_2s
		return simple_call(a[0], a[1]);
	},
	26: function(a) { // call_2n
		// can we use simple_call here, too?
		compiling=0; // Got to stop after this.
		return "gosub("+a[0]*4+",["+a[1]+"],"+pc+",0);"
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
	135: function(a) {
		return "output(zscii_from("+a[0]+"*4))";
	},
	136: function(a) { // call_1s.
			return simple_call(a[0], '');
		},
	// not implemented:   1OP:137 9       remove_obj object
	138: function(a) { // print_obj
		return "output(name_of_object("+a[0]+"))";
		},
	139: function(a) { // ret
		compiling=0;
		return "gnusto_return("+a[0]+');return';
		},
	140: function(a) { compiling=0; // jump
		var addr=(word2signed(a[0]) + pc) - 2;
		return "pc="+addr+";return";
		},
	141: function(a) { // print_paddr
		return "output(zscii_from("+a[0]+"*4))";
		},
	// code_for_varcode() problem!
	// not implemented:  *     1OP:142 E       load (variable) -> (result)               load '"},
	143: function(a) { // call_1n
		// can we use simple_call here, too?
		compiling=0; // Got to stop after this.
		return "gosub("+a[0]+"*4,[],"+pc+",0);"
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
	// not implemented: function(a) { compiling=0; and RESTART somehow,
	184: function(a) { // ret_popped
		compiling=0;
		return "gnusto_return(gamestack.pop());return";
	},
	// not implemented:           0OP:185 9   1   pop                             pop'"},
	// not implemented:     *                 5/6 catch -> (result)               catch '"},
	// not implemented:           0OP:186 A       quit                            quit'"},
	187: function(a) { return "output('\\n')" },
	// not implemented:        *  0OP:189 D   3   verify ?(label)                 verify '"},

	190: function(a) { throw "extended opcodes not implemented"; },

	191: function(a) { // piracy
		return brancher("1");
	},

	224: function(args) { // call_vs
		return storer(call_vn(args,1));
	},

	225: function(a) { // storew
		return "setword("+a[2]+",1*"+a[0]+"+2*"+a[1]+")";
	},

	226: function(a) { // storeb
		var qqq=pc.toString(16);
		return "setbyte('b"+qqq+"',"+a[2]+",1*"+a[0]+"+1*"+a[1]+")";
	},

	227 : function(a) { // put_prop
		return "put_prop("+a[0]+','+a[1]+','+a[2]+')';
	},
	228: function(a) { // read, aread, sread, whatever it's called today
		if (a[3])
			return storer(
				"aread("+a[0]+","+a[1]+","+a[2]+","+a[3]+")");
		else
			return storer("aread("+a[0]+","+a[1]+",0,0)");
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
	234: cursor_handling_is_a_bit_advanced, // split_window
	235: cursor_handling_is_a_bit_advanced, // set_window
	236: function(args) { // call_vs2
		return storer(call_vn(args,1));
	},
	237: cursor_handling_is_a_bit_advanced, // erase_window
	238: cursor_handling_is_a_bit_advanced, // erase_line
	239: cursor_handling_is_a_bit_advanced, // set_cursor
	// not implemented:   VAR:240 10 4/6 get_cursor array get_cursor '"},
	241: cursor_handling_is_a_bit_advanced, // set_text_style
	// not implemented:   VAR:242 12 4 buffer_mode flag buffer_mode '"},
	// not implemented:   VAR:243 13 3 output_stream number output_stream '"},
	// not implemented:   5 output_stream number table output_stream '"},
	// not implemented:   6 output_stream number table width output_stream '"},
	// not implemented:   VAR:244 14 3 input_stream number input_stream '"},
	// not implemented:   VAR:245 15 5/3 sound_effect number effect volume routine sound_effect '"},
	// not implemented:   * VAR:246 16 4 read_char 1 time routine -> (result) read_char '"},
	// not implemented:   * * VAR:247 17 4 scan_table x table len form -> (result) scan_table '"},
	// not implemented:   * VAR:248 18 5/6 not value -> (result) not '"},

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
	}
}

function getword(addr) {
	return unsigned2signed(get_unsigned_word(addr));
}

function unsigned2signed(value) {
	return ((value & 0x8000)?~0xFFFF:0)|value;
}

function get_unsigned_word(addr) {
	var result = getbyte(addr)*256+getbyte(addr+1);
	alert('GUW from '+addr.toString(16)+':'+getbyte(addr).toString(16)+";"+getbyte(addr+1).toString(16)+";"+result.toString(16));
	return result;
}

function setword(value, addr) {
	setbyte('c',(value>>8) & 0xFF, addr);
	setbyte('d',(value) & 0xFF, addr+1);
}

setbyte('e',0,   1); // for now, we don't provide anything
setbyte('e',80, 32); // width (notional)
setbyte('e',25, 33); // height (notional)
var himem      = get_unsigned_word(0x4)
var pc         = get_unsigned_word(0x6)
var dict_start = get_unsigned_word(0x8)
var objs_start = get_unsigned_word(0xA)
var vars_start = get_unsigned_word(0xC)
var stat_start = get_unsigned_word(0xE)

function dissemble() {
	alert('starting execution at '+pc.toString(16));
	compiling = 1;
	code = '';

	while(compiling) {
		var instr = getbyte(pc++);

		var form = 'L';
		var ops = 2;

		// Types of operands.
		var types = 0xFFFF;

		if (instr==190) {
			form = 'E';
			ops = -1;
			instr = getbyte(pc++);
		} else if (instr & 0x80) {
			if (instr & 0x40) {
				form = 'V';
				if (instr & 0x20) {
					ops = -1;
				} else {
					ops = 0;
				}
			} else {
				form = 'S';
				var optype = (instr & 0x30) >> 4;
				if (optype==3) {
					ops = 0;
				} else {
					ops = 1;
					types = (optype << 14) | 0x3fff;
				}
			}
		} else {
			// Long opcodes.
	
			// Type information is stored weirdly here...
	
			types = 0xFFF;
			if (instr & 0x20) types |= 0x2000;
				else types |= 0x1000;
			if (instr & 0x40) types |= 0x8000;
				else types |= 0x4000;

			instr = instr & 0x1F;
		}

		if (form=='V' || form=='E') {
			types = (getbyte(pc++)<<8)

			if (instr==250 || instr==236) {
				types = types | getbyte(pc++);
			} else {
				types = types | 0xFF;
			}
		}

		var args = [];
		var argcursor = 0;

		while(1) {
			var current = (types & 0xC000);
			if (current==0xC000) {
				break;
			} else if (current==0x0000) {
				args[argcursor++] = getword(pc);
				pc+=2;
			} else if (current==0x4000) {
				args[argcursor++] = getbyte(pc++);
			} else if (current==0x8000) {
				args[argcursor++] =
					code_for_varcode(getbyte(pc++));
			} else {
				throw "impossible";
			}
			types = (types << 2) + 0x3;
		}

		// some adjustments for opcode blocks:
		if (instr>=192 && instr<=223) { instr -= 192; }
		else if (instr>=144 && instr<=159) { instr -= 16; }
		else if (instr>=160 && instr<=175) { instr -= 32; }

		if (handlers[instr]) {
			var a123 = handlers[instr](args);
			alert(a123);
			code = code + a123 +';';
		} else {
			throw "No handler for opcode "+instr+" at "+
				pc.toString(16);
		}

	}

	return 'function(){'+code+'}'
}

////////////////////////////////////////////////////////////////
// Library functions

function zscii_char_to_ascii(zscii_code) {
	if (zscii_code<0 || zscii_code>1023)
		throw "illegal zscii code output! "+zscii_code;

	var result;

	if (zscii_code==13)
		result = 10;
	else if ((zscii_code>=32 && zscii_code<=126) || zscii_code==0)
		result = zscii_code;
	else
		throw "don't know how to convert zscii code "+zscii_code;

	return String.fromCharCode(result);
}

var func_stack = [];
var locals = []
var locals_stack = []
var param_counts = []
var result_eaters = []

function gnusto_random() {
	return 1; // for now
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
	func_stack.push(ret_address);
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
	// note: very inefficient. We turn all the entries into ascii and
	// compare. Really we should turn |word| into zscii and compare.
	word = word.substring(0,9);
	var separator_count = getbyte(dict_start);
	var entry_length = getbyte(dict_start+separator_count+1);
	var entries_count = getword(dict_start+separator_count+2);
	var entries_start = dict_start+separator_count+4;

	for (var i=0; i<entries_count; i++) {
		var address = entries_start+i*entry_length;
		var candidate = zscii_from(address, 6);
		if (candidate==word) return address;
	}
	return 0;
}

// See aread() for caveats.
// Maybe we should allow aread() to pass in the correct value stored
// in text_buffer, since it knows it already. It means we don't have
// to figure it out ourselves.
function tokenise(text_buffer, parse_buffer, dictionary, overwrite) {
	if (dictionary) throw 'no user dictionaries yet -- '+dictionary;
	if (overwrite) throw 'no overwrite yet';

	var max_chars = getbyte(text_buffer);

	var result = '';

	for (var i=0;i<getbyte(text_buffer + 1);i++)
		result += String.fromCharCode(getbyte(text_buffer + 2 + i));

	var words_count = parse_buffer + 1;
	setbyte('f',0, words_count);
	parse_buffer+=2;

	var words = result.split(' ');
	var position = 0;

	for (var i in words) {
		var lexical = look_up(words[i]);

		setword(lexical, parse_buffer);
		parse_buffer+=2;
 		setbyte('g',words[i].length, parse_buffer++);
		setbyte('h',position, parse_buffer++);
		
		position += words[i].length+1;
		setbyte('i',getbyte(words_count)+1, words_count);
	}

	return 10;
}

// Very very very limited implementation:
//  * Doesn't properly handle terminating characters (always returns 10).
//  * Doesn't handle word separators.
//  * Doesn't honour the timer interrupt at all.
function aread(text_buffer, parse_buffer, time, routine) {
	var max_chars = getbyte(text_buffer);
	var result = input().substring(0,max_chars);

	setbyte('j',result.length, text_buffer + 1);
	
	for (var i=0;i<result.length;i++)
		setbyte('k',result.charCodeAt(i), text_buffer + 2 + i);

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
	pc = func_stack.pop();
	if (eater) eater(value);
}

function get_prop_addr(object, property) {
	var result = property_search(object, property);
	if (result[2]) {
		return result[0];
	} else {
		return 0;
	}
}

function get_prop_len(address) {
	var prop = getbyte(address++);
	var len = 1;

	if (prop & 0x80) {
		// Long format.
		len = getbyte(props_address++);
		if (len==0) len = 64;
	} else {
		// Short format.
		if (prop & 0x40) len = 2;
	}

	return len;
}

function get_prop(object, property) {
	var temp = property_search(object, property);

	if (temp[1]==2) {
		return getword(temp[0]);
	} else if (temp[1]==1) {
		return getbyte(temp[0]); // should this be treated as signed?
	} else {
		throw "get_prop used on a property of the wrong length";
	}
	throw "impossible";
}

// returns an array.
// first element is the address.
// second is the length.
// third is 1 if this property really belongs to the object,
//	or 0 if it's a default.
function property_search(object, property) {
	var props_address = get_unsigned_word(objs_start + 124 + object*14);

	props_address = props_address + getbyte(props_address)*2 + 1;

	while(1) {
		var prop = getbyte(props_address++);
		var len = 1;

		if (prop & 0x80) {
			// Long format.
			len = getbyte(props_address++);
			if (len==0) len = 64;
		} else {
			// Short format.
			if (prop & 0x40) len = 2;
		}
		prop = prop & 0x3F;

		if (prop==property) {
			return [props_address, len, 1];
		} else if (prop < property) {
			// it's not there, then.
			// get it from the defaults
			return [objs_start + (property-1)*2, 2, 0];

			// (fixme: should check for invalid property
			// numbers, too)
		}

		props_address += len;
	}
	throw "impossible";
}

////////////////////////////////////////////////////////////////
// Functions that modify the object tree

function set_attr(object, bit) {
	var address = objs_start + 112 + object*14 + (bit>>3);
	var value = getbyte(address);
	setbyte('l', value | (128>>(bit%8)), address);
}

function clear_attr(object, bit) {
	var address = objs_start + 112 + object*14 + (bit>>3);
	var value = getbyte(address);
	setbyte('m',value & ~(128>>(bit%8)), address);
}

function put_prop(object, property, value) {
	var address = property_search(object, property);

	if (!address[2]) throw "put_prop on an undefined property";
	if (address[1]==1) {
		setbyte('n',value & 0xff, address[0]);
	} else if (address[1]==2) {
		setword(value&0xffff, address[0]);
	} else {
		throw "put_prop on a property with a weird length";
	}
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
		if (next_along==mover) {
			return mover; // Yay! Got it!
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

////////////////////////////////////////////////////////////////

function test_attr(object, bit) {
	var address = objs_start + 112 + object*14;

	if (getbyte(address+(bit>>3)) & (128>>(bit%8)))
		return 1;
	else
		return 0;
}

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

function obj_in(parent, child) {
	return get_parent(child) == parent;
}

function param_count() {
	return param_counts[0];
}

////////////////////////////////////////////////////////////////

function setup() {
	clear_locals();
}

////////////////////////////////////////////////////////////////

function execute_loop() {
	var start_pc;
	while(1) {
		start_pc = pc;
		if (!jit[start_pc]) eval('jit[start_pc]=' + dissemble());
		jit[start_pc]();
	}
}

var zalphabet = {
  0: 'abcdefghijklmnopqrstuvwxyz',
  1: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  2: '*\n0123456789.,!?_#\'"/\\-:()',
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

	if (!max_length) max_length = 65535;
	var stopping_place = address + max_length;

	while (running) {
		var word = get_unsigned_word(address);
		address += 2;

		running = !(word & 0x8000) && address<stopping_place;

		for (var j=2; j>=0; j--) {
			var code = ((word>>(j*5))&0x1f)

			// FIXME: also need to handle:
			//  * abbreviations

			if (tenbit==-2) {
				if (code==0) { temp = temp + ' '; alph=0; }
				else if (code==4) { alph = 1; }
				else if (code==5) { alph = 2; }
				else if (code>5) {
					var c = zalphabet[alph][code-6];
					if (c=='*')
						tenbit = -1;
					else
						temp = temp + c;
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
	// ...
}

function name_of_object(object) {

	if (object==0)
		return "<void>";
	else {
		var aa = objs_start + 124 + object*14;
		return zscii_from(get_unsigned_word(aa)+1);
	}
}

