
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy,
  addDoc,
  where,
  updateDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { TaskRecord, StudentSubmission, StrictnessLevel, AnalysisReport, SavedAnalysis, AllocationSectionConfig, StudentGroup, TaskAssignment, User } from '../types';

const TASKS_COLLECTION = 'tasks';
const SUBMISSIONS_COLLECTION = 'submissions';
const ANALYSIS_COLLECTION = 'analysis_reports';
const GROUPS_COLLECTION = 'student_groups';
const ASSIGNMENTS_COLLECTION = 'task_assignments';
const USERS_COLLECTION = 'users';

const DEFAULT_ALLOCATION_CONFIG_CN: AllocationSectionConfig[] = [
  {
    id: 'assets',
    title: '资产配置 (%)',
    items: [
      { id: 'stocks', label: '股票/权益' },
      { id: 'bonds', label: '债券/固收' },
      { id: 'cash', label: '现金/货币' }
    ]
  },
  {
    id: 'funds',
    title: '基金组合配置 (%)',
    items: [
      { id: 'equity_funds', label: '偏股型基金' },
      { id: 'hybrid_funds', label: '混合型基金' },
      { id: 'bond_funds', label: '偏债型基金' }
    ]
  }
];

const DEFAULT_ALLOCATION_CONFIG_EN: AllocationSectionConfig[] = [
  {
    id: 'assets',
    title: 'Asset Allocation (%)',
    items: [
      { id: 'stocks', label: 'Stocks/Equity' },
      { id: 'bonds', label: 'Bonds/Fixed Income' },
      { id: 'cash', label: 'Cash/Money Market' }
    ]
  },
  {
    id: 'funds',
    title: 'Fund Portfolio (%)',
    items: [
      { id: 'equity_funds', label: 'Equity Funds' },
      { id: 'hybrid_funds', label: 'Hybrid Funds' },
      { id: 'bond_funds', label: 'Bond Funds' }
    ]
  }
];

const DEFAULT_TASK_CN: Omit<TaskRecord, 'id' | 'createdAt' | 'updatedAt' | 'creatorId' | 'creatorName'> = {
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
  strictness: StrictnessLevel.MODERATE,
  allocationConfig: DEFAULT_ALLOCATION_CONFIG_CN
};

const DEFAULT_TASK_EN: Omit<TaskRecord, 'id' | 'createdAt' | 'updatedAt' | 'creatorId' | 'creatorName'> = {
  taskName: "Asset Allocation for Conservative Single Client (Easy)",
  requirements: "The student is required to analyze the client's risk appetite, income/expense, and asset/liability situation. After understanding financial goals, the student must assist in asset optimization and configuration, specifically selecting different fund products based on the course material.",
  scenario: "Client Alex (Xiao Jian), 27, single, good health. Bachelor's degree. Operations specialist at an internet company in a Tier 2 city. 2 years work experience. After-tax salary 5500 RMB. Social insurance paid normally. Lives in company dorm (540 RMB/month rent). Daily expenses ~1200 RMB. No loans or debts. Credit card used occasionally and paid in full. Interested in funds, follows news, but limited understanding of styles/fees. Has been investing 600 RMB/month in equity funds for 2 years, plus 500 RMB/month in fixed deposit. Remaining savings in cash. Risk profile: Conservative (accepts limited fluctuation, dislikes large drawdowns). Investment horizon: 3-5 years. Goal: Improve returns through standardized fund purchasing while ensuring liquidity, preparing for future property purchase and retirement.",
  openingLine: "Hi, I'm Alex. I work in Hangzhou. You should have my profile. I want to know what problems exist in my current finances? I follow fund news, but there are so many products and ways to buy. How should I configure my portfolio?",
  dialogueRequirements: "1. Act as a Financial Manager, quickly judge client lifecycle/risk profile and explain to client.\n2. Help client select fund products (Must include: Bond Funds, Hybrid Funds, Equity Funds).\n3. Mention techniques like AIP (Regular Investment), Back-end loads, Deduction dates.\n4. Remind client of risks involved.",
  evaluatorPersona: "Role: Senior Financial Planner.\nBackground: Expert in fund configuration for conservative single clients.\nGoal: Evaluate the student's proposal based on client needs (Risk, Income, Goals). Ensure the proposal is logical, professional, and includes required fund types.",
  rubric: [
    { id: '1', points: 15, description: "Mention techniques: AIP, Back-end fees, Deduction dates" },
    { id: '2', points: 15, description: "Risk Control: Avoid chasing highs, avoid frequent trading, match risk profile, long-term horizon" },
    { id: '3', points: 15, description: "Analysis Accuracy: Single period, Conservative, High surplus ratio, Too much cash, Too little investment" },
    { id: '4', points: 15, description: "Product Selection: Bond Funds, Hybrid Funds, Equity Funds" },
    { id: '5', points: 20, description: "Communication Skills: Polite, Professional" },
    { id: '6', points: 20, description: "Client Satisfaction" }
  ],
  strictness: StrictnessLevel.MODERATE,
  allocationConfig: DEFAULT_ALLOCATION_CONFIG_EN
};

export const DbService = {
  // --- USERS ---
  
  updateUserClass: async (userId: string, className: string) => {
    await updateDoc(doc(db, USERS_COLLECTION, userId), { className });
  },

  getAllStudents: async (): Promise<User[]> => {
      const q = query(collection(db, USERS_COLLECTION), where("role", "==", "student"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as User);
  },

  // --- GROUPS ---

  createStudentGroup: async (group: Omit<StudentGroup, 'id' | 'createdAt'>): Promise<StudentGroup> => {
    const newDocRef = doc(collection(db, GROUPS_COLLECTION));
    const newGroup: StudentGroup = {
        ...group,
        id: newDocRef.id,
        createdAt: Date.now()
    };
    await setDoc(newDocRef, newGroup);
    return newGroup;
  },

  updateStudentGroup: async (groupId: string, data: Partial<StudentGroup>) => {
    await updateDoc(doc(db, GROUPS_COLLECTION, groupId), data);
  },

  deleteStudentGroup: async (groupId: string) => {
    await deleteDoc(doc(db, GROUPS_COLLECTION, groupId));
  },

  getGroupsByTeacher: async (teacherId: string): Promise<StudentGroup[]> => {
    const q = query(collection(db, GROUPS_COLLECTION), where("teacherId", "==", teacherId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as StudentGroup);
  },
  
  // Note: Firestore array-contains allows checking if studentId is in studentIds array
  getGroupsForStudent: async (studentId: string): Promise<StudentGroup[]> => {
    const q = query(collection(db, GROUPS_COLLECTION), where("studentIds", "array-contains", studentId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as StudentGroup);
  },

  // --- ASSIGNMENTS ---

  createAssignment: async (assignment: Omit<TaskAssignment, 'id' | 'createdAt'>): Promise<TaskAssignment> => {
    const newDocRef = doc(collection(db, ASSIGNMENTS_COLLECTION));
    const newAssignment: TaskAssignment = {
        ...assignment,
        id: newDocRef.id,
        createdAt: Date.now()
    };
    await setDoc(newDocRef, newAssignment);
    return newAssignment;
  },

  getAssignmentsForTeacher: async (teacherId: string): Promise<TaskAssignment[]> => {
    const q = query(collection(db, ASSIGNMENTS_COLLECTION), where("teacherId", "==", teacherId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as TaskAssignment);
  },

  // Fetch all assignments (for student filtering) - optimized later
  getAllAssignments: async (): Promise<TaskAssignment[]> => {
    const q = query(collection(db, ASSIGNMENTS_COLLECTION));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as TaskAssignment);
  },


  // --- TASKS ---
  
  getTasks: async (teacherId?: string): Promise<TaskRecord[]> => {
    let q;
    if (teacherId) {
        // Teacher dashboard: only own tasks
        q = query(
            collection(db, TASKS_COLLECTION), 
            where("creatorId", "==", teacherId),
            orderBy('updatedAt', 'desc')
        );
    } else {
        // Student portal: all tasks (or could implement public flag)
        q = query(collection(db, TASKS_COLLECTION), orderBy('updatedAt', 'desc'));
    }

    try {
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data() as TaskRecord);
    } catch (e) {
        // Fallback if composite index missing
        console.warn("Index query failed, falling back", e);
        const qAll = query(collection(db, TASKS_COLLECTION), orderBy('updatedAt', 'desc'));
        const snapshot = await getDocs(qAll);
        const all = snapshot.docs.map(doc => doc.data() as TaskRecord);
        if (teacherId) {
            return all.filter(t => t.creatorId === teacherId);
        }
        return all;
    }
  },

  saveTask: async (task: Partial<TaskRecord> & { taskName: string, creatorId: string, creatorName: string }): Promise<TaskRecord> => {
    const id = task.id || doc(collection(db, TASKS_COLLECTION)).id;
    const now = Date.now();
    
    const taskData: TaskRecord = {
      // Defaults
      requirements: "",
      scenario: "",
      openingLine: "",
      dialogueRequirements: "",
      evaluatorPersona: "",
      rubric: [],
      strictness: StrictnessLevel.MODERATE,
      allocationConfig: DEFAULT_ALLOCATION_CONFIG_CN,
      createdAt: now,
      // Overrides
      ...task,
      id,
      updatedAt: now
    };

    await setDoc(doc(db, TASKS_COLLECTION, id), taskData);
    return taskData;
  },

  deleteTask: async (id: string) => {
    await deleteDoc(doc(db, TASKS_COLLECTION, id));
  },

  seedDefaultTasks: async (creatorId: string, creatorName: string): Promise<TaskRecord> => {
     // Save both Chinese and English versions
     await DbService.saveTask({ ...DEFAULT_TASK_EN, creatorId, creatorName });
     return await DbService.saveTask({ ...DEFAULT_TASK_CN, creatorId, creatorName });
  },

  // --- SUBMISSIONS ---

  // Get all submissions (Admin usage mostly)
  getSubmissions: async (): Promise<StudentSubmission[]> => {
    const q = query(collection(db, SUBMISSIONS_COLLECTION), orderBy('submittedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as StudentSubmission);
  },
  
  // Get submissions for a specific teacher's tasks
  getSubmissionsForTeacher: async (teacherId: string): Promise<StudentSubmission[]> => {
      const q = query(
          collection(db, SUBMISSIONS_COLLECTION), 
          where("teacherId", "==", teacherId),
          orderBy('submittedAt', 'desc')
      );
      try {
          const snapshot = await getDocs(q);
          return snapshot.docs.map(doc => doc.data() as StudentSubmission);
      } catch (e) {
          console.warn("Index query failed for submissions, fallback", e);
          const all = await DbService.getSubmissions();
          return all.filter(s => s.teacherId === teacherId);
      }
  },

  getSubmissionsByStudent: async (studentId: string): Promise<StudentSubmission[]> => {
      const q = query(
          collection(db, SUBMISSIONS_COLLECTION), 
          where("studentId", "==", studentId),
          orderBy('submittedAt', 'desc')
      );
      try {
          const snapshot = await getDocs(q);
          return snapshot.docs.map(doc => doc.data() as StudentSubmission);
      } catch (e) {
          console.warn("Index query failed, falling back to client filtering", e);
          const all = await DbService.getSubmissions();
          return all.filter(s => s.studentId === studentId);
      }
  },

  saveSubmission: async (sub: Omit<StudentSubmission, 'id' | 'submittedAt'>): Promise<StudentSubmission> => {
    const newDocRef = doc(collection(db, SUBMISSIONS_COLLECTION));
    const newSubmission: StudentSubmission = {
      ...sub,
      id: newDocRef.id,
      submittedAt: Date.now()
    };
    
    await setDoc(newDocRef, newSubmission);
    return newSubmission;
  },
  
  deleteSubmission: async (id: string) => {
      await deleteDoc(doc(db, SUBMISSIONS_COLLECTION, id));
  },

  clearAllSubmissions: async () => {
    const snapshot = await getDocs(collection(db, SUBMISSIONS_COLLECTION));
    const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deletePromises);
  },

  // --- ANALYSIS REPORTS ---

  saveAnalysis: async (report: AnalysisReport, studentCount: number): Promise<SavedAnalysis> => {
    const newDocRef = doc(collection(db, ANALYSIS_COLLECTION));
    const record: SavedAnalysis = {
      id: newDocRef.id,
      createdAt: Date.now(),
      studentCount,
      report
    };
    await setDoc(newDocRef, record);
    return record;
  },

  getSavedAnalyses: async (): Promise<SavedAnalysis[]> => {
    const q = query(collection(db, ANALYSIS_COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as SavedAnalysis);
  },

  deleteAnalysis: async (id: string) => {
    await deleteDoc(doc(db, ANALYSIS_COLLECTION, id));
  }
};
