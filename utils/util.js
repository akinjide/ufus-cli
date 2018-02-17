var chalk = require('chalk')
var fs = require('fs')
var path = require('path')

exports.read = read
exports.log = log


function read() {
  return fs.readFileSync(path.resolve(__dirname, 'example.txt'))
}


function log(output, type) {
  switch (type) {
    case 'process':
      process.stdout.write(output + '\n')
      break
    case 'error':
      console.error(chalk.red(output))
      break
    case 'warn':
      console.warn(chalk.yellow(output))
      break
    case 'log':
      console.log(chalk.green(output))
      break
    default:
      console.log(output)
  }
}