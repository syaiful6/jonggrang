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

test-browser:
	$(bin)/karma start

compile: clean
	node bin/build.js

clean:
	rm -rf packages/*/lib
	rm -rf packages/*/es6

publish: clean compile
	./node_modules/.bin/lerna publish --silent

bootstrap:
	./node_modules/.bin/lerna bootstrap
