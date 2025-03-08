'use strict';

const chalk = require('chalk');

module.exports = function(diary) {
  const { console: con } = diary.extend;

  // 普通信息
  con.info = function(message) {
    console.log(chalk.cyan('INFO ') + message);
  };

  // 成功信息
  con.success = function(message) {
    console.log(chalk.green('SUCCESS ') + message);
  };

  // 警告信息
  con.warn = function(message) {
    console.log(chalk.yellow('WARN ') + message);
  };

  // 错误信息
  con.error = function(message) {
    if (message instanceof Error) {
      message = message.message;
    }
    console.error(chalk.red('ERROR ') + message);
  };

  // 调试信息
  con.debug = function(message) {
    if (process.env.DEBUG) {
      console.log(chalk.magenta('DEBUG ') + message);
    }
  };

  // 日记信息
  con.diary = function(message) {
    console.log(chalk.bold.blue('DIARY ') + message);
  };
  
  return con;
}; 