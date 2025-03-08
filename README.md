# Diary CLI

一个简单的日记应用命令行工具，参考hexo-cli设计。
> 请clone本仓库后执行npm link使用

## 特点

- 简洁美观的界面，参考memos设计
- 支持Markdown语法
- 本地预览和静态文件生成
- 自定义主题

~~安装~~

~~```bash~~
~~npm install -g diary-cli~~
~~```~~

## 快速开始

### 创建新项目

```bash
diary init my-diary
cd my-diary
```

### 启动本地服务器

```bash
diary server
```

然后在浏览器中访问 `http://localhost:4000` 查看您的日记应用。

### 创建新日记

使用命令行快速创建新日记：

```bash
# 使用默认标题（基于当前时间）
diary new

# 使用自定义标题
diary new "我的第一篇日记"
```

或者手动在 `source/_posts` 目录下创建Markdown文件，例如 `my-first-diary.md`：

```markdown
---
title: 我的第一篇日记
date: 2025-03-01 12:00:00
tags:
- 随笔
---
## 今天的心情

今天天气真好！

<!-- more -->

详细内容...
```

### 构建静态文件

```bash
diary build
```

静态文件将会生成在 `public` 目录下。

## 配置

配置文件位于 `_config.yml`，您可以修改以下配置：

```yaml
# 基本信息
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
```

## Debug模式
如果发生了令人费解的事情，你可以在_config.yml内添加```debug: true```来开启调试模式

## 命令

- `diary init [folder]` - 初始化新项目
- `diary server` - 启动本地服务器
- `diary build` - 生成静态文件
- `diary new [title]` - 创建新日记

## 主题

日记应用使用EJS模板引擎和主题系统。默认主题位于 `themes/default` 目录下。

您可以通过修改或创建新主题来自定义您的日记应用外观。

## 许可证

MIT 