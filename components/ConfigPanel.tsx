
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Info, Save, ArrowLeft, Loader2, PieChart, Layout } from 'lucide-react';
import { SimulationConfig, StrictnessLevel, ScoringCriterion, TaskRecord, AllocationSectionConfig } from '../types';
import { DbService } from '../services/dbService';
import { useLanguage } from '../contexts/LanguageContext';

interface ConfigPanelProps {
  initialConfig?: TaskRecord | null;
  creatorId: string;
  creatorName: string;
  onSave: () => void;
  onCancel: () => void;
}

const DEFAULT_ALLOCATION_CONFIG: AllocationSectionConfig[] = [
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
  strictness: StrictnessLevel.MODERATE,
  allocationConfig: DEFAULT_ALLOCATION_CONFIG
};

export const ConfigPanel: React.FC<ConfigPanelProps> = ({ initialConfig, creatorId, creatorName, onSave, onCancel }) => {
  const { t } = useLanguage();
  const [config, setConfig] = useState<SimulationConfig>(DEFAULT_CONFIG);
  const [taskId, setTaskId] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialConfig) {
      setConfig({
          ...DEFAULT_CONFIG,
          ...initialConfig,
          allocationConfig: initialConfig.allocationConfig || DEFAULT_ALLOCATION_CONFIG // Ensure allocationConfig exists
      });
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

  // Allocation Tools Logic
  const addAllocationSection = () => {
      const newSection: AllocationSectionConfig = {
          id: `section_${Date.now()}`,
          title: 'New Section',
          items: []
      };
      setConfig(prev => ({
          ...prev,
          allocationConfig: [...(prev.allocationConfig || []), newSection]
      }));
  };

  const removeAllocationSection = (index: number) => {
      const newConfig = [...(config.allocationConfig || [])];
      newConfig.splice(index, 1);
      setConfig(prev => ({ ...prev, allocationConfig: newConfig }));
  };

  const updateAllocationSectionTitle = (index: number, title: string) => {
      const newConfig = [...(config.allocationConfig || [])];
      newConfig[index].title = title;
      setConfig(prev => ({ ...prev, allocationConfig: newConfig }));
  };

  const addAllocationItem = (sectionIndex: number) => {
      const newConfig = [...(config.allocationConfig || [])];
      newConfig[sectionIndex].items.push({
          id: `item_${Date.now()}`,
          label: 'New Item'
      });
      setConfig(prev => ({ ...prev, allocationConfig: newConfig }));
  };

  const removeAllocationItem = (sectionIndex: number, itemIndex: number) => {
      const newConfig = [...(config.allocationConfig || [])];
      newConfig[sectionIndex].items.splice(itemIndex, 1);
      setConfig(prev => ({ ...prev, allocationConfig: newConfig }));
  };

  const updateAllocationItemLabel = (sectionIndex: number, itemIndex: number, label: string) => {
      const newConfig = [...(config.allocationConfig || [])];
      newConfig[sectionIndex].items[itemIndex].label = label;
      setConfig(prev => ({ ...prev, allocationConfig: newConfig }));
  };

  const handleSave = async () => {
    if (!config.taskName) {
      alert(t('config.alert_name'));
      return;
    }
    
    setSaving(true);
    try {
        await DbService.saveTask({
          id: taskId,
          ...config,
          creatorId: initialConfig?.creatorId || creatorId, // Use existing creator if editing, else new
          creatorName: initialConfig?.creatorName || creatorName
        });
        onSave();
    } catch (e) {
        console.error(e);
        alert(t('config.alert_fail'));
    } finally {
        setSaving(false);
    }
  };

  return (
    <div className="h-screen w-full bg-slate-50 overflow-y-auto custom-scrollbar">
      <div className="max-w-5xl mx-auto p-6 pb-24">
        <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm border border-slate-200 sticky top-0 z-20">
          <div className="flex items-center gap-4">
             <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
               <ArrowLeft size={20} />
             </button>
             <div>
                <h1 className="text-xl font-bold text-slate-800">{taskId ? t('config.title_edit') : t('config.title_new')}</h1>
                <p className="text-slate-500 text-xs">{t('config.subtitle')}</p>
             </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm transition-colors disabled:opacity-70"
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {saving ? t('config.saving') : t('config.save')}
          </button>
        </div>

        <div className="space-y-6">
          {/* Task Name */}
          <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <label className="block text-sm font-semibold text-slate-700 mb-2">{t('config.task_name')}</label>
            <input
              type="text"
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              value={config.taskName}
              onChange={(e) => updateField('taskName', e.target.value)}
            />
          </section>

          {/* Allocation Tools Configuration */}
          <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
             <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                   <PieChart size={16} className="text-purple-500" />
                   <label className="block text-sm font-semibold text-slate-700">配置方案工具设置 (Allocation Tools)</label>
                </div>
                <button onClick={addAllocationSection} className="text-xs flex items-center gap-1 text-purple-600 font-medium hover:underline">
                    <Plus size={14} /> Add Section
                </button>
             </div>
             
             <div className="space-y-6">
                 {(config.allocationConfig || []).map((section, sIdx) => (
                     <div key={section.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 relative">
                         <button 
                            onClick={() => removeAllocationSection(sIdx)}
                            className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors"
                         >
                             <Trash2 size={16} />
                         </button>
                         
                         <div className="mb-4 pr-8">
                             <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Block Title</label>
                             <input 
                                type="text"
                                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-sm font-bold text-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
                                value={section.title}
                                onChange={(e) => updateAllocationSectionTitle(sIdx, e.target.value)}
                             />
                         </div>

                         <div className="space-y-2">
                             <label className="text-xs font-bold text-slate-500 uppercase block">Indicators</label>
                             {section.items.map((item, iIdx) => (
                                 <div key={item.id} className="flex gap-2 items-center">
                                     <Layout size={14} className="text-slate-400" />
                                     <input 
                                        type="text"
                                        className="flex-1 bg-white border border-slate-300 rounded px-2 py-1.5 text-sm text-slate-700 focus:border-purple-500 outline-none"
                                        value={item.label}
                                        onChange={(e) => updateAllocationItemLabel(sIdx, iIdx, e.target.value)}
                                     />
                                     <button 
                                        onClick={() => removeAllocationItem(sIdx, iIdx)}
                                        className="text-slate-300 hover:text-red-500 p-1"
                                     >
                                         <Trash2 size={14} />
                                     </button>
                                 </div>
                             ))}
                             <button 
                                onClick={() => addAllocationItem(sIdx)}
                                className="text-xs flex items-center gap-1 text-purple-600 font-medium hover:bg-purple-50 px-2 py-1 rounded mt-2"
                             >
                                 <Plus size={12} /> Add Indicator
                             </button>
                         </div>
                     </div>
                 ))}
             </div>
          </section>

          {/* Requirements */}
          <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <label className="block text-sm font-semibold text-slate-700 mb-2">{t('config.requirements')}</label>
            <textarea
              className="w-full p-2.5 border border-slate-300 rounded-lg h-24 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-y"
              value={config.requirements}
              onChange={(e) => updateField('requirements', e.target.value)}
            />
          </section>

          {/* Scenario */}
          <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-semibold text-slate-700">{t('config.scenario')}</label>
              <div className="flex gap-2">
                <span className="bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded font-medium">{t('config.ai_generated')}</span>
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
            <label className="block text-sm font-semibold text-slate-700 mb-2">{t('config.opening_line')}</label>
            <textarea
              className="w-full p-2.5 border border-slate-300 rounded-lg h-24 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-y"
              value={config.openingLine}
              onChange={(e) => updateField('openingLine', e.target.value)}
            />
          </section>

          {/* Dialogue Requirements */}
          <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <label className="block text-sm font-semibold text-slate-700 mb-2">{t('config.dialogue_req')}</label>
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
              <label className="block text-sm font-semibold text-slate-700">{t('config.evaluator')}</label>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-3">
               <textarea
                  className="w-full bg-transparent border-none focus:ring-0 outline-none text-slate-700 text-sm resize-y min-h-[120px]"
                  value={config.evaluatorPersona}
                  onChange={(e) => updateField('evaluatorPersona', e.target.value)}
                  placeholder={t('config.evaluator_placeholder')}
                />
            </div>
          </section>

          {/* Grading Criteria */}
          <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
               <div className="flex items-center gap-2">
                  <Info size={16} className="text-slate-400" />
                  <label className="block text-sm font-semibold text-slate-700">{t('config.rubric')}</label>
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
              <Plus size={16} /> {t('config.add_criterion')}
            </button>
          </section>

          {/* Strictness */}
          <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <label className="block text-sm font-semibold text-slate-700 mb-4">{t('config.strictness')}</label>
            <div className="flex gap-3">
              {Object.keys(StrictnessLevel).map((key) => {
                  const level = StrictnessLevel[key as keyof typeof StrictnessLevel];
                  return (
                    <button
                      key={level}
                      onClick={() => updateField('strictness', level)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        config.strictness === level
                          ? 'bg-blue-100 text-blue-700 border border-blue-200 ring-2 ring-blue-500 ring-offset-1'
                          : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {t(`strictness.${level}`)}
                    </button>
                  );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
