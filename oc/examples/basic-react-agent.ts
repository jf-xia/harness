/**
 * 基础ReAct Agent示例
 * 
 * 这个示例展示了如何实现一个简单的ReAct代理，结合推理和行动来解决问题。
 * 
 * ReAct循环：
 * 1. 思考（Thought）：分析当前状态，规划下一步行动
 * 2. 行动（Action）：执行具体操作
 * 3. 观察（Observation）：获取行动结果
 * 4. 重复直到完成
 */

// 类型定义
interface Thought {
  content: string;
  reasoning: string;
  nextAction: string;
}

interface Action {
  type: string;
  parameters: Record<string, any>;
}

interface Observation {
  success: boolean;
  data: any;
  timestamp: Date;
}

interface ReactStep {
  thought: Thought;
  action: Action;
  observation: Observation;
  stepNumber: number;
}

interface ReactResult {
  steps: ReactStep[];
  answer: string;
  totalSteps: number;
}

// 基础代理类
abstract class BaseAgent {
  protected name: string;
  protected state: Map<string, any> = new Map();

  constructor(name: string) {
    this.name = name;
  }

  abstract think(observation: Observation | null): Thought;
  abstract act(thought: Thought): Action;
  abstract observe(action: Action): Promise<Observation>;

  getName(): string {
    return this.name;
  }

  getState(key: string): any {
    return this.state.get(key);
  }

  setState(key: string, value: any): void {
    this.state.set(key, value);
  }
}

// 问答代理实现
class QAAgent extends BaseAgent {
  private knowledgeBase: Map<string, string> = new Map();
  private question: string;

  constructor(question: string) {
    super('QAAgent');
    this.question = question;
    this.initializeKnowledgeBase();
  }

  private initializeKnowledgeBase(): void {
    // 模拟知识库
    this.knowledgeBase.set('harness', 'Harness是一个AI驱动的软件交付平台');
    this.knowledgeBase.set('react', 'ReAct是一种结合推理和行动的AI代理架构');
    this.knowledgeBase.set('ai_sre', 'AI SRE使用AI代理来自动化SRE任务');
    this.knowledgeBase.set('typescript', 'TypeScript是JavaScript的超集，添加了类型系统');
    this.knowledgeBase.set('cli', 'CLI是命令行界面，用于与程序交互');
  }

  think(observation: Observation | null): Thought {
    if (!observation) {
      // 初始思考
      return {
        content: `我需要回答问题: "${this.question}"`,
        reasoning: '首先，我需要分析问题，确定需要查询的信息',
        nextAction: 'search_knowledge',
      };
    }

    // 基于观察结果思考
    if (observation.success) {
      const data = observation.data;
      if (data.found) {
        return {
          content: `找到了相关信息: ${data.information}`,
          reasoning: '现在我可以基于找到的信息生成答案',
          nextAction: 'generate_answer',
        };
      } else {
        return {
          content: '没有找到直接相关的信息',
          reasoning: '我需要尝试其他搜索策略',
          nextAction: 'search_alternative',
        };
      }
    }

    return {
      content: '遇到了问题',
      reasoning: '需要处理错误情况',
      nextAction: 'handle_error',
    };
  }

  act(thought: Thought): Action {
    switch (thought.nextAction) {
      case 'search_knowledge':
        return {
          type: 'SEARCH_KNOWLEDGE',
          parameters: { query: this.question },
        };
      case 'search_alternative':
        return {
          type: 'SEARCH_ALTERNATIVE',
          parameters: { query: this.question },
        };
      case 'generate_answer':
        return {
          type: 'GENERATE_ANSWER',
          parameters: { question: this.question },
        };
      default:
        return {
          type: 'NO_ACTION',
          parameters: {},
        };
    }
  }

  async observe(action: Action): Promise<Observation> {
    // 模拟行动执行
    await this.delay(100);

    switch (action.type) {
      case 'SEARCH_KNOWLEDGE':
        return this.searchKnowledge(action.parameters.query);
      case 'SEARCH_ALTERNATIVE':
        return this.searchAlternative(action.parameters.query);
      case 'GENERATE_ANSWER':
        return this.generateAnswer();
      default:
        return {
          success: false,
          data: { error: 'Unknown action' },
          timestamp: new Date(),
        };
    }
  }

  private searchKnowledge(query: string): Observation {
    const queryLower = query.toLowerCase();
    
    // 简单的关键词匹配
    for (const [key, value] of this.knowledgeBase) {
      if (queryLower.includes(key) || key.includes(queryLower)) {
        return {
          success: true,
          data: { found: true, information: value, source: key },
          timestamp: new Date(),
        };
      }
    }

    return {
      success: true,
      data: { found: false, information: null },
      timestamp: new Date(),
    };
  }

  private searchAlternative(query: string): Observation {
    // 模拟替代搜索策略
    const words = query.toLowerCase().split(' ');
    
    for (const word of words) {
      for (const [key, value] of this.knowledgeBase) {
        if (key.includes(word) || word.includes(key)) {
          return {
            success: true,
            data: { found: true, information: value, source: key },
            timestamp: new Date(),
          };
        }
      }
    }

    return {
      success: true,
      data: { found: false, information: '没有找到相关信息' },
      timestamp: new Date(),
    };
  }

  private generateAnswer(): Observation {
    const knowledge = this.getState('knowledge');
    
    if (knowledge) {
      return {
        success: true,
        data: {
          answer: `根据知识库信息: ${knowledge}`,
          confidence: 0.8,
        },
        timestamp: new Date(),
      };
    }

    return {
      success: true,
      data: {
        answer: '抱歉，我无法回答这个问题',
        confidence: 0.1,
      },
      timestamp: new Date(),
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ReAct引擎
class ReactEngine {
  private maxSteps: number;

  constructor(maxSteps: number = 10) {
    this.maxSteps = maxSteps;
  }

  async run(agent: BaseAgent): Promise<ReactResult> {
    const steps: ReactStep[] = [];
    let currentObservation: Observation | null = null;
    let stepNumber = 0;

    console.log(`\n🚀 开始ReAct循环: ${agent.getName()}`);
    console.log('=' .repeat(50));

    while (stepNumber < this.maxSteps) {
      stepNumber++;
      console.log(`\n📍 步骤 ${stepNumber}:`);

      // 1. 思考
      const thought = agent.think(currentObservation);
      console.log(`💭 思考: ${thought.content}`);
      console.log(`   推理: ${thought.reasoning}`);
      console.log(`   下一步: ${thought.nextAction}`);

      // 2. 行动
      const action = agent.act(thought);
      console.log(`🎯 行动: ${action.type}`);

      // 3. 观察
      const observation = await agent.observe(action);
      console.log(`👀 观察: ${observation.success ? '成功' : '失败'}`);
      
      if (observation.data) {
        console.log(`   数据: ${JSON.stringify(observation.data)}`);
      }

      // 记录步骤
      steps.push({
        thought,
        action,
        observation,
        stepNumber,
      });

      // 更新状态
      if (observation.data?.found) {
        agent.setState('knowledge', observation.data.information);
      }

      // 检查是否完成
      if (action.type === 'GENERATE_ANSWER') {
        console.log('\n✅ ReAct循环完成');
        break;
      }

      currentObservation = observation;
    }

    // 生成最终答案
    const lastStep = steps[steps.length - 1];
    const answer = lastStep.observation.data?.answer || '无法生成答案';

    return {
      steps,
      answer,
      totalSteps: steps.length,
    };
  }
}

// 主函数
async function main() {
  console.log('🤖 ReAct Agent 示例');
  console.log('这个示例展示了ReAct代理如何结合推理和行动来回答问题\n');

  // 测试问题
  const questions = [
    '什么是Harness？',
    'ReAct架构是什么？',
    'TypeScript有什么特点？',
  ];

  for (const question of questions) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`❓ 问题: ${question}`);
    console.log(`${'='.repeat(60)}`);

    const agent = new QAAgent(question);
    const engine = new ReactEngine(5);

    const result = await engine.run(agent);

    console.log(`\n📊 结果:`);
    console.log(`   总步骤: ${result.totalSteps}`);
    console.log(`   答案: ${result.answer}`);

    console.log(`\n📋 步骤详情:`);
    for (const step of result.steps) {
      console.log(`   步骤${step.stepNumber}: ${step.thought.content}`);
    }
  }
}

// 运行示例
if (require.main === module) {
  main().catch(console.error);
}

export {
  BaseAgent,
  QAAgent,
  ReactEngine,
  Thought,
  Action,
  Observation,
  ReactStep,
  ReactResult,
};