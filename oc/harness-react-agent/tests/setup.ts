/**
 * 测试设置文件
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

// 全局测试设置
beforeAll(() => {
  // 设置测试环境变量
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error'; // 减少测试日志输出
});

afterAll(() => {
  // 清理
});

beforeEach(() => {
  // 每个测试前的设置
});

afterEach(() => {
  // 每个测试后的清理
});