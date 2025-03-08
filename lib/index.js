'use strict';

const abbrev = require('abbrev');
const chalk = require('chalk');
const { existsSync } = require('fs');
const { join } = require('path');
const pkg = require('../package.json');
const commander = require('commander');

// 全局变量
const diary = {
  version: pkg.version
};

// 文件路径相关
diary.base_dir = process.cwd();
diary.lib_dir = __dirname;
diary.cmd_dir = join(__dirname, 'commands');

// 注册命令方法
diary.extend = {
  console: {},
  init: {},
  server: {},
  build: {},
  new: {}
};

// 加载命令
loadCommands('init');
loadCommands('server');
loadCommands('build');
loadCommands('new');

// 控制台输出方法
require('./console')(diary);

function loadCommands(name) {
  const cmd = require(`./commands/${name}`);
  for (const [key, value] of Object.entries(cmd)) {
    if (typeof value === 'function') {
      diary.extend[name][key] = value;
    }
  }
}

// 检查是否在日记项目目录中
function checkDiaryRoot(path) {
  return existsSync(join(path, '_config.yml'));
}

// 注册命令
const program = new commander.Command();

program
  .version(diary.version)
  .usage('<command> [options]');

program
  .command('init [folder]')
  .description('创建一个新的日记项目')
  .option('-f, --force', '强制创建，即使目标文件夹不为空')
  .action((folder = '.', options) => {
    diary.extend.init.run.call({ diary }, folder, options);
  });

program
  .command('server')
  .description('启动本地服务器')
  .option('-p, --port <port>', '端口号', '4000')
  .option('-i, --ip <ip>', 'IP地址', 'localhost')
  .action((options) => {
    if (!checkDiaryRoot(diary.base_dir)) {
      return diary.extend.console.error('当前目录不是一个有效的日记项目，请先使用 `diary init` 创建一个项目。');
    }
    diary.extend.server.run.call({ diary }, options);
  });

program
  .command('build')
  .description('生成静态文件')
  .option('-d, --deploy', '构建后部署')
  .action((options) => {
    if (!checkDiaryRoot(diary.base_dir)) {
      return diary.extend.console.error('当前目录不是一个有效的日记项目，请先使用 `diary init` 创建一个项目。');
    }
    diary.extend.build.run.call({ diary }, options);
  });

program
  .command('new [title]')
  .description('创建一个新的日记')
  .action((title) => {
    if (!checkDiaryRoot(diary.base_dir)) {
      return diary.extend.console.error('当前目录不是一个有效的日记项目，请先使用 `diary init` 创建一个项目。');
    }
    diary.extend.new.run.call({ diary }, title);
  });

// 处理无效命令
program.arguments('<command>').action((cmd) => {
  program.outputHelp();
  diary.extend.console.error(`未知命令: ${chalk.yellow(cmd)}`);
});

// 如果没有提供参数，显示帮助信息
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

module.exports = diary;
program.parse(process.argv); 