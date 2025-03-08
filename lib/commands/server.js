'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const { join } = require('path');
const { existsSync } = require('fs');
const ejs = require('ejs');
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

// 启动服务器
function run(options = {}) {
  const diary = this.diary;
  const { console: con } = diary.extend;
  const port = options.port || 4000;
  const host = options.ip || 'localhost';

  // 加载配置
  const { loadConfig } = require('../config-loader');
  const config = loadConfig(diary.base_dir, diary);

  // 设置路径
  const sourceDir = path.join(diary.base_dir, config.source_dir || 'source');
  const themesDir = path.join(diary.base_dir, 'themes');
  const themeDir = path.join(themesDir, config.theme || 'default');
  
  // 创建app
  const app = express();

  // 静态文件服务
  app.use('/assets', express.static(path.join(themeDir, 'assets')));
  app.use('/images', express.static(path.join(sourceDir, 'images')));

  // 设置模板引擎
  app.set('view engine', 'ejs');
  app.set('views', path.join(themeDir, 'layout'));

  // 设置本地变量
  app.locals.config = config;
  app.locals.moment = moment;
  app.locals.isServer = true;  // 添加服务器模式标识

  // 首页
  app.get('/', (req, res) => {
    // 获取所有文章
    const posts = getPosts(sourceDir);
    
    // 尝试直接生成HTML响应
    if (req.query.debug === 'true') {
      let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>调试页面 - 日记列表</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          .post { border: 1px solid #ccc; margin: 20px 0; padding: 15px; }
          .title { font-size: 20px; font-weight: bold; }
          .date { color: #666; }
          .excerpt { margin: 10px 0; }
        </style>
      </head>
      <body>
        <h1>日记列表 (调试模式)</h1>
        <p>找到 ${posts.length} 篇日记</p>
        
        <div class="posts">
      `;
      
      if (posts.length === 0) {
        html += '<p>没有找到任何日记</p>';
      } else {
        posts.forEach((post, index) => {
          // 生成摘要
          const shortenedExcerpt = post.plainExcerpt && post.plainExcerpt.length > 50 ? 
                                 post.plainExcerpt.substring(0, 50) + '...' : 
                                 post.plainExcerpt || '';
          
          html += `
          <div class="post">
            <div class="post-number">[${index + 1}]</div>
            <div class="title">${post.title}</div>
            <div class="date">${moment(post.date).format('YYYY-MM-DD HH:mm:ss')}</div>
            <div class="excerpt">${shortenedExcerpt}</div>
            <div class="tags">
              ${post.tags.map(tag => `<span class="tag">#${tag}</span>`).join(' ')}
            </div>
            <a href="/post/${post.id}">阅读全文</a>
          </div>
          `;
        });
      }
      
      html += `
        </div>
        <p><a href="/">返回标准视图</a></p>
      </body>
      </html>
      `;
      
      return res.send(html);
    }
    
    // 正常渲染
    renderPage(res, 'index', {
      posts,
      page: { title: config.title }
    });
  });

  // 文章页
  app.get('/post/:id', (req, res) => {
    const id = req.params.id;
    const postPath = path.join(sourceDir, '_posts', `${id}.md`);
    
    if (!existsSync(postPath)) {
      return res.status(404).send('文章不存在');
    }
    
    const post = parsePost(postPath);
    
    renderPage(res, 'post', {
      post,
      page: { title: post.title }
    });
  });

  // 归档页
  app.get('/archives', (req, res) => {
    const posts = getPosts(sourceDir);
    
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
    
    renderPage(res, 'archives', {
      archives,
      page: { title: '归档' }
    });
  });

  // 关于页
  app.get('/about', (req, res) => {
    renderPage(res, 'about', {
      page: { title: '关于' }
    });
  });

  // 处理404
  app.use((req, res) => {
    res.status(404).send('页面未找到');
  });

  // 启动服务器
  app.listen(port, host, () => {
    con.info('Diary 服务器启动成功:');
    con.info('------------------------------------');
    con.info(`- 站点: http://${host}:${port}`);
    con.info('------------------------------------');
  });

  // 渲染页面
  function renderPage(res, template, data) {
    const { console: con } = diary.extend;
    
    // 如果是首页且开启了调试模式，添加调试信息
    if (template === 'index' && data.posts) {
      // 检查是否开启了调试模式
      const isDebugMode = config.debug === true;
      
      // Debug开启时在控制台记录基本信息
      if(config.debug === true) con.info(`准备渲染首页，文章数量: ${data.posts.length}`);
      
      // 确保 posts 是数组
      if (!Array.isArray(data.posts)) {
        con.error('posts 不是数组!');
        data.posts = [];
      }
      
      // 只在调试模式下添加页面调试信息
      if (isDebugMode) {
        data._testPostsHtml = 
          '<div style="background: #f8f8f8; padding: 15px; margin: 10px 0; border-left: 4px solid #007acc;">' + 
            '<h3 style="margin-top:0;">调试信息 (debug模式已开启)</h3>' +
            '<p>已找到 <strong>' + data.posts.length + '</strong> 篇文章</p>' +
            (data.posts.length > 0 ? 
              '<p>第一篇文章: <strong>' + data.posts[0].title + '</strong> (' + moment(data.posts[0].date).format('YYYY-MM-DD') + ')</p>' +
              '<p>最后一篇文章: <strong>' + data.posts[data.posts.length-1].title + '</strong> (' + moment(data.posts[data.posts.length-1].date).format('YYYY-MM-DD') + ')</p>'
              : '') +
          '</div>';
        
        // 在调试模式下，控制台输出更详细的信息
        data.posts.forEach((post, index) => {
          con.info(`[${index + 1}] 文章信息:`);
          con.info(`  - 标题: ${post.title}`);
          con.info(`  - ID: ${post.id}`);
          con.info(`  - 日期: ${moment(post.date).format('YYYY-MM-DD')}`);
        });
      } else {
        // 非调试模式下不显示调试区域
        data._testPostsHtml = '';
      }
    }

    // 默认模板不存在时，尝试使用其他模板
    const templates = [template, 'page', 'index'];
    
    for (const tpl of templates) {
      const templatePath = path.join(themeDir, 'layout', `${tpl}.ejs`);
      
      if (existsSync(templatePath)) {
        try {
          // 尝试渲染模板
          return res.render(tpl, data);
        } catch (err) {
          con.error(`渲染模板 ${tpl} 时出错: ${err.message}`);
          con.error(err.stack);
        }
      }
    }
    
    // 没有找到任何模板或渲染失败
    res.status(500).send('模板渲染失败');
  }

  // 获取所有文章
  function getPosts(dir) {
    const postsDir = path.join(dir, '_posts');
    const { console: con } = diary.extend;
    const isDebugMode = config.debug === true;
    
    if (!existsSync(postsDir)) {
      con.warn('文章目录不存在: ' + postsDir);
      return [];
    }
    
    const files = fs.readdirSync(postsDir)
      .filter(file => file.endsWith('.md'));
    
    // 只在调试模式下输出详细的文件扫描信息
    if (isDebugMode) {
      con.info(`找到 ${files.length} 个Markdown文件`);
    }
    
    const result = files
      .map(file => {
        const filePath = path.join(postsDir, file);
        return parsePost(filePath);
      })
      .filter(Boolean)
      .sort((a, b) => {
        return moment(b.date).valueOf() - moment(a.date).valueOf();
      });
    
    // 根据调试模式决定输出的详细程度
    if (isDebugMode) {
      con.info(`处理后有 ${result.length} 篇文章`);
      
      // 详细输出每篇文章信息
      result.forEach((post, index) => {
        con.info(`[${index+1}] ${post.title} (${moment(post.date).format('YYYY-MM-DD')})`);
      });
    } else {
      // 非调试模式下只输出基本信息
      con.info(`已加载 ${result.length} 篇文章`);
    }
    
    return result;
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
          excerpt: '',
          plainExcerpt: ''
        };
      }
      
      const frontMatter = yaml.load(match[1]);
      const markdown = match[2];
      const excerpt = markdown.split('<!-- more -->')[0];
      
      // 创建纯文本摘要（简单移除Markdown标记）
      const plainExcerpt = excerpt
        .replace(/#+\s+/g, '') // 移除标题
        .replace(/\*\*|\*|~~|_/g, '') // 移除粗体、斜体、删除线
        .replace(/\[(.*?)\]\(.*?\)/g, '$1') // 简化链接为纯文本
        .replace(/`{1,3}(.*?)`{1,3}/g, '$1') // 移除代码块标记
        .replace(/\s+/g, ' ') // 合并多个空格
        .trim();
      
      return {
        id: filename,
        title: frontMatter.title || filename,
        date: moment(frontMatter.date).toDate(),
        tags: frontMatter.tags || [],
        categories: frontMatter.categories || [],
        content: marked.parse(markdown),
        excerpt: marked.parse(excerpt),
        plainExcerpt: plainExcerpt
      };
    } catch (err) {
      con.error(`无法解析文件 ${filePath}: ${err.message}`);
      return null;
    }
  }
}

module.exports = {
  run
};