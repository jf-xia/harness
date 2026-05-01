import fs from 'node:fs';
import path from 'node:path';
import type { PermissionScope } from '../types.js';

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
    try {
      const data: StoredSettings = JSON.parse(fs.readFileSync(this.settingsPath, 'utf-8'));
      this.rules = data.permissions || [];
    } catch {
      this.rules = [];
    }
  }

  private saveRules() {
    const dir = path.dirname(this.settingsPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const data: StoredSettings = { permissions: this.rules };
    fs.writeFileSync(this.settingsPath, JSON.stringify(data, null, 2));
  }

  check(scope: PermissionScope, resource: string): PermissionAction | null {
    for (const rule of this.rules) {
      if (rule.scope === scope) {
        if (this.matchPattern(rule.pattern, resource)) {
          return rule.action;
        }
      }
    }
    return null;
  }

  addRule(rule: PermissionRule) {
    // 去重
    this.rules = this.rules.filter(
      r => !(r.scope === rule.scope && r.pattern === rule.pattern),
    );
    this.rules.push(rule);
    this.saveRules();
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
