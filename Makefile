XPCOM_SRC = /usr/share/idl/mozilla/
IDL_INCLUDES = -I$(XPCOM_SRC) -I$(XPCOM_SRC)base -I$(XPCOM_SRC)io
IDL_COMPILER = /usr/local/bin/xpidl -m typelib -w -v $(IDL_INCLUDES)
COMPONENTS_DIR = /home/marnanel/proj/gnusto/xpcom_components

# why doesn't this work?
.idl.xpt:
	xpidl -m typelib -w -v -I/usr/src/mozilla/xpcom/base $<
	cp $@ components

main:
	for G in *.idl; do $(IDL_COMPILER) $$G; done
	mv *.xpt $(COMPONENTS_DIR)
	cp *.js $(COMPONENTS_DIR)
	rm -f $(COMPONENTS_DIR)/xpti.dat $(COMPONENTS_DIR)/compreg.dat





