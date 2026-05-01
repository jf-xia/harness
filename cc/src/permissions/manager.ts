import fs from 'node:fs';
import path from 'node:path';
import type { PermissionScope } from '../types.js';
import { log } from '../logger.js';

type PermissionAction = 'allow' | 'deny' | 'ask';

interface PermissionRule {
  scope: PermissionScope;
  pattern: string;
  action: PermissionAction;
}

interface StoredSettings {
  permissions: PermissionRule[];
}

export class PermissionManager {
  private rules: PermissionRule[] = [];
  private settingsPath: string;

  constructor(settingsPath: string) {
    this.settingsPath = settingsPath;
    this.loadRules();
  }

  private loadRules() {
    log.step('PERM', `Loading rules from ${this.settingsPath}`);
    try {
      const data: StoredSettings = JSON.parse(fs.readFileSync(this.settingsPath, 'utf-8'));
      this.rules = data.permissions || [];
      log.success('PERM', `Loaded ${this.rules.length} permission rules`);
    } catch {
      this.rules = [];
      log.info('PERM', 'No settings file found, starting with empty rules');
    }
  }

  private saveRules() {
    const dir = path.dirname(this.settingsPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const data: StoredSettings = { permissions: this.rules };
    fs.writeFileSync(this.settingsPath, JSON.stringify(data, null, 2));
  }

  check(scope: PermissionScope, resource: string): PermissionAction | null {
    log.info('PERM', `Checking: scope=${scope}, resource="${resource}"`);
    for (const rule of this.rules) {
      if (rule.scope === scope) {
        if (this.matchPattern(rule.pattern, resource)) {
          log.data('PERM', 'matched rule', `${rule.scope}:${rule.pattern} → ${rule.action}`);
          return rule.action;
        }
      }
    }
    log.info('PERM', 'No matching rule found → will ask user');
    return null;
  }

  addRule(rule: PermissionRule) {
    log.step('PERM', `Adding rule: ${rule.scope}:${rule.pattern} → ${rule.action}`);
    // 去重
    this.rules = this.rules.filter(
      r => !(r.scope === rule.scope && r.pattern === rule.pattern),
    );
    this.rules.push(rule);
    this.saveRules();
    log.success('PERM', `Rule saved, total rules: ${this.rules.length}`);
  }

  private matchPattern(pattern: string, value: string): boolean {
    // 简单的 glob 匹配
    const regex = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    return new RegExp(`^${regex}$`).test(value);
  }

  getRules(): PermissionRule[] {
    return [...this.rules];
  }
}
