'use strict';

const path = require('path');
const fs = require('fs-extra');
const yaml = require('js-yaml');

// 加载并合并配置文件
function loadConfig(baseDir, diary) {
  // 确保diary参数存在，否则使用默认的console
  const con = diary && diary.extend ? diary.extend.console : console;
  let config = {};

  try {
    // 加载主配置文件
    const mainConfigPath = path.join(baseDir, '_config.yml');
    if (fs.existsSync(mainConfigPath)) {
      config = yaml.load(fs.readFileSync(mainConfigPath, 'utf8'));
    }

    // 加载主题配置文件
    if (config.theme) {
      // 首先尝试加载根目录下的主题配置文件
      const rootThemeConfigPath = path.join(baseDir, `_config.${config.theme}.yml`);
      let themeConfig = {};
      
      if (fs.existsSync(rootThemeConfigPath)) {
        themeConfig = yaml.load(fs.readFileSync(rootThemeConfigPath, 'utf8'));
      }
      
      // 然后尝试加载主题目录下的配置文件
      const themeDir = path.join(baseDir, 'themes', config.theme);
      const themeConfigPath = path.join(themeDir, '_config.yml');
      
      if (fs.existsSync(themeConfigPath)) {
        const themeDefaultConfig = yaml.load(fs.readFileSync(themeConfigPath, 'utf8'));
        // 合并主题默认配置和根目录下的主题配置
        themeConfig = deepMerge(themeDefaultConfig, themeConfig);
      }
      
      // 将主题配置单独保存到theme_config中
      config.theme_config = themeConfig;
      // 同时保持原有的合并行为
      config = deepMerge(config, themeConfig);
    }

    return config;
  } catch (err) {
    if (con.error) {
      con.error('加载配置文件时出错: ' + err.message);
    } else {
      console.error('加载配置文件时出错: ' + err.message);
    }
    process.exit(1);
  }
}

// 深度合并对象
function deepMerge(target, source) {
  if (typeof source !== 'object' || source === null) {
    return source;
  }

  if (Array.isArray(source)) {
    return source.slice();
  }

  const merged = { ...target };

  for (const key in source) {
    if (source[key] instanceof Object && key in target) {
      merged[key] = deepMerge(target[key], source[key]);
    } else {
      merged[key] = source[key];
    }
  }

  return merged;
}

module.exports = { loadConfig };