ROOT_DIR=$(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))

# Rule to build everything after cleaning
all:	install	clean	ui	antora

# Rule to install dependencies
install:
	@echo "Installing dependencies"
	cd $(ROOT_DIR) && npm i

# Rule to clean cache
clean:
	rm -rf build

# Rule to build the Antora documentation
antora:
	@echo "Building documentation"
	cd $(ROOT_DIR) && npm i
	cd $(ROOT_DIR) && npx antora --fetch local-antora-playbook.yml
	cd $(ROOT_DIR) && npx http-server build/site -c-1
	@echo "Antora site is up"

# Rule to show help message
help:
	@awk '/^#/{c=substr($$0,3);next}c&&/^[[:alpha:]][[:alnum:]_-]+:/{print substr($$1,1,index($$1,":")),c}1{c=0}' $(MAKEFILE_LIST) | column -s: -t | sort
