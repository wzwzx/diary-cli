'use strict';

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer');
const { spawn } = require('child_process');

// 初始化函数
function run(folder, options = {}) {
  const diary = this.diary;
  const { console: con } = diary.extend;
  const target = path.resolve(diary.base_dir, folder);
  const scaffoldDir = path.join(diary.lib_dir, 'templates', 'scaffolds');

  return checkFolderStatus(target, options.force)
    .then(() => createScaffold(target))
    .then(() => installDependencies(target))
    .then(() => {
      con.success(`初始化成功！您的日记项目已经在 ${chalk.green(folder)} 中创建`);
      con.diary(`运行以下命令启动您的日记：
  
  ${chalk.blue('cd')} ${folder}
  ${chalk.blue('diary server')}
  
  访问 ${chalk.cyan('http://localhost:4000')} 查看您的日记应用
  `);
    })
    .catch(err => {
      con.error(err);
      process.exit(1);
    });

  // 检查目标文件夹状态
  function checkFolderStatus(folder, force) {
    return fs.pathExists(folder).then(exists => {
      if (!exists) return fs.ensureDir(folder);

      return fs.readdir(folder).then(files => {
        if (!files.length) return; // 目录为空，可以继续

        if (!force) {
          // 目录不为空，且未指定强制模式
          return inquirer.prompt([{
            type: 'confirm',
            name: 'overwrite',
            message: '目标文件夹不为空，是否继续？',
            default: false
          }]).then(answers => {
            if (!answers.overwrite) {
              throw new Error('用户取消初始化');
            }
          });
        }
      });
    });
  }

  // 创建项目结构
  function createScaffold(folder) {
    con.info('创建项目结构...');
    
    // 复制模板文件
    return fs.copy(scaffoldDir, folder)
      .then(() => {
        // 创建基本目录结构
        return Promise.all([
          fs.ensureDir(path.join(folder, 'source', '_posts')),
          fs.ensureDir(path.join(folder, 'source', 'images')),
          fs.ensureDir(path.join(folder, 'themes', 'default')),
          fs.ensureDir(path.join(folder, 'public'))
        ]);
      })
      .then(() => {
        // 创建配置文件
        const configPath = path.join(folder, '_config.yml');
        return fs.writeFile(configPath, `# Diary 配置文件
title: 我的日记
subtitle: 记录生活点滴
description: 一个简单的日记应用
author: Author
language: zh-CN
timezone: Asia/Shanghai

# URL
url: http://example.com
root: /
permalink: :year/:month/:day/:title/

# 目录
source_dir: source
public_dir: public
tag_dir: tags
archive_dir: archives
category_dir: categories
date_format: YYYY-MM-DD
time_format: HH:mm:ss

# 主题
theme: default
`);
      })
      .then(() => {
        // 创建示例文章
        const date = new Date();
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const postPath = path.join(folder, 'source', '_posts', 'hello-world.md');
        
        return fs.writeFile(postPath, `---
title: Hello World
date: ${dateStr} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}
tags:
- 教程
- 入门
---
## 欢迎使用日记应用

这是您的第一篇日记。您可以编辑或删除它，然后开始写作！

## 今天的心情

开始使用一个新的日记应用，感到兴奋和期待！

## 基本功能介绍

日记应用是记录生活、整理思绪的好帮手。以下是一些基本操作：

### 创建新的日记

\`\`\`bash
# 使用默认标题（基于当前时间）
$ diary new

# 使用自定义标题
$ diary new "我的日记标题"
\`\`\`

### 启动服务器

\`\`\`bash
$ diary server
\`\`\`

### 构建静态文件

\`\`\`bash
$ diary build
\`\`\`

## 明天的计划

- [ ] 写第一篇真正的日记
- [ ] 探索更多功能
- [ ] 定制个性化设置

## 随想

开始写日记是一个很好的习惯，它能帮助我们记录生活中的点滴，也是与未来的自己对话的方式。

<!-- more -->

---

*今日格言：千里之行，始于足下。*
`);
      })
      .then(() => {
        // 创建默认主题
        const themePath = path.join(folder, 'themes', 'default');
        
        // 创建主题配置
        return fs.writeFile(path.join(themePath, '_config.yml'), `# 主题配置
menu:
  首页: /
  档案: /archives
  关于: /about
`);
      })
      .then(() => {
        // 创建package.json
        const pkgPath = path.join(folder, 'package.json');
        return fs.writeJson(pkgPath, {
          name: path.basename(folder),
          version: '0.1.0',
          private: true,
          scripts: {
            server: 'diary server',
            build: 'diary build'
          },
          dependencies: {
            'diary-cli': '^0.1.0'
          }
        }, { spaces: 2 });
      });
  }

  // 安装依赖
  function installDependencies(folder) {
    con.info('安装依赖...');
    return new Promise((resolve, reject) => {
      // 这里实际上不需要安装任何依赖，因为diary-cli已经包含了所有需要的依赖
      // 但在实际项目中，可能需要安装一些特定的依赖
      resolve();
    });
  }
}

module.exports = {
  run
}; 