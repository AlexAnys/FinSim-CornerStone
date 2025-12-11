
import React, { useState, useEffect, useMemo } from 'react';
import { User, StudentGroup } from '../types';
import { DbService } from '../services/dbService';
import { useLanguage } from '../contexts/LanguageContext';
import { Users, Plus, Trash2, Edit2, Search, GraduationCap, X, Check, MoreVertical, Loader2, Filter, UserPlus, ArrowRight } from 'lucide-react';

interface ClassesGroupsManagerProps {
  teacherId: string;
}

const UNASSIGNED_VIEW = '__unassigned__';

export const ClassesGroupsManager: React.FC<ClassesGroupsManagerProps> = ({ teacherId }) => {
  const { t, language } = useLanguage();
  const [allStudents, setAllStudents] = useState<User[]>([]);
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [viewFilter, setViewFilter] = useState<'all' | 'ungrouped'>('all');
  
  // Create/Edit Group State
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

  useEffect(() => {
    loadData();
  }, [teacherId]);

  const loadData = async () => {
    setLoading(true);
    try {
        const [students, teacherGroups] = await Promise.all([
            DbService.getAllStudents(), 
            DbService.getGroupsByTeacher(teacherId)
        ]);
        setAllStudents(students);
        setGroups(teacherGroups);
    } catch (e) {
        console.error("Failed to load classes data", e);
    } finally {
        setLoading(false);
    }
  };

  // Derive unique classes from students
  const classList = useMemo(() => {
      const classes = new Set<string>();
      allStudents.forEach(s => {
          if (s.className) classes.add(s.className);
      });
      return Array.from(classes).sort();
  }, [allStudents]);

  // Derived Data for Selected Class
  const classGroups = useMemo(() => {
      if (!selectedClass || selectedClass === UNASSIGNED_VIEW) return [];
      return groups.filter(g => g.className === selectedClass);
  }, [selectedClass, groups]);

  const classStudents = useMemo(() => {
      if (!selectedClass) return [];
      
      let students: User[] = [];
      
      if (selectedClass === UNASSIGNED_VIEW) {
          students = allStudents.filter(s => !s.className);
      } else {
          students = allStudents.filter(s => s.className === selectedClass);
      }
      
      students = students.sort((a,b) => a.name.localeCompare(b.name));
      
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
          const newGroup = await DbService.createStudentGroup({
              teacherId,
              className: selectedClass,
              name: newGroupName,
              type: 'manual',
              studentIds: [],
          });
          setGroups(prev => [...prev, newGroup]);
          setIsCreatingGroup(false);
          setNewGroupName('');
      } catch (e) {
          console.error(e);
          alert('Failed to create group');
      } finally {
          setCreatingLoading(false);
      }
  };

  const handleDeleteGroup = async (groupId: string) => {
      if (!confirm(t('classes.delete_confirm'))) return;
      try {
          await DbService.deleteStudentGroup(groupId);
          setGroups(prev => prev.filter(g => g.id !== groupId));
      } catch (e) {
          console.error(e);
          alert('Failed to delete group');
      }
  };

  const openManageMembers = (group: StudentGroup) => {
      setManagingGroupId(group.id);
      setTempMemberIds(new Set(group.studentIds));
  };

  const toggleMember = (studentId: string) => {
      const newSet = new Set(tempMemberIds);
      if (newSet.has(studentId)) {
          newSet.delete(studentId);
      } else {
          newSet.add(studentId);
      }
      setTempMemberIds(newSet);
  };

  const saveMembers = async () => {
      if (!managingGroupId) return;
      try {
          await DbService.updateStudentGroup(managingGroupId, { studentIds: Array.from(tempMemberIds) });
          setGroups(prev => prev.map(g => g.id === managingGroupId ? { ...g, studentIds: Array.from(tempMemberIds) } : g));
          setManagingGroupId(null);
      } catch (e) {
          console.error(e);
          alert('Failed to update members');
      }
  };

  const openAssignClass = (student: User) => {
      setTargetStudent(student);
      setTargetClassName('');
      setIsAssigningClass(true);
  };

  const handleAssignClass = async () => {
      if (!targetStudent || !targetClassName.trim()) return;
      setAssigningLoading(true);
      try {
          const newClass = targetClassName.trim();
          await DbService.updateUserClass(targetStudent.id, newClass);
          
          // Update local state
          setAllStudents(prev => prev.map(s => s.id === targetStudent.id ? { ...s, className: newClass } : s));
          
          setIsAssigningClass(false);
          setTargetStudent(null);
          setTargetClassName('');
      } catch (e) {
          console.error(e);
          alert('Failed to update class');
      } finally {
          setAssigningLoading(false);
      }
  };

  if (loading) {
      return (
          <div className="flex items-center justify-center h-full">
              <Loader2 className="animate-spin text-slate-400 w-10 h-10" />
          </div>
      );
  }

  const isUnassignedView = selectedClass === UNASSIGNED_VIEW;

  return (
    <div className="flex flex-col md:flex-row h-full gap-6">
       {/* Left Sidebar: Class List */}
       <div className="w-full md:w-64 bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden shrink-0 h-[500px] md:h-auto">
           <div className="p-4 border-b border-slate-100 font-bold text-slate-700 flex items-center gap-2">
               <GraduationCap size={18} className="text-blue-500" />
               {t('classes.my_classes')}
           </div>
           <div className="flex-1 overflow-y-auto p-2 space-y-1">
               {classList.length === 0 ? (
                   <div className="text-center py-8 text-slate-400 text-sm italic">
                       No classes found.
                   </div>
               ) : (
                   classList.map(cls => (
                       <button
                          key={cls}
                          onClick={() => { setSelectedClass(cls); setViewFilter('all'); }}
                          className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors flex justify-between items-center ${
                              selectedClass === cls 
                              ? 'bg-blue-50 text-blue-700' 
                              : 'text-slate-600 hover:bg-slate-50'
                          }`}
                       >
                           {cls}
                           <span className="bg-slate-200 text-slate-600 text-[10px] px-1.5 py-0.5 rounded-full">
                               {allStudents.filter(s => s.className === cls).length}
                           </span>
                       </button>
                   ))
               )}
               
               {/* Unassigned View Toggle */}
               <div 
                   onClick={() => { setSelectedClass(UNASSIGNED_VIEW); setViewFilter('all'); }}
                   className={`px-4 py-3 text-xs border-t border-slate-50 mt-2 cursor-pointer flex justify-between items-center transition-colors rounded-lg mx-1 ${
                       selectedClass === UNASSIGNED_VIEW 
                       ? 'bg-orange-50 text-orange-700 font-medium' 
                       : 'text-slate-400 hover:bg-slate-50'
                   }`}
               >
                   <span>{t('classes.no_class')}</span>
                   <span className="bg-slate-200 text-slate-600 text-[10px] px-1.5 py-0.5 rounded-full">
                       {allStudents.filter(s => !s.className).length}
                   </span>
               </div>
           </div>
       </div>

       {/* Right Content */}
       <div className="flex-1 bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden h-full">
           {selectedClass ? (
               <div className="flex flex-col h-full">
                   {/* Header */}
                   <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                       <div>
                           <h2 className={`text-xl font-bold ${isUnassignedView ? 'text-orange-600' : 'text-slate-800'}`}>
                               {isUnassignedView ? 'Unassigned Students' : selectedClass}
                           </h2>
                           <p className="text-sm text-slate-500">
                               {classStudents.length} Students
                               {!isUnassignedView && `, ${classGroups.length} Groups`}
                           </p>
                       </div>
                       {!isUnassignedView && (
                           <button 
                             onClick={() => setIsCreatingGroup(true)}
                             className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                           >
                               <Plus size={16} /> {t('classes.create_group')}
                           </button>
                       )}
                   </div>

                   {/* Main Content Area */}
                   <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                       
                       {/* Groups Grid (Only for actual classes) */}
                       {!isUnassignedView && classGroups.length > 0 && (
                           <div className="mb-8">
                               <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                   <Users size={16} /> {t('classes.groups')}
                               </h3>
                               <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                   {classGroups.map(group => (
                                       <div key={group.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative group-card">
                                           <div className="flex justify-between items-start mb-2">
                                               <div>
                                                   <h4 className="font-bold text-slate-800">{group.name}</h4>
                                                   <span className={`text-[10px] px-1.5 py-0.5 rounded ${group.type === 'manual' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                                       {group.type === 'manual' ? t('classes.manual_type') : t('classes.auto_type')}
                                                   </span>
                                               </div>
                                               <div className="flex gap-1">
                                                   <button onClick={() => openManageMembers(group)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded" title={t('classes.manage_members')}>
                                                       <Users size={14} />
                                                   </button>
                                                   <button onClick={() => handleDeleteGroup(group.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded" title="Delete">
                                                       <Trash2 size={14} />
                                                   </button>
                                               </div>
                                           </div>
                                           <div className="text-xs text-slate-500 flex items-center gap-1 mt-3">
                                               <Users size={12} /> {group.studentIds.length} {t('classes.members')}
                                           </div>
                                       </div>
                                   ))}
                               </div>
                           </div>
                       )}

                       {/* Students List */}
                       <div>
                           <div className="flex justify-between items-center mb-4">
                               <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                   <GraduationCap size={16} /> {isUnassignedView ? 'All Unassigned Students' : (viewFilter === 'all' ? t('classes.all_students') : 'Ungrouped Students')}
                               </h3>
                               {!isUnassignedView && (
                                   <div className="flex bg-white border border-slate-200 rounded-lg p-1">
                                       <button 
                                          onClick={() => setViewFilter('all')}
                                          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${viewFilter === 'all' ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:bg-slate-50'}`}
                                       >
                                           All
                                       </button>
                                       <button 
                                          onClick={() => setViewFilter('ungrouped')}
                                          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${viewFilter === 'ungrouped' ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:bg-slate-50'}`}
                                       >
                                           Ungrouped
                                       </button>
                                   </div>
                               )}
                           </div>
                           
                           <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                               <table className="w-full text-sm text-left">
                                   <thead className="bg-slate-50 text-slate-500 font-medium">
                                       <tr>
                                           <th className="px-4 py-3">Name</th>
                                           <th className="px-4 py-3">Email</th>
                                           <th className="px-4 py-3">{isUnassignedView ? 'Action' : 'Groups'}</th>
                                       </tr>
                                   </thead>
                                   <tbody className="divide-y divide-slate-100">
                                       {classStudents.map(student => {
                                           const studentGroups = !isUnassignedView ? classGroups.filter(g => g.studentIds.includes(student.id)) : [];
                                           return (
                                               <tr key={student.id} className="hover:bg-slate-50">
                                                   <td className="px-4 py-3 font-medium text-slate-800 flex items-center gap-2">
                                                       <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs text-slate-500 font-bold">
                                                           {student.name[0]}
                                                       </div>
                                                       {student.name}
                                                   </td>
                                                   <td className="px-4 py-3 text-slate-500">{student.email}</td>
                                                   <td className="px-4 py-3">
                                                       {isUnassignedView ? (
                                                           <button 
                                                               onClick={() => openAssignClass(student)}
                                                               className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 text-xs font-bold transition-colors"
                                                           >
                                                               <UserPlus size={14} /> Assign Class
                                                           </button>
                                                       ) : (
                                                           <div className="flex flex-wrap gap-1">
                                                               {studentGroups.length > 0 ? (
                                                                   studentGroups.map(g => (
                                                                       <span key={g.id} className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">
                                                                           {g.name}
                                                                       </span>
                                                                   ))
                                                               ) : (
                                                                   <span className="text-xs text-slate-300 italic">No groups</span>
                                                               )}
                                                           </div>
                                                       )}
                                                   </td>
                                               </tr>
                                           );
                                       })}
                                       {classStudents.length === 0 && (
                                           <tr>
                                               <td colSpan={3} className="px-4 py-8 text-center text-slate-400 italic">
                                                   No students found.
                                               </td>
                                           </tr>
                                       )}
                                   </tbody>
                               </table>
                           </div>
                       </div>
                   </div>
               </div>
           ) : (
               <div className="flex items-center justify-center h-full text-slate-400 flex-col gap-4">
                   <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                       <GraduationCap size={32} />
                   </div>
                   <p>{t('classes.select_class')}</p>
               </div>
           )}
       </div>

       {/* Create Group Modal */}
       {isCreatingGroup && (
           <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
               <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-200">
                   <h3 className="font-bold text-lg mb-4">{t('classes.create_group')}</h3>
                   <input 
                      type="text" 
                      className="w-full border border-slate-300 rounded-lg px-4 py-2 mb-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder={t('classes.group_name')}
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      autoFocus
                   />
                   <div className="flex justify-end gap-2">
                       <button onClick={() => setIsCreatingGroup(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">{t('classes.cancel')}</button>
                       <button onClick={handleCreateGroup} disabled={creatingLoading || !newGroupName.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                           {creatingLoading ? <Loader2 className="animate-spin" size={18} /> : t('classes.save')}
                       </button>
                   </div>
               </div>
           </div>
       )}

       {/* Manage Members Modal */}
       {managingGroupId && (
           <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
               <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-200">
                   <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                       <h3 className="font-bold text-lg">{t('classes.manage_members')}</h3>
                       <button onClick={() => setManagingGroupId(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                   </div>
                   <div className="flex-1 overflow-y-auto p-2">
                       {/* Show all students in the class so they can be added/removed */}
                       {allStudents.filter(s => s.className === selectedClass).sort((a,b) => a.name.localeCompare(b.name)).map(student => {
                           const isSelected = tempMemberIds.has(student.id);
                           return (
                               <div 
                                  key={student.id}
                                  onClick={() => toggleMember(student.id)}
                                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                               >
                                   <div className="flex items-center gap-3">
                                       <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isSelected ? 'bg-blue-200 text-blue-700' : 'bg-slate-200 text-slate-500'}`}>
                                           {student.name[0]}
                                       </div>
                                       <div>
                                            <div className={`text-sm font-medium ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>{student.name}</div>
                                            <div className="text-xs text-slate-400">{student.email}</div>
                                       </div>
                                   </div>
                                   {isSelected && <Check size={18} className="text-blue-600" />}
                               </div>
                           );
                       })}
                   </div>
                   <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 rounded-b-xl">
                       <button onClick={() => setManagingGroupId(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg">{t('classes.cancel')}</button>
                       <button onClick={saveMembers} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                           {t('classes.save')}
                       </button>
                   </div>
               </div>
           </div>
       )}

       {/* Assign Class Modal */}
       {isAssigningClass && targetStudent && (
           <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
               <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-200">
                   <h3 className="font-bold text-lg mb-2">Assign Class</h3>
                   <p className="text-sm text-slate-500 mb-4">Assigning a class to <span className="font-bold text-slate-700">{targetStudent.name}</span></p>
                   
                   <div className="mb-4">
                       <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Class Name</label>
                       <div className="relative">
                           <input 
                              type="text" 
                              className="w-full border border-slate-300 rounded-lg pl-3 pr-10 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                              placeholder="e.g. 202401"
                              value={targetClassName}
                              onChange={(e) => setTargetClassName(e.target.value)}
                              list="class-suggestions"
                              autoFocus
                           />
                           {/* Datalist for existing classes suggestion */}
                           <datalist id="class-suggestions">
                               {classList.map(c => (
                                   <option key={c} value={c} />
                               ))}
                           </datalist>
                       </div>
                   </div>

                   <div className="flex justify-end gap-2">
                       <button onClick={() => setIsAssigningClass(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">{t('classes.cancel')}</button>
                       <button onClick={handleAssignClass} disabled={assigningLoading || !targetClassName.trim()} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50">
                           {assigningLoading ? <Loader2 className="animate-spin" size={18} /> : 'Assign'}
                       </button>
                   </div>
               </div>
           </div>
       )}
    </div>
  );
};
