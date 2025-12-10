
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Info, Save, ArrowLeft, Loader2 } from 'lucide-react';
import { SimulationConfig, StrictnessLevel, ScoringCriterion, TaskRecord } from '../types';
import { DbService } from '../services/dbService';

interface ConfigPanelProps {
  initialConfig?: TaskRecord | null;
  onSave: () => void;
  onCancel: () => void;
}

const DEFAULT_CONFIG: SimulationConfig = {
  taskName: "新建理财配置任务",
  requirements: "",
  scenario: "",
  openingLine: "",
  dialogueRequirements: "",
  evaluatorPersona: "",
  rubric: [
    { id: '1', points: 20, description: "基础知识掌握准确性" },
    { id: '2', points: 20, description: "客户需求分析能力" },
    { id: '3', points: 20, description: "方案配置合理性" },
    { id: '4', points: 20, description: "风险提示与合规" },
    { id: '5', points: 20, description: "沟通技巧与服务态度" }
  ],
  strictness: StrictnessLevel.MODERATE
};

export const ConfigPanel: React.FC<ConfigPanelProps> = ({ initialConfig, onSave, onCancel }) => {
  const [config, setConfig] = useState<SimulationConfig>(DEFAULT_CONFIG);
  const [taskId, setTaskId] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialConfig) {
      setConfig(initialConfig);
      setTaskId(initialConfig.id);
    }
  }, [initialConfig]);

  const updateField = (field: keyof SimulationConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const updateRubricItem = (index: number, field: keyof ScoringCriterion, value: any) => {
    const newRubric = [...config.rubric];
    newRubric[index] = { ...newRubric[index], [field]: value };
    setConfig(prev => ({ ...prev, rubric: newRubric }));
  };

  const addRubricItem = () => {
    const newId = (Math.max(0, ...config.rubric.map(r => parseInt(r.id) || 0)) + 1).toString();
    setConfig(prev => ({
      ...prev,
      rubric: [...prev.rubric, { id: newId, points: 10, description: "" }]
    }));
  };

  const removeRubricItem = (index: number) => {
    const newRubric = config.rubric.filter((_, i) => i !== index);
    setConfig(prev => ({ ...prev, rubric: newRubric }));
  };

  const handleSave = async () => {
    if (!config.taskName) {
      alert("请输入任务名称");
      return;
    }
    
    setSaving(true);
    try {
        await DbService.saveTask({
          id: taskId,
          ...config
        });
        onSave();
    } catch (e) {
        console.error(e);
        alert("保存失败，请重试");
    } finally {
        setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 pb-24">
      <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm border border-slate-200 sticky top-0 z-20">
        <div className="flex items-center gap-4">
           <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
             <ArrowLeft size={20} />
           </button>
           <div>
              <h1 className="text-xl font-bold text-slate-800">{taskId ? '编辑任务' : '创建新任务'}</h1>
              <p className="text-slate-500 text-xs">配置模拟参数、角色与评分标准</p>
           </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm transition-colors disabled:opacity-70"
        >
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          {saving ? '保存中...' : '保存任务配置'}
        </button>
      </div>

      <div className="space-y-6">
        {/* Task Name */}
        <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <label className="block text-sm font-semibold text-slate-700 mb-2">任务名称</label>
          <input
            type="text"
            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            value={config.taskName}
            onChange={(e) => updateField('taskName', e.target.value)}
          />
        </section>

        {/* Requirements */}
        <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <label className="block text-sm font-semibold text-slate-700 mb-2">要求</label>
          <textarea
            className="w-full p-2.5 border border-slate-300 rounded-lg h-24 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-y"
            value={config.requirements}
            onChange={(e) => updateField('requirements', e.target.value)}
          />
        </section>

        {/* Scenario */}
        <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-semibold text-slate-700">情景 (AI 角色背景)</label>
            <div className="flex gap-2">
              <span className="bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded font-medium">AI 自动生成 (模拟)</span>
            </div>
          </div>
          <textarea
            className="w-full p-2.5 border border-slate-300 rounded-lg h-40 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-y font-mono text-sm leading-relaxed"
            value={config.scenario}
            onChange={(e) => updateField('scenario', e.target.value)}
          />
        </section>

        {/* Opening Line */}
        <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <label className="block text-sm font-semibold text-slate-700 mb-2">对话起始句</label>
          <textarea
            className="w-full p-2.5 border border-slate-300 rounded-lg h-24 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-y"
            value={config.openingLine}
            onChange={(e) => updateField('openingLine', e.target.value)}
          />
        </section>

        {/* Dialogue Requirements */}
        <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <label className="block text-sm font-semibold text-slate-700 mb-2">对话要求 (学生目标)</label>
          <textarea
            className="w-full p-2.5 border border-slate-300 rounded-lg h-32 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-y"
            value={config.dialogueRequirements}
            onChange={(e) => updateField('dialogueRequirements', e.target.value)}
          />
        </section>

        {/* Evaluator Persona */}
        <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Info size={16} className="text-blue-500"/>
            <label className="block text-sm font-semibold text-slate-700">评估角色设定</label>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-3">
             <textarea
                className="w-full bg-transparent border-none focus:ring-0 outline-none text-slate-700 text-sm resize-y min-h-[120px]"
                value={config.evaluatorPersona}
                onChange={(e) => updateField('evaluatorPersona', e.target.value)}
                placeholder="描述评估者的角色 (例如: 严厉的教授, 资深理财经理)"
              />
          </div>
        </section>

        {/* Grading Criteria */}
        <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
             <div className="flex items-center gap-2">
                <Info size={16} className="text-slate-400" />
                <label className="block text-sm font-semibold text-slate-700">评分标准</label>
             </div>
          </div>
          
          <div className="space-y-3 mb-4">
            {config.rubric.map((item, index) => (
              <div key={index} className="flex items-start gap-3 group">
                <div className="w-20 pt-1">
                  <input
                    type="number"
                    className="w-full p-2 border border-slate-300 rounded-md text-center focus:border-blue-500 outline-none"
                    value={item.points}
                    onChange={(e) => updateRubricItem(index, 'points', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="flex-1 pt-1">
                  <input
                    type="text"
                    className="w-full p-2 border border-slate-300 rounded-md focus:border-blue-500 outline-none"
                    value={item.description}
                    onChange={(e) => updateRubricItem(index, 'description', e.target.value)}
                  />
                </div>
                <button
                  onClick={() => removeRubricItem(index)}
                  className="p-2 text-slate-300 hover:text-red-500 transition-colors pt-3"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
          
          <button
            onClick={addRubricItem}
            className="flex items-center gap-1 text-blue-600 text-sm font-medium hover:underline"
          >
            <Plus size={16} /> 添加评分项
          </button>
        </section>

        {/* Strictness */}
        <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <label className="block text-sm font-semibold text-slate-700 mb-4">评分模式</label>
          <div className="flex gap-3">
            {Object.values(StrictnessLevel).map((level) => (
              <button
                key={level}
                onClick={() => updateField('strictness', level)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  config.strictness === level
                    ? 'bg-blue-100 text-blue-700 border border-blue-200 ring-2 ring-blue-500 ring-offset-1'
                    : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
