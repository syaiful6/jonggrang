.DEFAULT_GOAL = help

.PHONY: lint test compile clean

bin := $(shell npm bin)
tslint := $(bin)/tslint

SRC_DIRS := $(shell find packages/*/src -name '*.ts')

help:
	@echo ""
	@echo "AVAILABLE TASKS"
	@echo ""
	@echo "  compile ................ Compiles the project."
	@echo "  clean .................. Removes build artifacts."
	@echo "  test ................... Runs the tests for the project."
	@echo "  lint ................... Lints all source files."
	@echo ""

lint:
	./node_modules/.bin/tslint -c "./tslint.json" $(SRC_DIRS)

test: compile
	./bin/test.sh
	rm -r -f packages/*/test

compile:
	./bin/compile.sh

clean:
	rm -r -f packages/*/lib
	rm -r -f packages/*/jsnext

bootstrap:
	npm install
	./node_modules/.bin/lerna bootstrap