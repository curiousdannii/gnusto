// tossio.js || -*- Mode: Java; tab-width: 2; -*-
// The debugger in Gnusto.

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
//  [5] : Treats constant argument as a variable identifier
//  [6] : Execution can never continue on from this opcode

alert('tossio start');
tossio_opcodes = {
//////////////////////////////////////////// 2-OPs ////////////////////////////
//      Name                 St?  Br? Txt? Ind? Con? Stp?
   1: [ 'je'                ,  0,   1,   0,   0,   0,   0],
   2: [ 'jl'                ,  0,   1,   0,   0,   0,   0],
   3: [ 'jg'                ,  0,   1,   0,   0,   0,   0],
   4: [ 'dec_chk'           ,  0,   1,   0,   0,   1,   0],
   5: [ 'inc_chk'           ,  0,   1,   0,   0,   1,   0],
   6: [ 'jin'               ,  0,   1,   0,   0,   0,   0],
   7: [ 'test'              ,  0,   1,   0,   0,   0,   0],
   8: [ 'or'                ,  1,   0,   0,   0,   0,   0],
   9: [ 'and'               ,  1,   0,   0,   0,   0,   0],
  10: [ 'test_attr'         ,  0,   1,   0,   0,   0,   0],
//      Name                 St?  Br? Txt? Ind? Con? Stp?
  11: [ 'set_attr'          ,  0,   0,   0,   0,   0,   0],
  12: [ 'clear_attr'        ,  0,   0,   0,   0,   0,   0],
  13: [ 'store'             ,  0,   0,   0,   0,   1,   0],
  14: [ 'insert_obj'        ,  0,   0,   0,   0,   0,   0],
  15: [ 'loadw'             ,  1,   0,   0,   0,   0,   0],
  16: [ 'loadb'             ,  1,   0,   0,   0,   0,   0],
  17: [ 'get_prop'          ,  1,   0,   0,   0,   0,   0],
  18: [ 'get_prop_addr'     ,  1,   0,   0,   0,   0,   0],
  19: [ 'get_next_prop'     ,  1,   0,   0,   0,   0,   0],
  20: [ 'add'               ,  1,   0,   0,   0,   0,   0],
//      Name                 St?  Br? Txt? Ind? Con? Stp?
  21: [ 'sub'               ,  1,   0,   0,   0,   0,   0],
  22: [ 'mul'               ,  1,   0,   0,   0,   0,   0],
  23: [ 'div'               ,  1,   0,   0,   0,   0,   0],
  24: [ 'mod'               ,  1,   0,   0,   0,   0,   0],
  25: [ 'call_2s'           ,  1,   0,   0,   1,   0,   0],
  26: [ 'call_2n'           ,  0,   0,   0,   1,   0,   0],
  27: [ 'set_colour'        ,  0,   0,   0,   0,   0,   0],
// mm, if the skin is en-us, maybe we should change that :)
  28: [ 'throw'             ,  0,   0,   0,   0,   0,   1],

//////////////////////////////////////////// 1-OPs ////////////////////////////
//      Name                 St?  Br? Txt? Ind? Con? Stp?
 128: [ 'jz'                ,  0,   1,   0,   0,   0,   0],
 129: [ 'get_sibling'       ,  1,   1,   0,   0,   0,   0],
 130: [ 'get_child'         ,  1,   1,   0,   0,   0,   0],
 131: [ 'get_parent'        ,  1,   0,   0,   0,   0,   0],
 132: [ 'get_prop_len'      ,  1,   0,   0,   0,   0,   0],
 133: [ 'inc'               ,  0,   0,   0,   0,   1,   0],
 134: [ 'dec'               ,  0,   0,   0,   0,   1,   0],
 135: [ 'print_addr'        ,  0,   0,   0,   0,   0,   0],
 136: [ 'call_1s'           ,  1,   0,   0,   1,   0,   0],
 137: [ 'remove_obj'        ,  0,   0,   0,   0,   0,   0],
 138: [ 'print_obj'         ,  0,   0,   0,   0,   0,   0],
 139: [ 'ret'               ,  0,   0,   0,   0,   0,   1],
 140: [ 'jump'              ,  0,   0,   0,   0,   0,   1],
 141: [ 'print_paddr'       ,  0,   0,   0,   0,   0,   0],
 142: [ 'load'              ,  1,   0,   0,   0,   1,   0],
 143: [ 'call_1n'           ,  1,   0,   0,   1,   0,   0],

//////////////////////////////////////////// 0-OPs ////////////////////////////
//      Name                 St?  Br? Txt? Ind? Con? Stp?
 176: [ 'rtrue'             ,  0,   0,   0,   0,   0,   1],
 177: [ 'rfalse'            ,  0,   0,   0,   0,   0,   1],
 178: [ 'print'             ,  0,   0,   1,   0,   0,   0],
 179: [ 'print_ret'         ,  0,   0,   1,   0,   0,   1],
 180: [ 'nop'               ,  0,   0,   0,   0,   0,   0],
// 181 and 182 don't exist in v5
 183: [ 'restart'           ,  0,   0,   0,   0,   0,   1],
 184: [ 'ret_popped'        ,  0,   0,   0,   0,   0,   1],
 185: [ 'catch'             ,  0,   1,   0,   0,   0,   0],
 186: [ 'quit'              ,  0,   0,   0,   0,   0,   1],
 187: [ 'new_line'          ,  0,   0,   0,   0,   0,   0],
// 188 doesn't exist in v5
 189: [ 'verify'            ,  0,   1,   0,   0,   0,   0],
// 190 is the start of an extended opcode
 191: [ 'piracy'            ,  0,   1,   0,   0,   0,   0],

/////////////////////////////////////////// VAR-OPs ///////////////////////////
//      Name                 St?  Br? Txt? Ind? Con? Stp?

 224: [ 'call'              ,  1,   0,   0,   1,   0,   0],
 225: [ 'storew'            ,  0,   0,   0,   0,   0,   0],
 226: [ 'storeb'            ,  0,   0,   0,   0,   0,   0],
 227: [ 'put_prop'          ,  0,   0,   0,   0,   0,   0],
 228: [ 'read'              ,  1,   0,   0,   0,   0,   0],
 229: [ 'print_char'        ,  0,   0,   0,   0,   0,   0],
//      Name                 St?  Br? Txt? Ind? Con? Stp?
 230: [ 'print_num'         ,  0,   0,   0,   0,   0,   0],
 231: [ 'random'            ,  1,   0,   0,   0,   0,   0],
 232: [ 'push'              ,  0,   0,   0,   0,   0,   0],
 233: [ 'pull'              ,  0,   0,   0,   0,   1,   0],
 234: [ 'split_window'      ,  0,   0,   0,   0,   0,   0],
 235: [ 'set_window'        ,  0,   0,   0,   0,   0,   0],
 236: [ 'call_vs2'          ,  1,   0,   0,   1,   0,   0],
 237: [ 'erase_window'      ,  0,   0,   0,   0,   0,   0],
 238: [ 'erase_line'        ,  0,   0,   0,   0,   0,   0],
 239: [ 'set_cursor'        ,  0,   0,   0,   0,   0,   0],
//      Name                 St?  Br? Txt? Ind? Con? Stp?
 240: [ 'get_cursor'        ,  0,   0,   0,   0,   0,   0],
 241: [ 'set_text_style'    ,  0,   0,   0,   0,   0,   0],
 242: [ 'buffer_mode'       ,  0,   0,   0,   0,   0,   0],
 243: [ 'output_stream'     ,  0,   0,   0,   0,   0,   0],
 244: [ 'input_stream'      ,  0,   0,   0,   0,   0,   0],
 245: [ 'sound_effect'      ,  0,   0,   0,   0,   0,   0],
 246: [ 'read_char'         ,  1,   0,   0,   0,   0,   0],
 247: [ 'scan_table'        ,  1,   1,   0,   0,   0,   0],
 248: [ 'not'               ,  1,   0,   0,   0,   0,   0],
 249: [ 'call_vn'           ,  0,   0,   0,   1,   0,   0],
//      Name                 St?  Br? Txt? Ind? Con? Stp?
 250: [ 'call_vn2'          ,  0,   0,   0,   1,   0,   0],
 251: [ 'tokenise'          ,  0,   0,   0,   0,   0,   0],
 252: [ 'encode_text'       ,  0,   0,   0,   0,   0,   0],
 253: [ 'copy_table'        ,  0,   0,   0,   0,   0,   0],
 254: [ 'print_table'       ,  0,   0,   0,   0,   0,   0],
 255: [ 'check_arg_count'   ,  0,   1,   0,   0,   0,   0],

///////////////////////////////////////////// EXTs ////////////////////////////
//      Name                 St?  Br? Txt? Ind? Con? Stp?

1000: [ 'save'              ,  1,   0,   0,   0,   0,   0],
1001: [ 'restore'           ,  1,   0,   0,   0,   0,   0],
1002: [ 'log_shift'         ,  1,   0,   0,   0,   0,   0],
1003: [ 'art_shift'         ,  1,   0,   0,   0,   0,   0],
1004: [ 'set_font'          ,  1,   0,   0,   0,   0,   0],
// ... no more in v5 until ...
1009: [ 'save_undo'         ,  1,   0,   0,   0,   0,   0],
1010: [ 'restore_undo'      ,  1,   0,   0,   0,   0,   0],
1011: [ 'print_unicode'     ,  0,   0,   0,   0,   0,   0],
1012: [ 'check_unicode'     ,  0,   0,   0,   0,   0]
	};

alert('tossio end');
