
import React, { createContext, useState, useContext, ReactNode } from 'react';

type Language = 'zh' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const translations: Record<string, Record<Language, string>> = {
  // Login
  'app.name': { zh: 'FinSim AI 实训平台', en: 'FinSim AI Training Platform' },
  'app.desc': { zh: '智能理财模拟教学系统', en: 'Intelligent Financial Simulation System' },
  'login.title': { zh: '登录', en: 'Sign In' },
  'login.register': { zh: '注册账号', en: 'Create Account' },
  'login.name': { zh: '姓名', en: 'Full Name' },
  'login.email': { zh: '邮箱账号', en: 'Email Address' },
  'login.password': { zh: '密码', en: 'Password' },
  'login.class': { zh: '班级', en: 'Class' },
  'login.class_ph': { zh: '例如: 2024级金融1班', en: 'e.g., Class 1, Finance 2024' },
  'login.role': { zh: '选择角色', en: 'Select Role' },
  'role.student': { zh: '学生', en: 'Student' },
  'role.teacher': { zh: '老师', en: 'Teacher' },
  'login.key': { zh: '管理员密钥', en: 'Admin Key' },
  'login.submit': { zh: '登录系统', en: 'Sign In' },
  'login.register_submit': { zh: '注册并登录', en: 'Sign Up & Login' },
  'login.switch_login': { zh: '已有账号？去登录', en: 'Already have an account? Sign in' },
  'login.switch_register': { zh: '没有账号？注册一个', en: 'No account? Create one' },
  
  // Dashboard General
  'dash.title': { zh: '实训管理后台', en: 'Instructor Dashboard' },
  'dash.tasks': { zh: '任务管理', en: 'Tasks' },
  'dash.results': { zh: '学生成绩', en: 'Results' },
  'dash.classes': { zh: '班级与分组管理', en: 'Classes & Groups' },
  'dash.analysis': { zh: '报告中心', en: 'Report Center' },
  'dash.insights': { zh: '教学洞察看板', en: 'Teaching Insights' },
  'dash.logout': { zh: '退出登录', en: 'Logout' },
  'dash.create_task': { zh: '新建任务', en: 'Create Task' },
  'dash.import_default': { zh: '一键导入默认任务', en: 'Import Default Tasks' },
  'dash.empty_tasks': { zh: '还没有创建任何任务', en: 'No tasks created yet' },
  'dash.test_task': { zh: '测试', en: 'Test' },
  
  // Classes & Groups
  'classes.title': { zh: '班级与分组管理', en: 'Classes & Groups Management' },
  'classes.my_classes': { zh: '我的班级', en: 'My Classes' },
  'classes.select_class': { zh: '选择班级', en: 'Select Class' },
  'classes.all_students': { zh: '全部学生', en: 'All Students' },
  'classes.groups': { zh: '分组列表', en: 'Groups' },
  'classes.create_group': { zh: '新建分组', en: 'New Group' },
  'classes.group_name': { zh: '分组名称', en: 'Group Name' },
  'classes.manual_type': { zh: '手动分组', en: 'Manual' },
  'classes.auto_type': { zh: '按成绩自动分组', en: 'Auto (Score)' },
  'classes.members': { zh: '成员', en: 'Members' },
  'classes.no_class': { zh: '未分班', en: 'No Class Assigned' },
  'classes.manage_members': { zh: '管理成员', en: 'Manage Members' },
  'classes.delete_confirm': { zh: '确定删除该分组吗？', en: 'Delete this group?' },
  'classes.save': { zh: '保存', en: 'Save' },
  'classes.cancel': { zh: '取消', en: 'Cancel' },
  
  // Task Assignment
  'assign.publish': { zh: '发布任务', en: 'Publish Task' },
  'assign.target_class': { zh: '目标班级', en: 'Target Class' },
  'assign.target': { zh: '发布范围', en: 'Target Scope' },
  'assign.all_students': { zh: '整个班级', en: 'Entire Class' },
  'assign.select_groups': { zh: '选择分组', en: 'Select Groups' },
  'assign.confirm': { zh: '确认发布', en: 'Confirm Publish' },
  'assign.success': { zh: '任务发布成功', en: 'Task Published' },
  
  // Auto Grouping
  'auto.btn': { zh: '按成绩区间生成分组', en: 'Create Groups by Score' },
  'auto.title': { zh: '生成分层小组', en: 'Generate Tiered Groups' },
  'auto.desc': { zh: '根据本次发布任务的成绩，自动将学生分入不同小组。', en: 'Automatically group students based on scores from this assignment.' },
  'auto.bucket': { zh: '分数区间', en: 'Score Range' },
  'auto.group_name': { zh: '对应组名', en: 'Group Name' },
  'auto.generate': { zh: '立即生成', en: 'Generate Now' },
  'auto.success': { zh: '分组生成成功！', en: 'Groups generated successfully!' },
  
  // Insights & Modules
  'insights.time_7d': { zh: '最近7天', en: 'Last 7 Days' },
  'insights.time_30d': { zh: '最近30天', en: 'Last 30 Days' },
  'insights.time_all': { zh: '全部时间', en: 'All Time' },
  'insights.refresh': { zh: '刷新数据', en: 'Refresh Data' },
  'insights.select_task': { zh: '选择任务', en: 'Select Task' },
  'insights.all_tasks': { zh: '所有任务', en: 'All Tasks' },
  'insights.total_subs': { zh: '提交总数', en: 'Total Submissions' },
  'insights.avg_score': { zh: '平均分', en: 'Avg Score' },
  'insights.active_students': { zh: '活跃学生', en: 'Active Students' },
  'insights.score_dist': { zh: '班级维度分布', en: 'Class Dimension Distribution' },
  'insights.recent_activity': { zh: '最近动态', en: 'Recent Activity' },
  'insights.at_risk': { zh: '需关注学生 (低分)', en: 'At Risk Students (<60)' },
  'insights.heatmap': { zh: '知识点掌握热力图', en: 'Knowledge Mastery Heatmap' },
  'insights.weakness_rank': { zh: '短板排行榜 (Top Weaknesses)', en: 'Weakness Leaderboard' },
  'insights.coverage': { zh: '关键问题覆盖率', en: 'Key Question Coverage' },
  'insights.common_errors': { zh: '常见错误 Top 榜', en: 'Top Common Errors' },
  'insights.objection_funnel': { zh: '异议处理漏斗', en: 'Objection Handling Funnel' },
  'insights.student_matrix': { zh: '学生矩阵', en: 'Student Matrix' },
  'insights.no_data_field': { zh: '当前数据未包含该统计字段', en: 'Field not found in current data' },
  'insights.enable_new_scoring': { zh: '需要启用新版评分输出', en: 'Requires new scoring model' },
  'insights.view_evidence': { zh: '查看证据', en: 'View Evidence' },
  'insights.dimension': { zh: '维度', en: 'Dimension' },
  'insights.mean': { zh: '均值', en: 'Mean' },
  'insights.below_threshold': { zh: '低于阈值人数', en: 'Below Threshold' },

  // Evidence Drawer
  'evidence.title': { zh: '证据抽屉', en: 'Evidence Drawer' },
  'evidence.open_transcript': { zh: '打开完整对话', en: 'Open Transcript' },
  'evidence.copy_feedback': { zh: '复制反馈', en: 'Copy Feedback' },
  'evidence.no_evidence': { zh: '暂无证据片段', en: 'No evidence available' },
  'evidence.copied': { zh: '已复制', en: 'Copied' },
  
  // Dashboard Analysis / Report Center
  'dash.analyze_best': { zh: '仅分析最高分记录', en: 'Analyze Best Attempt Only' },
  'dash.generate': { zh: '生成新报告', en: 'Generate New Report' },
  'dash.regenerate': { zh: '重新生成', en: 'Regenerate' },
  'dash.save': { zh: '保存报告快照', en: 'Save Report Snapshot' },
  'dash.saved_reports': { zh: '历史报告存档', en: 'Archived Reports' },
  'dash.generated_on': { zh: '报告生成于', en: 'Analysis generated on' },
  'dash.based_on': { zh: '基于 {count} 条学生记录', en: 'Based on {count} student records' },
  'dash.view': { zh: '查看详情', en: 'View Details' },
  'dash.summary': { zh: '总体总结', en: 'Summary' },
  'dash.clustering': { zh: '学生风格聚类', en: 'Student Style Clustering' },
  'dash.students': { zh: '包含学生', en: 'Students' },
  'dash.traits': { zh: '特征画像', en: 'Traits' },
  'dash.suggestions': { zh: '教学建议', en: 'Suggestions' },
  'dash.mastered': { zh: '已掌握', en: 'Mastered' },
  'dash.missing': { zh: '待加强', en: 'Missing' },
  'dash.delete_confirm': { zh: '确定删除该报告？', en: 'Delete this saved report?' },
  'dash.save_success': { zh: '报告保存成功！', en: 'Report saved successfully!' },
  'dash.save_fail': { zh: '保存报告失败。', en: 'Failed to save report.' },
  'dash.no_data': { zh: '暂无数据', en: 'No data available' },
  'dash.analyzing': { zh: 'AI 正在分析 {count} 条记录...', en: 'AI is analyzing {count} records...' },
  'dash.evidence': { zh: '对话证据片段', en: 'Conversation Evidence' },
  'dash.go_insights': { zh: '去教学洞察看板查看实时详情', en: 'Go to Teaching Insights for Real-time Details' },

  // Config Panel
  'config.title_new': { zh: '创建新任务', en: 'Create New Task' },
  'config.title_edit': { zh: '编辑任务', en: 'Edit Task' },
  'config.subtitle': { zh: '配置模拟参数、角色与评分标准', en: 'Configure simulation parameters, persona and rubric' },
  'config.save': { zh: '保存任务配置', en: 'Save Task Config' },
  'config.saving': { zh: '保存中...', en: 'Saving...' },
  'config.task_name': { zh: '任务名称', en: 'Task Name' },
  'config.requirements': { zh: '要求', en: 'Requirements' },
  'config.scenario': { zh: '情景 (AI 角色背景)', en: 'Scenario (AI Persona Background)' },
  'config.ai_generated': { zh: 'AI 自动生成 (模拟)', en: 'AI Generated (Simulated)' },
  'config.opening_line': { zh: '对话起始句', en: 'Opening Line' },
  'config.dialogue_req': { zh: '对话要求 (学生目标)', en: 'Dialogue Requirements (Student Goals)' },
  'config.evaluator': { zh: '评估角色设定', en: 'Evaluator Persona' },
  'config.evaluator_placeholder': { zh: '描述评估者的角色 (例如: 严厉的教授, 资深理财经理)', en: 'Describe the evaluator role (e.g., Strict Professor, Senior Manager)' },
  'config.rubric': { zh: '评分标准', en: 'Scoring Criteria' },
  'config.add_criterion': { zh: '添加评分项', en: 'Add Criterion' },
  'config.strictness': { zh: '评分模式', en: 'Grading Strictness' },
  'config.alert_name': { zh: '请输入任务名称', en: 'Please enter task name' },
  'config.alert_fail': { zh: '保存失败，请重试', en: 'Save failed, please retry' },

  // Strictness Levels
  'strictness.LENIENT': { zh: '宽松', en: 'Lenient' },
  'strictness.MODERATE': { zh: '较为宽松', en: 'Moderate' },
  'strictness.STRICT': { zh: '较为严苛', en: 'Strict' },
  'strictness.VERY_STRICT': { zh: '严苛', en: 'Very Strict' },

  // Submission Details
  'detail.title': { zh: '成绩详情', en: 'Submission Details' },
  'detail.score': { zh: '最终得分', en: 'Final Score' },
  'detail.assets': { zh: '资产配置', en: 'Asset Allocation' },
  'detail.funds': { zh: '基金组合配置', en: 'Fund Portfolio' },
  'detail.feedback': { zh: '综合评语', en: 'Overall Feedback' },
  'detail.breakdown': { zh: '得分细则', en: 'Score Breakdown' },
  'detail.close': { zh: '关闭', en: 'Close' },
  
  // Student Portal
  'student.welcome': { zh: '你好', en: 'Hello' },
  'student.subtitle': { zh: '准备好开始今天的实训了吗？', en: 'Ready to start your simulation?' },
  'student.select_task': { zh: '选择实训任务', en: 'Select Simulation Task' },
  'student.start_btn': { zh: '进入模拟实训', en: 'Start Simulation' },
  'student.no_tasks': { zh: '暂无发布的任务', en: 'No tasks available' },
  'student.created_by': { zh: '发布教师', en: 'Instructor' },
  'student.my_class': { zh: '我的班级', en: 'My Class' },
  'student.my_groups': { zh: '我的分组', en: 'My Groups' },
  'student.edit': { zh: '编辑', en: 'Edit' },
  'student.save': { zh: '保存', en: 'Save' },
  'student.no_class': { zh: '未分班', en: 'No class assigned' },
  'student.no_groups': { zh: '你暂时还没有加入任何分组', en: 'You are not in any group yet' },
  'student.manual_group': { zh: '手动分组', en: 'Manual Group' },
  'student.auto_group': { zh: '按成绩自动分组', en: 'Auto Group (Score)' },

  // Chat
  'chat.client_profile': { zh: '客户档案', en: 'Client Profile' },
  'chat.scenario': { zh: '背景情景', en: 'Scenario' },
  'chat.requirements': { zh: '任务要求', en: 'Requirements' },
  'chat.goals': { zh: '对话目标', en: 'Goals' },
  'chat.tools': { zh: '配置方案工具', en: 'Allocation Tools' },
  'chat.assets': { zh: '资产配置 (%)', en: 'Asset Allocation (%)' },
  'chat.stocks': { zh: '股票/权益', en: 'Stocks/Equity' },
  'chat.bonds': { zh: '债券/固收', en: 'Bonds/Fixed Inc' },
  'chat.cash': { zh: '现金/货币', en: 'Cash/Money Mkt' },
  
  'chat.fund_config': { zh: '基金组合配置 (%)', en: 'Fund Portfolio (%)' },
  'chat.equity_funds': { zh: '偏股型基金', en: 'Equity Funds' },
  'chat.hybrid_funds': { zh: '混合型基金', en: 'Hybrid Funds' },
  'chat.bond_funds': { zh: '偏债型基金', en: 'Bond Funds' },

  'chat.total': { zh: '总计', en: 'Total' },
  'chat.submit_plan': { zh: '提交完整方案', en: 'Submit Full Proposal' },
  'chat.plan_submitted': { zh: '方案已提交', en: 'Proposal Submitted' },
  'chat.input_placeholder': { zh: '输入回复，作为理财经理与客户沟通...', en: 'Type your response as a financial manager...' },
  'chat.restart': { zh: '重来', en: 'Restart' },
  'chat.finish': { zh: '结束', en: 'Finish' },
  'chat.mood_label': { zh: '客户情绪', en: 'Client Mood' },

  // Moods
  'mood.happy': { zh: '满意', en: 'Happy' },
  'mood.neutral': { zh: '平静', en: 'Neutral' },
  'mood.angry': { zh: '愤怒', en: 'Angry' },
  'mood.confused': { zh: '困惑', en: 'Confused' },
  'mood.skeptical': { zh: '怀疑', en: 'Skeptical' },

  // Evaluation
  'eval.title': { zh: '表现评估', en: 'Performance Evaluation' },
  'eval.score': { zh: '最终得分', en: 'Final Score' },
  'eval.feedback': { zh: '评估员点评', en: 'Evaluator Feedback' },
  'eval.breakdown': { zh: '得分细则', en: 'Score Breakdown' },
  'eval.complete': { zh: '完成', en: 'Done' },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('zh');

  const t = (key: string, params?: Record<string, string | number>) => {
    let str = translations[key]?.[language] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        str = str.replace(`{${k}}`, String(v));
      });
    }
    return str;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
