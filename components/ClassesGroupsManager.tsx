
import React, { useState, useMemo } from 'react';
import { User, StudentGroup } from '../types';
import { DbService } from '../services/dbService';
import { useLanguage } from '../contexts/LanguageContext';
import { Users, Plus, Trash2, GraduationCap, X, Check, Loader2, UserPlus, Sparkles, AlertTriangle } from 'lucide-react';

interface ClassesGroupsManagerProps {
  teacherId: string;
  groups: StudentGroup[];
  allStudents: User[];
  onRefreshData: () => void;
  selectedClass: string | null;
  setSelectedClass: (val: string | null) => void;
  viewFilter: 'all' | 'ungrouped';
  setViewFilter: (val: 'all' | 'ungrouped') => void;
}

const UNASSIGNED_VIEW = '__unassigned__';

export const ClassesGroupsManager: React.FC<ClassesGroupsManagerProps> = ({ 
    teacherId, 
    groups, 
    allStudents, 
    onRefreshData,
    selectedClass,
    setSelectedClass,
    viewFilter,
    setViewFilter
}) => {
  const { t } = useLanguage();
  
  // Create Group State
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [creatingLoading, setCreatingLoading] = useState(false);
  
  // Group Member Management State
  const [managingGroupId, setManagingGroupId] = useState<string | null>(null);
  const [tempMemberIds, setTempMemberIds] = useState<Set<string>>(new Set());

  // Assign Class State
  const [isAssigningClass, setIsAssigningClass] = useState(false);
  const [targetStudent, setTargetStudent] = useState<User | null>(null);
  const [targetClassName, setTargetClassName] = useState('');
  const [assigningLoading, setAssigningLoading] = useState(false);

  // Custom Confirm Modal State
  const [confirmConfig, setConfirmConfig] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void} | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Derive unique classes
  const classList = useMemo(() => {
      const classes = new Set<string>();
      allStudents.forEach(s => { 
          const name = s.className?.trim();
          if (name && name !== "No Class") classes.add(name); 
      });
      groups.forEach(g => { 
          const name = g.className?.trim();
          if (name && name !== "No Class") classes.add(name); 
      });
      return Array.from(classes).sort();
  }, [allStudents, groups]);

  const classGroups = useMemo(() => {
      if (!selectedClass) return [];
      if (selectedClass === UNASSIGNED_VIEW) {
          // In the catch-all view, we show groups that are explicitly named "No Class" or have no className
          return groups.filter(g => !g.className || g.className === "No Class");
      }
      return groups.filter(g => g.className === selectedClass);
  }, [selectedClass, groups]);

  const classStudents = useMemo(() => {
      if (!selectedClass) return [];
      let students: User[] = [];
      
      if (selectedClass === UNASSIGNED_VIEW) {
          students = allStudents.filter(s => !s.className || s.className === "No Class");
      } else {
          students = allStudents.filter(s => s.className === selectedClass);
      }
      
      students = [...students].sort((a,b) => a.name.localeCompare(b.name));
      
      if (viewFilter === 'ungrouped' && selectedClass !== UNASSIGNED_VIEW) {
          const groupedStudentIds = new Set<string>();
          classGroups.forEach(g => g.studentIds.forEach(id => groupedStudentIds.add(id)));
          students = students.filter(s => !groupedStudentIds.has(s.id));
      }
      return students;
  }, [selectedClass, allStudents, viewFilter, classGroups]);

  const handleCreateGroup = async () => {
      if (!newGroupName.trim() || !selectedClass || selectedClass === UNASSIGNED_VIEW) return;
      setCreatingLoading(true);
      try {
          await DbService.createStudentGroup({
              teacherId,
              className: selectedClass,
              name: newGroupName,
              type: 'manual',
              studentIds: [],
          });
          onRefreshData();
          setIsCreatingGroup(false);
          setNewGroupName('');
      } catch (e) {
          alert('Failed to create group');
      } finally {
          setCreatingLoading(false);
      }
  };

  const handleDeleteGroup = (groupId: string) => {
      setConfirmConfig({
          isOpen: true,
          title: "Delete Group",
          message: t('classes.delete_confirm'),
          onConfirm: async () => {
              setDeletingId(groupId);
              try {
                  await DbService.deleteStudentGroup(groupId);
                  onRefreshData();
              } catch (e) {
                  alert('Failed to delete group');
              } finally {
                  setDeletingId(null);
                  setConfirmConfig(null);
              }
          }
      });
  };

  const handleDeleteClass = (className: string) => {
      setConfirmConfig({
          isOpen: true,
          title: `Delete Class "${className}"?`,
          message: "This will delete all groups in this class and unassign all students. This action cannot be undone.",
          onConfirm: async () => {
              setAssigningLoading(true);
              try {
                  // 1. Delete all groups in this class
                  const groupsToDelete = groups.filter(g => g.className === className);
                  for (const g of groupsToDelete) {
                      await DbService.deleteStudentGroup(g.id);
                  }
                  
                  // 2. Unassign all students
                  const studentsToUnassign = allStudents.filter(s => s.className === className);
                  for (const s of studentsToUnassign) {
                      await DbService.updateUserClass(s.id, "");
                  }
                  
                  onRefreshData();
                  if (selectedClass === className) setSelectedClass(null);
              } catch (e) {
                  console.error(e);
                  alert('Failed to delete class');
              } finally {
                  setAssigningLoading(false);
                  setConfirmConfig(null);
              }
          }
      });
  };

  const openManageMembers = (group: StudentGroup) => {
      setManagingGroupId(group.id);
      setTempMemberIds(new Set(group.studentIds));
  };

  const saveMembers = async () => {
      if (!managingGroupId) return;
      try {
          await DbService.updateStudentGroup(managingGroupId, { studentIds: Array.from(tempMemberIds) });
          onRefreshData();
          setManagingGroupId(null);
      } catch (e) {
          alert('Failed to update members');
      }
  };

  const openAssignClass = (student: User) => {
      setTargetStudent(student);
      setTargetClassName(student.className === "No Class" ? "" : (student.className || ''));
      setIsAssigningClass(true);
  };

  const handleAssignClass = async () => {
      if (!targetStudent || !targetClassName.trim()) return;
      setAssigningLoading(true);
      try {
          await DbService.updateUserClass(targetStudent.id, targetClassName.trim());
          onRefreshData();
          setIsAssigningClass(false);
          setTargetStudent(null);
          setTargetClassName('');
      } catch (e) {
          alert('Failed to update class');
      } finally {
          setAssigningLoading(false);
      }
  };

  // Logic to identify missing members (Issue 2 fix)
  const getMissingMembers = () => {
      if (!managingGroupId) return [];
      const visibleIds = new Set(classStudents.map(s => s.id));
      const missingIds: string[] = [];
      tempMemberIds.forEach(id => {
          if (!visibleIds.has(id)) missingIds.push(id);
      });
      return missingIds;
  };

  const missingMembers = getMissingMembers();

  const isUnassignedView = selectedClass === UNASSIGNED_VIEW;

  return (
    <div className="flex flex-col md:flex-row h-full gap-6 relative">
       {/* Left Sidebar */}
       <div className="w-full md:w-64 bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden shrink-0 h-[500px] md:h-auto shadow-sm">
           <div className="p-4 border-b border-slate-100 font-bold text-slate-700 flex items-center gap-2">
               <GraduationCap size={18} className="text-blue-500" />
               {t('classes.my_classes')}
           </div>
           <div className="flex-1 overflow-y-auto p-2 space-y-1">
               {classList.map(cls => (
                   <div key={cls} className="relative group">
                        <button
                            onClick={() => { setSelectedClass(cls); setViewFilter('all'); }}
                            className={`w-full text-left px-4 py-3 pr-10 rounded-lg text-sm font-bold transition-all flex justify-between items-center ${
                                selectedClass === cls ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            <span className="truncate">{cls}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${selectedClass === cls ? 'bg-blue-400 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                {allStudents.filter(s => s.className === cls).length}
                            </span>
                        </button>
                        <button 
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                handleDeleteClass(cls); 
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 transition-all rounded hover:bg-red-50"
                            title="Delete Class"
                        >
                            <Trash2 size={14} className="pointer-events-none" />
                        </button>
                   </div>
               ))}
               <div className="pt-2 border-t mt-4">
                  <button 
                      onClick={() => { setSelectedClass(UNASSIGNED_VIEW); setViewFilter('all'); }}
                      className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold transition-all flex justify-between items-center ${
                          selectedClass === UNASSIGNED_VIEW ? 'bg-orange-600 text-white shadow-md' : 'text-orange-600 hover:bg-orange-50'
                      }`}
                  >
                      <span>{t('classes.no_class')}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${selectedClass === UNASSIGNED_VIEW ? 'bg-orange-400 text-white' : 'bg-orange-100 text-orange-600'}`}>
                          {allStudents.filter(s => !s.className || s.className === "No Class").length}
                      </span>
                  </button>
               </div>
           </div>
       </div>

       {/* Main Content Area */}
       <div className="flex-1 bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden h-full shadow-sm">
           {selectedClass ? (
               <div className="flex flex-col h-full">
                   <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                       <div>
                           <h2 className={`text-xl font-bold ${isUnassignedView ? 'text-orange-600' : 'text-slate-800'}`}>
                               {isUnassignedView ? 'Unassigned Students' : selectedClass}
                           </h2>
                           <p className="text-sm text-slate-500 font-medium">
                               {classStudents.length} Students
                               {`, ${classGroups.length} Groups`}
                           </p>
                       </div>
                       {!isUnassignedView && (
                           <button 
                             onClick={() => setIsCreatingGroup(true)}
                             className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-lg shadow-blue-500/20"
                           >
                               <Plus size={16} /> {t('classes.create_group')}
                           </button>
                       )}
                   </div>

                   <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
                       {classGroups.length > 0 && (
                           <div className="mb-8">
                               <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                   <Users size={16} /> {t('classes.groups')}
                               </h3>
                               <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                   {classGroups.map(group => (
                                       <div key={group.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all border-l-4" style={{ borderLeftColor: group.type === 'manual' ? '#3b82f6' : '#a855f7' }}>
                                           <div className="flex justify-between items-start mb-2">
                                               <div className="flex-1 pr-2">
                                                   <div className="flex items-center gap-2 mb-1">
                                                      <h4 className="font-bold text-slate-800 text-sm line-clamp-2">{group.name}</h4>
                                                      {group.type === 'auto-score-bucket' && <Sparkles size={12} className="text-purple-500 shrink-0" />}
                                                   </div>
                                                   <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${group.type === 'manual' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                                                       {group.type === 'manual' ? t('classes.manual_type') : t('classes.auto_type')}
                                                   </span>
                                               </div>
                                               <div className="flex gap-1 shrink-0 relative z-0">
                                                   <button onClick={() => openManageMembers(group)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors relative z-10">
                                                       <Users size={14} className="pointer-events-none" />
                                                   </button>
                                                   <button 
                                                        disabled={deletingId === group.id}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteGroup(group.id);
                                                        }} 
                                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-30 relative z-10"
                                                    >
                                                       {deletingId === group.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} className="pointer-events-none" />}
                                                   </button>
                                               </div>
                                           </div>
                                           <div className="text-xs text-slate-500 flex items-center gap-1 mt-3 pt-3 border-t border-slate-50">
                                               <Users size={12} className="text-slate-300" /> 
                                               <span className="font-bold text-slate-700">{group.studentIds.length}</span> {t('classes.members')}
                                           </div>
                                       </div>
                                   ))}
                               </div>
                           </div>
                       )}

                       <div>
                           <div className="flex justify-between items-center mb-4">
                               <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                   <GraduationCap size={16} /> {isUnassignedView ? 'All Unassigned Students' : (viewFilter === 'all' ? t('classes.all_students') : 'Ungrouped Students')}
                               </h3>
                               {!isUnassignedView && (
                                   <div className="flex bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                                       <button onClick={() => setViewFilter('all')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${viewFilter === 'all' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-800'}`}>All</button>
                                       <button onClick={() => setViewFilter('ungrouped')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${viewFilter === 'ungrouped' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-800'}`}>Ungrouped</button>
                                   </div>
                               )}
                           </div>
                           <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                               <table className="w-full text-sm text-left">
                                   <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] tracking-widest border-b border-slate-100">
                                       <tr><th className="px-6 py-4">Name</th><th className="px-6 py-4">Email</th><th className="px-6 py-4">{isUnassignedView ? 'Action' : 'Groups'}</th></tr>
                                   </thead>
                                   <tbody className="divide-y divide-slate-50">
                                       {classStudents.map(student => {
                                           const studentGroups = classGroups.filter(g => g.studentIds.includes(student.id));
                                           return (
                                               <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                                                   <td className="px-6 py-4 font-bold text-slate-800 flex items-center gap-3">
                                                       <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs text-slate-500 font-bold border border-slate-200">{student.name[0]}</div>
                                                       {student.name}
                                                   </td>
                                                   <td className="px-6 py-4 text-slate-500 font-medium">{student.email}</td>
                                                   <td className="px-6 py-4">
                                                       {isUnassignedView ? (
                                                           <button onClick={() => openAssignClass(student)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700 text-xs font-bold transition-all shadow-md shadow-orange-500/20"><UserPlus size={14} /> Assign Class</button>
                                                       ) : (
                                                           <div className="flex flex-wrap gap-2">
                                                               {studentGroups.length > 0 ? studentGroups.map(g => (
                                                                   <span key={g.id} className={`text-[10px] px-2 py-1 rounded-md font-bold flex items-center gap-1 ${g.type === 'manual' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-purple-50 text-purple-700 border border-purple-100'}`}>
                                                                       {g.type === 'auto-score-bucket' && <Sparkles size={10} />}{g.name}
                                                                   </span>
                                                               )) : <span className="text-xs text-slate-300 italic font-medium">Ungrouped</span>}
                                                           </div>
                                                       )}
                                                   </td>
                                               </tr>
                                           );
                                       })}
                                       {classStudents.length === 0 && <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-400 italic font-medium bg-white">No students found.</td></tr>}
                                   </tbody>
                               </table>
                           </div>
                       </div>
                   </div>
               </div>
           ) : (
               <div className="flex items-center justify-center h-full text-slate-400 flex-col gap-4 bg-slate-50/50">
                   <div className="w-20 h-20 bg-white border border-slate-200 shadow-sm rounded-full flex items-center justify-center"><GraduationCap size={40} className="text-slate-200" /></div>
                   <p className="font-bold tracking-widest text-slate-300 uppercase">{t('classes.select_class')}</p>
               </div>
           )}
       </div>

       {/* Create Group Modal */}
       {isCreatingGroup && (
           <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
               <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 animate-in fade-in zoom-in-95 duration-200">
                   <h3 className="font-bold text-xl mb-2 text-slate-800">{t('classes.create_group')}</h3>
                   <div className="mb-8 mt-6">
                       <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Group Name</label>
                       <input type="text" className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium" placeholder={t('classes.group_name')} value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} autoFocus />
                   </div>
                   <div className="flex justify-end gap-3">
                       <button onClick={() => setIsCreatingGroup(false)} className="px-6 py-2.5 text-slate-500 font-bold text-sm hover:bg-slate-100 rounded-xl transition-colors">{t('classes.cancel')}</button>
                       <button onClick={handleCreateGroup} disabled={creatingLoading || !newGroupName.trim()} className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-500/20">{creatingLoading ? <Loader2 className="animate-spin" size={18} /> : t('classes.save')}</button>
                   </div>
               </div>
           </div>
       )}

       {/* Custom Confirmation Modal */}
       {confirmConfig && (
           <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
               <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-200">
                   <div className="mb-4">
                       <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-4 mx-auto">
                           <AlertTriangle size={24} />
                       </div>
                       <h3 className="font-bold text-xl text-center text-slate-800 mb-2">{confirmConfig.title}</h3>
                       <p className="text-center text-slate-500 text-sm leading-relaxed">{confirmConfig.message}</p>
                   </div>
                   <div className="flex gap-3">
                       <button onClick={() => setConfirmConfig(null)} className="flex-1 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-sm transition-colors">Cancel</button>
                       <button onClick={confirmConfig.onConfirm} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 shadow-lg shadow-red-500/20 transition-colors">Confirm</button>
                   </div>
               </div>
           </div>
       )}

       {/* Manage Members Modal */}
       {managingGroupId && (
           <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
               <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
                   <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
                       <div><h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">{t('classes.manage_members')}</h3></div>
                       <button onClick={() => setManagingGroupId(null)} className="text-slate-400 hover:text-slate-600 p-2"><X size={20}/></button>
                   </div>
                   
                   {/* Missing Members Warning Block */}
                   {missingMembers.length > 0 && (
                       <div className="mx-6 mt-4 p-3 bg-orange-50 border border-orange-100 rounded-xl flex gap-3">
                           <AlertTriangle className="text-orange-500 shrink-0 mt-0.5" size={16} />
                           <div className="text-xs text-orange-800">
                               <p className="font-bold mb-1">
                                   {missingMembers.length} members are not in the current class view:
                               </p>
                               <div className="flex flex-wrap gap-1">
                                   {missingMembers.map(id => {
                                       const u = allStudents.find(s => s.id === id);
                                       return (
                                           <span key={id} className="bg-white border border-orange-200 px-1.5 py-0.5 rounded text-[10px] font-mono">
                                               {u ? u.name : id}
                                           </span>
                                       )
                                   })}
                               </div>
                           </div>
                       </div>
                   )}

                   <div className="flex-1 overflow-y-auto p-4 space-y-1">
                       {/* Correctly filter by current view students to ensure class alignment */}
                       {classStudents.map(student => {
                           const isSelected = tempMemberIds.has(student.id);
                           return (
                               <div key={student.id} onClick={() => { const ns = new Set(tempMemberIds); if (ns.has(student.id)) ns.delete(student.id); else ns.add(student.id); setTempMemberIds(ns); }} className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all border ${isSelected ? 'bg-blue-50 border-blue-200' : 'hover:bg-slate-50 border-transparent'}`}>
                                   <div className="flex items-center gap-4">
                                       <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{student.name[0]}</div>
                                       <div><div className={`text-sm font-bold ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>{student.name}</div><div className="text-[10px] text-slate-400 font-medium tracking-wide">{student.email}</div></div>
                                   </div>
                                   {isSelected && <Check size={20} className="text-blue-600" />}
                               </div>
                           );
                       })}
                   </div>
                   <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 rounded-b-2xl">
                       <button onClick={() => setManagingGroupId(null)} className="px-6 py-2.5 text-slate-500 font-bold text-sm hover:bg-slate-200 rounded-xl transition-colors">{t('classes.cancel')}</button>
                       <button onClick={saveMembers} className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-500/20">{t('classes.save')}</button>
                   </div>
               </div>
           </div>
       )}

       {/* Assign Class Modal */}
       {isAssigningClass && targetStudent && (
           <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
               <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 animate-in fade-in zoom-in-95 duration-200">
                   <h3 className="font-bold text-xl mb-2 text-slate-800">Assign Class</h3>
                   <div className="mb-8 mt-6">
                       <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Class Name</label>
                       <input type="text" className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold" placeholder="e.g. 202401" value={targetClassName} onChange={(e) => setTargetClassName(e.target.value)} autoFocus />
                   </div>
                   <div className="flex justify-end gap-3">
                       <button onClick={() => setIsAssigningClass(false)} className="px-6 py-2.5 text-slate-500 font-bold text-sm hover:bg-slate-100 rounded-xl transition-colors">{t('classes.cancel')}</button>
                       <button onClick={handleAssignClass} disabled={assigningLoading || !targetClassName.trim()} className="px-8 py-2.5 bg-orange-600 text-white rounded-xl font-bold text-sm hover:bg-orange-700 shadow-lg shadow-orange-500/20">{assigningLoading ? <Loader2 className="animate-spin" size={18} /> : 'Assign'}</button>
                   </div>
               </div>
           </div>
       )}
    </div>
  );
};
