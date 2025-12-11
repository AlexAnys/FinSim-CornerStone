
import { TaskRecord, StudentSubmission, SimulationConfig, StrictnessLevel } from '../types';

const TASKS_KEY = 'finsim_tasks';
const SUBMISSIONS_KEY = 'finsim_submissions';

// Default Task to seed the DB
const DEFAULT_TASK: TaskRecord = {
  id: 'default-task-001',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  creatorId: 'system',
  creatorName: 'System',
  taskName: "帮助单身期稳健型客户完成理财配置-易",
  requirements: "本任务要求学生根据当前客户的风险偏好情况、收入支出情况及资产负债情况，在了解其理财目标后，协助客户完成资产优化及配置。同时要求学生结合本节课所学基金内容，为他配置不同的基金产品。",
  scenario: "客户小健，27岁，未婚，汉族，健康状况良好。本科学历。二线城市互联网企业运营专员，毕业工作满2年，税后工资5500元，个人“三险一金”按公司标准正常缴纳；现入住公司宿舍，月租540元，日常餐饮、通勤与通信等其他开销约1200元；无房贷车贷、无消费分期。信用卡偶尔使用并按时全额还款，征信记录良好。小健对基金产品有持续兴趣，平时在银行代销与基金平台关注基金资讯，能阅读基金公告但对风格差异与费用结构理解有限；已坚持偏股型基金定投600元/月达2年，同时办理零存整取500元/月，其余结余主要留作活期备用。经风险测评为稳健型，愿承受有限净值波动但不希望本金出现较大回撤，投资期限以中长期（3-5年）为主，当前诉求是在保障日常现金流前提下，通过规范的基金购买与持有流程提升理财收益，为未来置业及退休做资金准备。",
  openingLine: "您好，我是小健。目前在杭州工作，我的个人情况你应该已经了解了。我想知道我的理财目前存在哪些问题呢？平时我都有关注基金的资讯，但是市面上的基金产品太多了，购买方式也五花八门，我到底应该如何配置基金产品呢？",
  dialogueRequirements: "1. 要求学生能够进入理财经理的角色，根据客户的信息迅速判断客户的生命周期及风险偏好情况，并向客户说明。\n2. 结合客户的财务状况及理财目标，帮助客户完成对基金产品的选择（要求基金产品包含三种类型：偏债型基金/混合型基金/偏股型基金）。\n3. 针对客户存在的基金购买问题，在对话中提及定投方式、后端收费、扣款日期等理财技巧。\n4. 有必要在对话过程中提醒客户基金购买过程中需要注意的风险。",
  evaluatorPersona: "角色：你是一位资深的理财规划师，拥有丰富的理财经验和专业知识，能根据客户实际情况给出合理的基金配置方案。\n背景：学生需要根据单身期稳健型客户的风险偏好、收入支出、资产负债情况，在了解其理财目标后，协助客户配置合适的基金产品。\n技能：你能够精准分析客户的风险偏好、收入支出和资产负债情况，根据客户理财目标，合理进行资产优化及配置，结合所学基金知识，为客户挑选适配的基金产品，准确评估学生在这些方面的表现。\n目标：根据学生为单身期稳健型客户制定的理财配置方案，依据既定的评价维度和标准，给出公正、准确的评分和评价。\n限制：评价过程不考虑外部市场环境的突然变化，严格按照评价维度和标准进行评分，确保评价的客观性和公正性。",
  rubric: [
    { id: '1', points: 15, description: "提及基金的理财技巧：定投；后端收费；扣款日期等内容" },
    { id: '2', points: 15, description: "提及基金的风险控制：避免追涨杀跌；避免频繁操作；要符合个人风险偏好；拉长投资期限等" },
    { id: '3', points: 15, description: "对客户分析情况的准确性：单身期；稳健型；结余比率高；现金等资产太多；投资性资产过少等" },
    { id: '4', points: 15, description: "为客户选择合适的基金产品，至少包含三类：偏债类基金；混合型基金；偏股类基金" },
    { id: '5', points: 20, description: "注意与客户的沟通技巧，要有礼貌，显示自己的专业性" },
    { id: '6', points: 20, description: "客户满意度" }
  ],
  strictness: StrictnessLevel.MODERATE
};

export const MockDb = {
  // Tasks
  getTasks: (): TaskRecord[] => {
    const data = localStorage.getItem(TASKS_KEY);
    if (!data) {
      // Seed default directly to prevent recursion (getTasks -> saveTask -> getTasks)
      const initialTasks = [DEFAULT_TASK];
      localStorage.setItem(TASKS_KEY, JSON.stringify(initialTasks));
      return initialTasks;
    }
    return JSON.parse(data);
  },

  getTaskById: (id: string): TaskRecord | undefined => {
    const tasks = MockDb.getTasks();
    return tasks.find(t => t.id === id);
  },

  saveTask: (task: Partial<TaskRecord> & { taskName: string }): TaskRecord => {
    const tasks = MockDb.getTasks();
    const existingIndex = tasks.findIndex(t => t.id === task.id);
    
    let savedTask: TaskRecord;

    if (existingIndex >= 0) {
      savedTask = { ...tasks[existingIndex], ...task, updatedAt: Date.now() };
      tasks[existingIndex] = savedTask;
    } else {
      savedTask = {
        ...DEFAULT_TASK, // Fill defaults
        ...task,
        id: task.id || Date.now().toString(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      tasks.push(savedTask);
    }

    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
    return savedTask;
  },

  deleteTask: (id: string) => {
    const tasks = MockDb.getTasks().filter(t => t.id !== id);
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  },

  // Submissions
  getSubmissions: (): StudentSubmission[] => {
    const data = localStorage.getItem(SUBMISSIONS_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveSubmission: (sub: Omit<StudentSubmission, 'id' | 'submittedAt'>): StudentSubmission => {
    const subs = MockDb.getSubmissions();
    const newSub: StudentSubmission = {
      ...sub,
      id: Date.now().toString(),
      submittedAt: Date.now()
    };
    subs.push(newSub);
    localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(subs));
    return newSub;
  },
  
  clearAllSubmissions: () => {
      localStorage.removeItem(SUBMISSIONS_KEY);
  }
};
