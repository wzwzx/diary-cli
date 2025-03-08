'use strict';

const { join } = require('path');
const fs = require('fs');
const chalk = require('chalk');
const moment = require('moment');

// 获取当前时间，格式化为文件名和标题
function getTimeInfo() {
  const now = new Date();
  return {
    date: moment(now).format('YYYY-MM-DD HH:mm:ss'),
    fileName: moment(now).format('YYYY-MM-DD-HH-mm-ss'),
    title: moment(now).format('YYYY年MM月DD日 HH:mm')
  };
}

// 创建新的markdown文档模板
function createPostTemplate(title, date) {
  return `---
title: ${title}
date: ${date}
tags:
- 日常
- 随笔
---

成功创建日记啦！你可以在此修改内容。

> 使用Diary
`;
}

// 递归创建目录函数
function mkdirp(dirPath) {
  return new Promise((resolve, reject) => {
    fs.mkdir(dirPath, { recursive: true }, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

// 运行new命令的主函数
function run(title) {
  const diary = this.diary;
  
  // 检查source/_posts目录是否存在，不存在则创建
  const postsDir = join(diary.base_dir, 'source', '_posts');
  
  // 使用Promise链来处理异步操作
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(postsDir)) {
      mkdirp(postsDir)
        .then(() => {
          diary.extend.console.info('创建目录: ' + chalk.magenta(postsDir));
          createPost();
        })
        .catch(err => {
          reject(err);
        });
    } else {
      createPost();
    }
    
    function createPost() {
      try {
        // 获取时间信息
        const timeInfo = getTimeInfo();
        
        // 使用传入的标题或默认时间标题
        const postTitle = title || timeInfo.title;
        
        // 创建文件名（使用时间戳或处理后的标题）
        const fileName = `${timeInfo.fileName}.md`;
        const filePath = join(postsDir, fileName);
        
        // 生成文档内容
        const content = createPostTemplate(postTitle, timeInfo.date);
        
        // 写入文件
        fs.writeFileSync(filePath, content);
        
        diary.extend.console.info('创建新日记: ' + chalk.magenta(filePath));
        diary.extend.console.info('日记标题: ' + chalk.cyan(postTitle));
        diary.extend.console.info('创建时间: ' + chalk.yellow(timeInfo.date));
        diary.extend.console.success('日记创建成功！');
        
        resolve();
      } catch (err) {
        reject(err);
      }
    }
  });
}

module.exports = { run }; 