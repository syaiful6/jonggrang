.DEFAULT_GOAL = help
.PHONY: help compile clean test lint

parentbin		:= ../../node_modules/.bin/
rollup	:= ../../node_modules/.bin/rollup
tsc		:= ../../node_modules/.bin/tsc
tslint	:= ../../node_modules/.bin/tslint
typings := ../../node_modules/.bin/typings
mocha := ../../node_modules/.bin/mocha

# - Command
help:
	@echo ""
	@echo "AVAILABLE TASKS"
	@echo ""
	@echo "  compile ................ Compiles the project."
	@echo "  clean .................. Removes build artifacts."
	@echo "  test ................... Runs the tests for the project."
	@echo "  lint ................... Lints all source files."
	@echo ""

init:
	npm install
	sh $(typings) install

lint:
	sh $(tslint) -c "../../tslint.json" -e "node_modules/**/*" -e "typings/**/*" "src/**/*.ts*"

compile-cjs:
	sh $(tsc)

compile-jsnext:
	sh $(tsc) -p scripts

compile: compile-cjs compile-jsnext

clean:
	rm -f -r jsnext
	rm -f -r lib

test: compile-cjs
	sh $(tsc) -p spec
	sh $(mocha) --reporter spec --ui bdd
	rm -r -f test

test-opt:
	node --allow-natives-syntax --trace-opt --trace-deopt --trace-inlining scripts/opt.js
