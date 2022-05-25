SRC := src
INCLUDE := include
OBJECTS := src/indexer/basefuns.o src/indexer/readline.o src/indexer/rbtree.o src/indexer/symboltable.o src/indexer/suffixarray.o src/indexer/main.o
LIBS :=
BIN := bin
CC := gcc


.PHONY: all
all: rm_old_pyc $(BIN)/c-indexer

.PHONY: rm_old_pyc
rm_old_pyc:
	@# Avoid accidentally autoloading old .pyc files
	@rm -f bin/libs/filetype/ft_*.py[cdo]
	@rm -f bin/libs/tagset/tset_*.py[cdo]


################################################
$(BIN)/c-indexer: $(OBJECTS)
	$(CC) -Wall -Wno-parentheses -I $(INCLUDE) -o $(BIN)/c-indexer $^
	@echo -e "\nThe mwetoolkit indexer was compiled and installed successfully at $@\n"

%.o: %.c
	$(CC) -Wall -Wno-parentheses -c -I $(INCLUDE) $^ -o $*.o


doc: doc/html/index.html

doc/html/index.html:
	mkdir -p doc
	doxygen Doxyfile
	
clean:
	rm -rf doc/html bin/c-indexer
	rm -rf $(SRC)/indexer/*.o
