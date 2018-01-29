const ts = require('typescript');
const { readdirSync } = require('fs');
const { join, sep } = require('path');
const expand = require('glob-expand');

const PATTERNS = [
  'src/*/*.ts',
  'src/**/*.ts',
];

function buildPackage(package) {
  console.log(`Compiling ${packageName(package)} with TSC...`);
  const files = expand({
      cwd: package,
      filter: 'isFile' }, PATTERNS
    ).map((file) => join(package, file));

  const COMMONJS_COMPILER_OPTIONS = {
    lib: [
      "dom",
      "es5",
      "es2015.core",
      "es2015.promise",
      "es2015.iterable",
      "es2015.generator"
    ],
    declaration: true,
    moduleResolution: 'node',
    noImplicitAny: true,
    noUnusedLocals: true,
    sourceMap: true,
    strictNullChecks: true,
    target: 'es5',
    module: 'commonjs',
    outDir: join(package, 'lib'),
  };

  const ES6_COMPILER_OPTIONS = Object.assign({}, COMMONJS_COMPILER_OPTIONS, {
    module: 'es6',
    outDir: join(package, 'es6'),
  });

  compile(files, package, COMMONJS_COMPILER_OPTIONS);
  compile(files, package, ES6_COMPILER_OPTIONS);
}

function packageName(package) {
  const [, name] = package.split('packages' + sep);

  return `@jonggrang/${name}`;
}

function compile(files, directory, compilerOptions) {
  const program = ts.createProgram(files, ts.convertCompilerOptionsFromJson(compilerOptions, directory).options)

  const result = program.emit()

  const diagnostics = ts.getPreEmitDiagnostics(program).concat(result.diagnostics)

  if (diagnostics.length > 0) {
    reportDiagnostics(diagnostics)

    process.exit(1)
  }
}

function reportDiagnostics(diagnostics) {
  diagnostics.forEach(diagnostic => {
    const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start)

    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')

    console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`)
  })
}

const ROOT_DIRECTORY = join(__dirname, '..')
const PACKAGES_DIRECTORY = join(ROOT_DIRECTORY, 'packages')

let allPackages = [
  'prelude',
  'vnode',
  'task',
  'http-types',
  'wai'
]

if (readdirSync(PACKAGES_DIRECTORY).length > allPackages.length) {
  throw new Error('Please update list of packages in build script')
}

console.log() // used to add separation between commands

const args = process.argv.slice(2)

const onlyIndex =
  args.indexOf('--only') > -1
    ? args.indexOf('--only') + 1
    : args.indexOf('-o') > -1 ? args.indexOf('-o') + 1 : -1

if (onlyIndex > -1) {
  const only = args[onlyIndex]

  allPackages = allPackages.filter(name => name === only)
}

let promise = Promise.resolve()
for (const pkg of allPackages) {
  const packageDirectory = join(PACKAGES_DIRECTORY, pkg)
  promise = promise.then(() => buildPackage(packageDirectory))
}

promise
  .then(() => {
    console.log(`\nDONE!`)
  })
  .catch(err => {
    console.error(err)

    process.exit(1)
  })
