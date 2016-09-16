.DEFAULT_GOAL = help
.PHONY: help compile clean test

bin		:= $(shell npm bin)
rollup	:= $(bin)/rollup
tsc		:= $(bin)/tsc
tslint	:= $(bin)/tslint

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

lint:
	$(tslint) src

compile:
	$(tsc)
	$(rollup) -c
