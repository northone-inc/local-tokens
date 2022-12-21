# sourced pattern from: https://github.com/evanw/esbuild/issues/619
--external-imports := $(shell jq '.dependencies|keys[]' package.json)
--externals := $(--external-imports:%=--external:%)
.PHONY: install watch
install:
	brew bundle
	npm install
build:
	@rm -rf dist
	node_modules/.bin/esbuild src/index.ts --bundle --platform=node --outdir=dist $(--externals)
watch:
	node_modules/.bin/esbuild src/index.ts --bundle --platform=node --outdir=dist $(--externals) --watch & npm run typegen -- --watch