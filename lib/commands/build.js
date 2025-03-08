'use strict';

const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const ejs = require('ejs');
const { join } = require('path');
const { existsSync } = require('fs');
const marked = require('marked');
const highlight = require('highlight.js');
const moment = require('moment');
const yaml = require('js-yaml');

// 配置marked
marked.setOptions({
  highlight: function(code, lang) {
    const language = highlight.getLanguage(lang) ? lang : 'plaintext';
    return highlight.highlight(code, { language }).value;
  },
  langPrefix: 'hljs language-'
});

// 构建静态文件
function run(options = {}) {
  const diary = this.diary;
  const { console: con } = diary.extend;

  // 加载配置
  const { loadConfig } = require('../config-loader');
  const config = loadConfig(diary.base_dir, diary);

  // 设置路径
  const sourceDir = path.join(diary.base_dir, config.source_dir || 'source');
  const publicDir = path.join(diary.base_dir, config.public_dir || 'public');
  const themesDir = path.join(diary.base_dir, 'themes');
  const themeDir = path.join(themesDir, config.theme || 'default');
  
  // 清空public目录
  con.info('清理public目录...');
  fs.emptyDirSync(publicDir);
  
  // 复制资源文件
  con.info('复制资源文件...');
  
  // 复制主题资源
  const themeAssetsDir = path.join(themeDir, 'assets');
  if (existsSync(themeAssetsDir)) {
    fs.copySync(themeAssetsDir, path.join(publicDir, 'assets'));
  }
  
  // 复制图片
  const imagesDir = path.join(sourceDir, 'images');
  if (existsSync(imagesDir)) {
    fs.copySync(imagesDir, path.join(publicDir, 'images'));
  }
  
  // 获取所有文章
  con.info('处理文章...');
  const posts = getPosts(sourceDir);
  
  // 创建模板渲染函数
  const render = createRenderer(themeDir, {
    config,
    moment
  });
  
  // 生成首页
  con.info('生成首页...');
  const indexHtml = render('index', {
    posts,
    page: { title: config.title }
  });
  
  fs.outputFileSync(path.join(publicDir, 'index.html'), indexHtml);
  
  // 生成文章页
  con.info('生成文章页...');
  posts.forEach(post => {
    const postHtml = render('post', {
      post,
      page: { title: post.title }
    });
    
    fs.outputFileSync(path.join(publicDir, 'post', `${post.id}.html`), postHtml);
  });
  
  // 生成归档页
  con.info('生成归档页...');
  
  // 按年月分组
  const archives = {};
  posts.forEach(post => {
    const date = moment(post.date);
    const year = date.year();
    const month = date.month() + 1;
    
    if (!archives[year]) {
      archives[year] = {};
    }
    
    if (!archives[year][month]) {
      archives[year][month] = [];
    }
    
    archives[year][month].push(post);
  });
  
  const archivesHtml = render('archives', {
    archives,
    page: { title: '归档' }
  });
  
  fs.outputFileSync(path.join(publicDir, 'archives', 'index.html'), archivesHtml);
  
  // 生成关于页
  con.info('生成关于页...');
  const aboutHtml = render('about', {
    page: { title: '关于' }
  });
  
  fs.outputFileSync(path.join(publicDir, 'about', 'index.html'), aboutHtml);
  
  con.success(`站点已生成在 ${chalk.green(publicDir)} 目录`);
  
  // 如果指定了部署选项
  if (options.deploy) {
    con.info('部署站点...');
    // 这里可以添加部署逻辑，例如上传到Github Pages等
    con.warn('部署功能尚未实现');
  }
  
  // 获取所有文章
  function getPosts(dir) {
    const postsDir = path.join(dir, '_posts');
    
    if (!existsSync(postsDir)) {
      return [];
    }
    
    const files = fs.readdirSync(postsDir)
      .filter(file => file.endsWith('.md'));
    
    return files
      .map(file => {
        const filePath = path.join(postsDir, file);
        return parsePost(filePath);
      })
      .filter(Boolean)
      .sort((a, b) => {
        return moment(b.date).valueOf() - moment(a.date).valueOf();
      });
  }
  
  // 解析文章内容
  function parsePost(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const filename = path.basename(filePath, '.md');
      
      // 解析 Front Matter
      const pattern = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
      const match = content.match(pattern);
      
      if (!match) {
        return {
          id: filename,
          title: filename,
          date: new Date(),
          content: marked.parse(content),
          excerpt: ''
        };
      }
      
      const frontMatter = yaml.load(match[1]);
      const markdown = match[2];
      const excerpt = markdown.split('<!-- more -->')[0];
      
      return {
        id: filename,
        title: frontMatter.title || filename,
        date: moment(frontMatter.date).toDate(),
        tags: frontMatter.tags || [],
        categories: frontMatter.categories || [],
        content: marked.parse(markdown),
        excerpt: marked.parse(excerpt)
      };
    } catch (err) {
      con.error(`无法解析文件 ${filePath}: ${err.message}`);
      return null;
    }
  }
  
  // 创建渲染函数
  function createRenderer(themeDir, locals) {
    return function(template, data) {
      // 默认模板不存在时，尝试使用其他模板
      const templates = [template, 'page', 'index'];
      
      for (const tpl of templates) {
        const templatePath = path.join(themeDir, 'layout', `${tpl}.ejs`);
        
        if (existsSync(templatePath)) {
          const templateContent = fs.readFileSync(templatePath, 'utf8');
          return ejs.render(templateContent, {...locals, ...data}, {
            filename: templatePath
          });
        }
      }
      
      throw new Error(`模板文件 ${template} 不存在`);
    };
  }
}

module.exports = {
  run
};