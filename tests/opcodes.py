#!/usr/bin/env python
import array
import json
import os
import re
import infasm

# The QUnit templates
template = '''<!DOCTYPE HTML>
<html>
<head>
	<meta charset="utf-8">
	<title>Gnusto unit tests</title>
	<link rel="stylesheet" href="testsuite.css" type="text/css">
	<script src="jquery.js"></script>
	<script src="testrunner.js"></script>
	<script src="../gnusto-engine.js"></script>
	<script>
FatalError = new Error();
$(document).ready(function(){'''
template_after = '''\n\n});
	</script>
</head>
<body>
	<h1>Gnusto unit tests</h1>
	<h2 id="banner"></h2>
	<h2 id="userAgent"></h2>
	<ol id="tests"></ol>
	<div id="main"></div>
</body>
</html>'''

output = open('opcodes.html', 'w')
output.write(template)

# Get all the tests
tests = os.listdir('opcodes')
for test in tests:
	if os.path.splitext(test)[1] == '.inf':
		source = file('opcodes/' + test).read()
		opcode = re.search('!OPCODE\s+([a-z_]+)', source).group(1)
		gen = infasm.assemble(source)

		output.write('\n\n\ttest("Opcode ' + opcode + '", function() {')

		# Get the array addresses
		arrays = {}
		for k, v in gen.arrays.names.items():
			arrays[k] = v.addr
		output.write('\n\t\tvar arrays = ' + json.dumps(arrays) + ';')

		# Output the storyfile
		output.write('\n\t\tvar zcode = ' + json.dumps(list(array.array('B', gen.bytecode)), separators=(',', ':')) + ';')

		# Output the Gnusto running code
		output.write('''
		var engine = new GnustoEngine();
		engine.loadStory(zcode);
		engine.run();''')

		# Output the test itself! :)
		test = re.search('!TEST\s+(.+)', source).group(1)
		output.write('\n\t\t' + test)

		output.write('\n\t});')

output.write(template_after)
output.close()
