/**
 * ClassHub - Classroom Management System
 * Attendance Tracking and Peer Evaluation Platform
 * 
 * Version: 1.0.0
 * 
 * Copyright (c) 2026 Zhengyang Chen
 * Economics Department, Wilson College of Business
 * University of Northern Iowa
 * https://robinchen.org
 * 
 * Licensed under the MIT License
 */

import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from 'firebase/auth';
import { getFirestore, collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, writeBatch, onSnapshot } from 'firebase/firestore';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB2wtDb5erXZ0TiK6dSZUT5h7BlyDWF9Gg",
  authDomain: "econclasshub.firebaseapp.com",
  projectId: "econclasshub",
  storageBucket: "econclasshub.firebasestorage.app",
  messagingSenderId: "764607858631",
  appId: "1:764607858631:web:c1c4d442b9e18a8014fbe2",
  measurementId: "G-2Q3VEQD90L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Utility functions
const generateId = () => Math.random().toString(36).substr(2, 9);
const generateCode = () => Math.random().toString(36).substr(2, 6).toUpperCase();
const formatDate = (date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [view, setView] = useState('login');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teams, setTeams] = useState([]);
  const [projects, setProjects] = useState([]);
  const [attendanceCodes, setAttendanceCodes] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [peerEvaluations, setPeerEvaluations] = useState([]);
  const [teamRankings, setTeamRankings] = useState([]);
  const [classEnrollments, setClassEnrollments] = useState([]);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [attendanceInput, setAttendanceInput] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [joinClassCode, setJoinClassCode] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  const [evalFormData, setEvalFormData] = useState({});
  const [teamEvalFormData, setTeamEvalFormData] = useState({});
  const [registrationCode, setRegistrationCode] = useState('');
  const [regCodeInput, setRegCodeInput] = useState('');
  const [newRegCode, setNewRegCode] = useState('');
  const [codeExpiryMinutes, setCodeExpiryMinutes] = useState(5);

  // Firebase Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const profileDoc = await getDoc(doc(db, 'users', user.uid));
        if (profileDoc.exists()) {
          setUserProfile(profileDoc.data());
          setView(profileDoc.data().role === 'admin' ? 'admin' : 'student');
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        setView('login');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Load data when authenticated
  useEffect(() => {
    if (!currentUser || !userProfile) return;
    const loadData = async () => {
      try {
        const [classesSnap, teamsSnap, projectsSnap, codesSnap, attendanceSnap, evalsSnap, rankingsSnap, enrollmentsSnap, usersSnap] = await Promise.all([
          getDocs(collection(db, 'classes')), getDocs(collection(db, 'teams')), getDocs(collection(db, 'projects')),
          getDocs(collection(db, 'attendanceCodes')), getDocs(collection(db, 'attendanceRecords')), getDocs(collection(db, 'peerEvaluations')),
          getDocs(collection(db, 'teamRankings')), getDocs(collection(db, 'enrollments')), getDocs(collection(db, 'users'))
        ]);
        setClasses(classesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setTeams(teamsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setProjects(projectsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setAttendanceCodes(codesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setAttendanceRecords(attendanceSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setPeerEvaluations(evalsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setTeamRankings(rankingsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setClassEnrollments(enrollmentsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const settingsDoc = await getDoc(doc(db, 'settings', 'global'));
        if (settingsDoc.exists()) {
          if (settingsDoc.data().registrationCode) setRegistrationCode(settingsDoc.data().registrationCode);
          if (settingsDoc.data().codeExpiryMinutes) setCodeExpiryMinutes(settingsDoc.data().codeExpiryMinutes);
        } else if (userProfile.role === 'admin') {
          const defaultCode = generateCode();
          await setDoc(doc(db, 'settings', 'global'), { registrationCode: defaultCode, codeExpiryMinutes: 5 });
          setRegistrationCode(defaultCode);
        }
        const savedClass = localStorage.getItem('classhub-selectedClass');
        if (savedClass) setSelectedClassId(savedClass);
      } catch (err) { console.error('Load error:', err); }
    };
    loadData();
  }, [currentUser, userProfile]);

  // Real-time listeners
  useEffect(() => {
    if (!currentUser) return;
    const unsubs = [
      onSnapshot(collection(db, 'attendanceRecords'), s => setAttendanceRecords(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'peerEvaluations'), s => setPeerEvaluations(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'teamRankings'), s => setTeamRankings(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'enrollments'), s => setClassEnrollments(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'teams'), s => setTeams(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'users'), s => setUsers(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'classes'), s => setClasses(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'attendanceCodes'), s => setAttendanceCodes(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'projects'), s => setProjects(s.docs.map(d => ({ id: d.id, ...d.data() })))),
    ];
    return () => unsubs.forEach(u => u());
  }, [currentUser]);

  const showNotification = (message, type = 'success') => { setNotification({ message, type }); setTimeout(() => setNotification(null), 3000); };

  // Auth handlers
  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) { showNotification('Please enter email and password', 'error'); return; }
    setAuthLoading(true);
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      setLoginEmail(''); setLoginPassword('');
      showNotification('Welcome back!');
    } catch (err) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') showNotification('Invalid email or password', 'error');
      else if (err.code === 'auth/too-many-requests') showNotification('Too many attempts. Try later.', 'error');
      else showNotification('Login failed', 'error');
    }
    setAuthLoading(false);
  };

  const handleRegister = async () => {
    if (!registerName || !registerEmail || !registerPassword) { showNotification('Please fill all fields', 'error'); return; }
    if (registerPassword.length < 6) { showNotification('Password must be at least 6 characters', 'error'); return; }
    try {
      const settingsDoc = await getDoc(doc(db, 'settings', 'global'));
      const currentRegCode = settingsDoc.exists() ? settingsDoc.data().registrationCode : null;
      if (!currentRegCode) { showNotification('Registration not configured. Contact instructor.', 'error'); return; }
      if (regCodeInput.toUpperCase() !== currentRegCode.toUpperCase()) { showNotification('Invalid registration code', 'error'); return; }
    } catch { showNotification('Cannot verify registration code', 'error'); return; }
    setAuthLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, registerEmail, registerPassword);
      await updateProfile(cred.user, { displayName: registerName });
      const profile = { id: cred.user.uid, name: registerName, email: registerEmail, role: 'student', createdAt: new Date().toISOString() };
      await setDoc(doc(db, 'users', cred.user.uid), profile);
      setUserProfile(profile);
      showNotification('Registration successful!');
      setRegisterName(''); setRegisterEmail(''); setRegisterPassword(''); setRegCodeInput('');
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') showNotification('Email already registered', 'error');
      else if (err.code === 'auth/weak-password') showNotification('Password too weak', 'error');
      else showNotification('Registration failed', 'error');
    }
    setAuthLoading(false);
  };

  const handleLogout = async () => { await signOut(auth); setSelectedClassId(null); setActiveTab('dashboard'); localStorage.removeItem('classhub-selectedClass'); };

  // Class management
  const createClass = async () => {
    if (!newClassName.trim()) return;
    try {
      const joinCode = generateCode();
      const newClass = { id: generateId(), name: newClassName, joinCode, createdAt: new Date().toISOString(), archived: false, createdBy: currentUser.uid };
      await setDoc(doc(db, 'classes', newClass.id), newClass);
      setNewClassName('');
      showNotification(`Class created! Join code: ${joinCode}`);
    } catch { showNotification('Failed to create class', 'error'); }
  };

  const joinClass = async () => {
    const cls = classes.find(c => c.joinCode === joinClassCode.toUpperCase() && !c.archived);
    if (!cls) { showNotification('Invalid class code', 'error'); return; }
    if (classEnrollments.find(e => e.userId === currentUser.uid && e.classId === cls.id)) { showNotification('Already enrolled', 'error'); return; }
    try {
      const enrollment = { id: generateId(), userId: currentUser.uid, classId: cls.id, teamId: null, enrolledAt: new Date().toISOString() };
      await setDoc(doc(db, 'enrollments', enrollment.id), enrollment);
      setJoinClassCode('');
      showNotification(`Joined ${cls.name}!`);
    } catch { showNotification('Failed to join class', 'error'); }
  };

  const archiveClass = async (classId) => {
    try {
      await updateDoc(doc(db, 'classes', classId), { archived: true });
      if (selectedClassId === classId) { setSelectedClassId(null); setActiveTab('dashboard'); }
      showNotification('Class archived');
    } catch { showNotification('Failed to archive', 'error'); }
  };

  const selectClass = (classId) => { setSelectedClassId(classId); localStorage.setItem('classhub-selectedClass', classId); };
  const deselectClass = () => { setSelectedClassId(null); setActiveTab('dashboard'); localStorage.removeItem('classhub-selectedClass'); };

  // Team management
  const createTeam = async () => {
    if (!newTeamName.trim() || !selectedClassId) return;
    try {
      const newTeam = { id: generateId(), name: newTeamName, classId: selectedClassId, members: [currentUser.uid], createdAt: new Date().toISOString() };
      await setDoc(doc(db, 'teams', newTeam.id), newTeam);
      const enrollment = classEnrollments.find(e => e.userId === currentUser.uid && e.classId === selectedClassId);
      if (enrollment) await updateDoc(doc(db, 'enrollments', enrollment.id), { teamId: newTeam.id });
      setNewTeamName('');
      showNotification('Team created!');
    } catch { showNotification('Failed to create team', 'error'); }
  };

  const joinTeam = async (teamId) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;
    const enrollment = classEnrollments.find(e => e.userId === currentUser.uid && e.classId === selectedClassId);
    if (enrollment?.teamId) { showNotification('Leave your current team first', 'error'); return; }
    try {
      await updateDoc(doc(db, 'teams', teamId), { members: [...team.members, currentUser.uid] });
      if (enrollment) await updateDoc(doc(db, 'enrollments', enrollment.id), { teamId });
      showNotification(`Joined team ${team.name}!`);
    } catch { showNotification('Failed to join team', 'error'); }
  };

  const leaveTeam = async () => {
    const enrollment = classEnrollments.find(e => e.userId === currentUser.uid && e.classId === selectedClassId);
    if (!enrollment?.teamId) return;
    try {
      const team = teams.find(t => t.id === enrollment.teamId);
      if (team) await updateDoc(doc(db, 'teams', team.id), { members: team.members.filter(m => m !== currentUser.uid) });
      await updateDoc(doc(db, 'enrollments', enrollment.id), { teamId: null });
      showNotification('Left team');
    } catch { showNotification('Failed to leave team', 'error'); }
  };

  // DELETE FUNCTIONS (Instructor Only)
  const deleteStudentFromClass = async (userId) => {
    try {
      const enrollment = classEnrollments.find(e => e.userId === userId && e.classId === selectedClassId);
      if (enrollment) {
        // Remove from team if in one
        const team = teams.find(t => t.id === enrollment.teamId);
        if (team) {
          await updateDoc(doc(db, 'teams', team.id), { members: team.members.filter(m => m !== userId) });
        }
        // Delete enrollment
        await deleteDoc(doc(db, 'enrollments', enrollment.id));
        showNotification('Student removed from class');
      }
    } catch { showNotification('Failed to remove student', 'error'); }
    setConfirmDelete(null);
  };

  const deleteTeam = async (teamId) => {
    try {
      // Remove team from all enrollments
      const batch = writeBatch(db);
      classEnrollments.filter(e => e.teamId === teamId).forEach(e => {
        batch.update(doc(db, 'enrollments', e.id), { teamId: null });
      });
      batch.delete(doc(db, 'teams', teamId));
      await batch.commit();
      showNotification('Team deleted');
    } catch { showNotification('Failed to delete team', 'error'); }
    setConfirmDelete(null);
  };

  const deleteProject = async (projectId) => {
    try {
      const batch = writeBatch(db);
      // Delete all peer evaluations for this project
      peerEvaluations.filter(e => e.projectId === projectId).forEach(e => {
        batch.delete(doc(db, 'peerEvaluations', e.id));
      });
      // Delete all team rankings for this project
      teamRankings.filter(r => r.projectId === projectId).forEach(r => {
        batch.delete(doc(db, 'teamRankings', r.id));
      });
      // Delete the project
      batch.delete(doc(db, 'projects', projectId));
      await batch.commit();
      if (selectedProject === projectId) setSelectedProject(null);
      showNotification('Project and all evaluations deleted');
    } catch { showNotification('Failed to delete project', 'error'); }
    setConfirmDelete(null);
  };

  const deleteAttendanceRecord = async (recordId) => {
    try {
      await deleteDoc(doc(db, 'attendanceRecords', recordId));
      showNotification('Attendance record deleted');
    } catch { showNotification('Failed to delete record', 'error'); }
    setConfirmDelete(null);
  };

  const clearAllEvaluations = async (projectId) => {
    try {
      const batch = writeBatch(db);
      peerEvaluations.filter(e => e.projectId === projectId).forEach(e => {
        batch.delete(doc(db, 'peerEvaluations', e.id));
      });
      teamRankings.filter(r => r.projectId === projectId).forEach(r => {
        batch.delete(doc(db, 'teamRankings', r.id));
      });
      await batch.commit();
      showNotification('All evaluations cleared');
    } catch { showNotification('Failed to clear evaluations', 'error'); }
    setConfirmDelete(null);
  };

  // Attendance
  const generateAttendanceCode = async () => {
    if (!selectedClassId) return;
    try {
      const code = generateCode();
      const newCode = { id: generateId(), code, classId: selectedClassId, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + codeExpiryMinutes * 60 * 1000).toISOString() };
      await setDoc(doc(db, 'attendanceCodes', newCode.id), newCode);
      showNotification(`Attendance code: ${code}`);
    } catch { showNotification('Failed to generate code', 'error'); }
  };

  const submitAttendance = async () => {
    if (!selectedClassId || !attendanceInput.trim()) { showNotification('Please enter a code', 'error'); return; }
    const code = attendanceCodes.find(c => c.code === attendanceInput.toUpperCase() && c.classId === selectedClassId && new Date(c.expiresAt) > new Date());
    if (!code) { showNotification('Invalid or expired code', 'error'); return; }
    const today = new Date().toDateString();
    if (attendanceRecords.find(r => r.userId === currentUser.uid && r.classId === selectedClassId && new Date(r.timestamp).toDateString() === today)) {
      showNotification('Already marked today', 'error'); return;
    }
    try {
      const record = { id: generateId(), userId: currentUser.uid, classId: selectedClassId, code: code.code, timestamp: new Date().toISOString() };
      await setDoc(doc(db, 'attendanceRecords', record.id), record);
      setAttendanceInput('');
      showNotification('Attendance marked!');
    } catch { showNotification('Failed to mark attendance', 'error'); }
  };

  // Projects
  const createProject = async () => {
    if (!newProjectName.trim() || !selectedClassId) return;
    try {
      const newProject = { id: generateId(), name: newProjectName, classId: selectedClassId, createdAt: new Date().toISOString() };
      await setDoc(doc(db, 'projects', newProject.id), newProject);
      setNewProjectName('');
      showNotification('Project created!');
    } catch { showNotification('Failed to create project', 'error'); }
  };

  // Evaluations
  const selectProjectForPeerEval = (projectId) => {
    const myTeam = getMyTeam();
    if (!myTeam) { setSelectedProject(projectId); setEvalFormData({}); return; }
    const teammates = myTeam.members.filter(m => m !== currentUser.uid);
    const existing = peerEvaluations.filter(e => e.projectId === projectId && e.evaluatorId === currentUser.uid);
    const data = {};
    teammates.forEach((mid, idx) => { const ex = existing.find(e => e.targetId === mid); data[mid] = { ranking: ex?.ranking || (idx + 1), score: ex?.score || 5 }; });
    setEvalFormData(data);
    setSelectedProject(projectId);
  };

  const selectProjectForTeamRanking = (projectId) => {
    const myTeam = getMyTeam();
    const others = getClassTeams().filter(t => t.id !== myTeam?.id);
    const existing = teamRankings.filter(r => r.projectId === projectId && r.evaluatorId === currentUser.uid);
    const data = {};
    others.forEach((team, idx) => { const ex = existing.find(r => r.targetTeamId === team.id); data[team.id] = { ranking: ex?.ranking || (idx + 1), presentation: ex?.presentation || 5, content: ex?.content || 5, creativity: ex?.creativity || 5 }; });
    setTeamEvalFormData(data);
    setSelectedProject(projectId);
  };

  const submitPeerEvaluation = async () => {
    if (!selectedProject) return;
    const entries = Object.entries(evalFormData);
    if (entries.length === 0) { showNotification('No teammates to evaluate', 'error'); return; }
    try {
      const batch = writeBatch(db);
      peerEvaluations.filter(e => e.projectId === selectedProject && e.evaluatorId === currentUser.uid).forEach(e => batch.delete(doc(db, 'peerEvaluations', e.id)));
      entries.forEach(([targetId, data]) => {
        const evalDoc = { id: generateId(), projectId: selectedProject, classId: selectedClassId, evaluatorId: currentUser.uid, targetId, ranking: parseInt(data.ranking) || 1, score: parseInt(data.score) || 5, timestamp: new Date().toISOString() };
        batch.set(doc(db, 'peerEvaluations', evalDoc.id), evalDoc);
      });
      await batch.commit();
      showNotification('Peer evaluation submitted!');
    } catch { showNotification('Failed to submit evaluation', 'error'); }
  };

  const submitTeamRanking = async () => {
    if (!selectedProject) return;
    const entries = Object.entries(teamEvalFormData);
    if (entries.length === 0) { showNotification('No teams to rank', 'error'); return; }
    try {
      const batch = writeBatch(db);
      teamRankings.filter(r => r.projectId === selectedProject && r.evaluatorId === currentUser.uid).forEach(r => batch.delete(doc(db, 'teamRankings', r.id)));
      const enrollment = classEnrollments.find(e => e.userId === currentUser.uid && e.classId === selectedClassId);
      entries.forEach(([teamId, data]) => {
        const rankDoc = { id: generateId(), projectId: selectedProject, classId: selectedClassId, evaluatorId: currentUser.uid, evaluatorTeamId: enrollment?.teamId, targetTeamId: teamId, ranking: parseInt(data.ranking) || 1, presentation: parseInt(data.presentation) || 5, content: parseInt(data.content) || 5, creativity: parseInt(data.creativity) || 5, timestamp: new Date().toISOString() };
        batch.set(doc(db, 'teamRankings', rankDoc.id), rankDoc);
      });
      await batch.commit();
      showNotification('Team rankings submitted!');
    } catch { showNotification('Failed to submit rankings', 'error'); }
  };

  // Settings
  const updateCodeExpiry = async (mins) => { try { await updateDoc(doc(db, 'settings', 'global'), { codeExpiryMinutes: mins }); setCodeExpiryMinutes(mins); showNotification(`Expiration set to ${mins} min`); } catch { showNotification('Failed to update', 'error'); } };
  const updateRegistrationCode = async () => { if (newRegCode.length < 4) { showNotification('Code must be at least 4 characters', 'error'); return; } try { await updateDoc(doc(db, 'settings', 'global'), { registrationCode: newRegCode }); setRegistrationCode(newRegCode); setNewRegCode(''); showNotification('Registration code updated!'); } catch { showNotification('Failed to update', 'error'); } };

  // Helpers
  const getMyEnrollment = () => classEnrollments.find(e => e.userId === currentUser?.uid && e.classId === selectedClassId);
  const getMyTeam = () => teams.find(t => t.id === getMyEnrollment()?.teamId);
  const getClassTeams = () => teams.filter(t => t.classId === selectedClassId);
  const getClassProjects = () => projects.filter(p => p.classId === selectedClassId);
  const getClassStudents = () => classEnrollments.filter(e => e.classId === selectedClassId).map(e => users.find(u => u.id === e.userId)).filter(Boolean);
  const getUserTeam = (userId) => { const enrollment = classEnrollments.find(e => e.userId === userId && e.classId === selectedClassId); return teams.find(t => t.id === enrollment?.teamId); };

  const getAttendanceStats = () => {
    const classRecords = attendanceRecords.filter(r => r.classId === selectedClassId);
    const students = getClassStudents();
    const dates = [...new Set(classRecords.map(r => new Date(r.timestamp).toDateString()))];
    return { total: dates.length, students: students.map(s => ({ ...s, attended: classRecords.filter(r => r.userId === s.id).length, rate: dates.length ? Math.round(classRecords.filter(r => r.userId === s.id).length / dates.length * 100) : 0 }))};
  };

  const getAttendanceDetails = () => {
    return attendanceRecords.filter(r => r.classId === selectedClassId).map(r => {
      const student = users.find(u => u.id === r.userId);
      return { ...r, studentName: student?.name || 'Unknown', studentEmail: student?.email || '' };
    }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  };

  const getPeerEvalResults = (projectId) => {
    const evals = peerEvaluations.filter(e => e.projectId === projectId);
    return getClassStudents().map(s => {
      const received = evals.filter(e => e.targetId === s.id);
      return { ...s, team: getUserTeam(s.id)?.name || 'No team', evalCount: received.length, avgRanking: received.length ? (received.reduce((a, e) => a + e.ranking, 0) / received.length).toFixed(1) : '-', avgScore: received.length ? (received.reduce((a, e) => a + e.score, 0) / received.length).toFixed(1) : '-' };
    }).sort((a, b) => (parseFloat(a.avgRanking) || 99) - (parseFloat(b.avgRanking) || 99));
  };

  const getTeamRankingResults = (projectId) => {
    const rankings = teamRankings.filter(r => r.projectId === projectId);
    return getClassTeams().map(t => {
      const received = rankings.filter(r => r.targetTeamId === t.id);
      return { ...t, evalCount: received.length, avgRanking: received.length ? (received.reduce((a, r) => a + r.ranking, 0) / received.length).toFixed(1) : '-', avgPresentation: received.length ? (received.reduce((a, r) => a + r.presentation, 0) / received.length).toFixed(1) : '-', avgContent: received.length ? (received.reduce((a, r) => a + r.content, 0) / received.length).toFixed(1) : '-', avgCreativity: received.length ? (received.reduce((a, r) => a + r.creativity, 0) / received.length).toFixed(1) : '-' };
    }).sort((a, b) => (parseFloat(a.avgRanking) || 99) - (parseFloat(b.avgRanking) || 99));
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="text-amber-400 text-xl">Loading...</div></div>;

  const cardStyle = "bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-6 shadow-xl";
  const inputStyle = "w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500";
  const btnStyle = "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-900 font-semibold px-6 py-3 rounded-xl transition-all cursor-pointer disabled:opacity-50";
  const btnSecondary = "bg-slate-700 hover:bg-slate-600 text-slate-100 px-4 py-2 rounded-xl transition cursor-pointer";
  const btnDanger = "bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-2 rounded-xl transition border border-red-500/30 cursor-pointer";
  const btnDangerSmall = "bg-red-500/20 hover:bg-red-500/30 text-red-400 px-2 py-1 rounded-lg transition border border-red-500/30 cursor-pointer text-xs";
  const tabStyle = (active) => `px-4 py-2 rounded-lg transition font-medium cursor-pointer ${active ? 'bg-amber-500 text-slate-900' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'}`;

  // Confirmation Modal
  const ConfirmModal = () => {
    if (!confirmDelete) return null;
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className={`${cardStyle} max-w-md w-full`}>
          <h3 className="font-semibold text-lg mb-2 text-red-400">Confirm Delete</h3>
          <p className="text-slate-300 mb-6">{confirmDelete.message}</p>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setConfirmDelete(null)} className={btnSecondary}>Cancel</button>
            <button onClick={confirmDelete.action} className={btnDanger}>Delete</button>
          </div>
        </div>
      </div>
    );
  };

  // Login View
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-6 shadow-xl w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl mb-4">
              <svg className="w-8 h-8 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            </div>
            <h1 className="text-2xl font-bold">ClassHub</h1>
            <p className="text-slate-400 mt-1">Attendance & Peer Evaluation</p>
            <p className="text-xs text-emerald-400 mt-2">🔒 Secured with Firebase Auth</p>
          </div>
          {notification && <div className={`mb-4 p-3 rounded-xl text-sm ${notification.type === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>{notification.message}</div>}
          {view === 'login' ? (
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-slate-400 mb-2">Email</label><input type="email" className={inputStyle} placeholder="your@email.com" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} disabled={authLoading} /></div>
              <div><label className="block text-sm font-medium text-slate-400 mb-2">Password</label><input type="password" className={inputStyle} placeholder="••••••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} disabled={authLoading} /></div>
              <button onClick={handleLogin} className={`${btnStyle} w-full`} disabled={authLoading}>{authLoading ? 'Signing in...' : 'Sign In'}</button>
              <p className="text-center text-slate-400 text-sm">Don't have an account? <span onClick={() => setView('register')} className="text-amber-400 hover:text-amber-300 cursor-pointer">Register</span></p>
            </div>
          ) : (
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-slate-400 mb-2">Full Name</label><input type="text" className={inputStyle} placeholder="John Doe" value={registerName} onChange={e => setRegisterName(e.target.value)} disabled={authLoading} /></div>
              <div><label className="block text-sm font-medium text-slate-400 mb-2">Email</label><input type="email" className={inputStyle} placeholder="you@email.com" value={registerEmail} onChange={e => setRegisterEmail(e.target.value)} disabled={authLoading} /></div>
              <div><label className="block text-sm font-medium text-slate-400 mb-2">Password (min 6 chars)</label><input type="password" className={inputStyle} placeholder="••••••••" value={registerPassword} onChange={e => setRegisterPassword(e.target.value)} disabled={authLoading} /></div>
              <div><label className="block text-sm font-medium text-slate-400 mb-2">Registration Code</label><input type="text" className={inputStyle} placeholder="Code from instructor" value={regCodeInput} onChange={e => setRegCodeInput(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && handleRegister()} maxLength={6} disabled={authLoading} /></div>
              <button onClick={handleRegister} className={`${btnStyle} w-full`} disabled={authLoading}>{authLoading ? 'Creating account...' : 'Create Account'}</button>
              <p className="text-center text-slate-400 text-sm">Already have an account? <span onClick={() => setView('login')} className="text-amber-400 hover:text-amber-300 cursor-pointer">Sign In</span></p>
            </div>
          )}
          <p className="text-center text-slate-600 text-xs mt-6">© 2026 <a href="https://robinchen.org" target="_blank" rel="noopener noreferrer" className="hover:text-slate-400">Zhengyang Chen</a> • University of Northern Iowa</p>
        </div>
      </div>
    );
  }

  const isAdmin = userProfile?.role === 'admin';
  const myClasses = isAdmin ? classes : classes.filter(c => classEnrollments.some(e => e.userId === currentUser?.uid && e.classId === c.id));
  const selectedClass = classes.find(c => c.id === selectedClassId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <ConfirmModal />
      {notification && <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg ${notification.type === 'error' ? 'bg-red-500/90' : 'bg-emerald-500/90'} text-white`}>{notification.message}</div>}
      <header className="bg-slate-900/80 backdrop-blur border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            </div>
            <div><h1 className="font-bold text-lg">ClassHub</h1><p className="text-xs text-slate-500">{isAdmin ? 'Instructor' : 'Student'} Portal</p></div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-slate-400 text-sm hidden sm:inline">{userProfile?.name || currentUser?.email}</span>
            <button onClick={handleLogout} className="text-slate-400 hover:text-slate-200 text-sm">Logout</button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {!selectedClassId ? (
          <div className="space-y-8">
            <div className="text-center py-8"><h2 className="text-3xl font-bold mb-2">Select a Class</h2><p className="text-slate-400">{isAdmin ? 'Manage your classes or create a new one' : 'Join a class or select an existing one'}</p></div>
            <div className={`${cardStyle} max-w-xl mx-auto`}>
              {isAdmin ? (
                <div><h3 className="font-semibold mb-4">Create New Class</h3><div className="flex gap-3"><input type="text" className={inputStyle} placeholder="e.g., ECON3371 Forecasting" value={newClassName} onChange={e => setNewClassName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createClass()} /><button onClick={createClass} className={btnStyle}>Create</button></div></div>
              ) : (
                <div><h3 className="font-semibold mb-4">Join a Class</h3><div className="flex gap-3"><input type="text" className={inputStyle} placeholder="Enter class code" value={joinClassCode} onChange={e => setJoinClassCode(e.target.value.toUpperCase())} maxLength={6} onKeyDown={e => e.key === 'Enter' && joinClass()} /><button onClick={joinClass} className={btnStyle}>Join</button></div></div>
              )}
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myClasses.filter(c => !c.archived).map(cls => (
                <div key={cls.id} className={`${cardStyle} cursor-pointer hover:border-amber-500/50 transition`} onClick={() => selectClass(cls.id)}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-xl flex items-center justify-center"><span className="text-amber-400 font-bold text-lg">{cls.name.charAt(0)}</span></div>
                    {isAdmin && <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded-lg font-mono">{cls.joinCode}</span>}
                  </div>
                  <h3 className="font-semibold mb-1">{cls.name}</h3>
                  <p className="text-sm text-slate-500">{classEnrollments.filter(e => e.classId === cls.id).length} students • {teams.filter(t => t.classId === cls.id).length} teams</p>
                </div>
              ))}
            </div>
            {myClasses.filter(c => !c.archived).length === 0 && <div className="text-center py-12"><p className="text-slate-500">{isAdmin ? 'No classes yet. Create your first class above!' : 'No classes yet. Join using the code from your instructor.'}</p></div>}
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <button onClick={deselectClass} className="text-slate-400 hover:text-slate-200"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
                <div><h2 className="text-2xl font-bold">{selectedClass?.name}</h2>{isAdmin && <p className="text-sm text-slate-500 font-mono">Join Code: {selectedClass?.joinCode}</p>}</div>
              </div>
              {isAdmin && <button onClick={() => archiveClass(selectedClassId)} className={btnDanger}>Archive</button>}
            </div>
            <div className="flex gap-2 mb-6 flex-wrap">
              {isAdmin ? (<><button onClick={() => setActiveTab('dashboard')} className={tabStyle(activeTab === 'dashboard')}>Dashboard</button><button onClick={() => setActiveTab('attendance')} className={tabStyle(activeTab === 'attendance')}>Attendance</button><button onClick={() => setActiveTab('students')} className={tabStyle(activeTab === 'students')}>Students</button><button onClick={() => setActiveTab('teams')} className={tabStyle(activeTab === 'teams')}>Teams</button><button onClick={() => setActiveTab('projects')} className={tabStyle(activeTab === 'projects')}>Projects</button><button onClick={() => setActiveTab('evaluations')} className={tabStyle(activeTab === 'evaluations')}>Evaluations</button><button onClick={() => setActiveTab('settings')} className={tabStyle(activeTab === 'settings')}>Settings</button></>) : (<><button onClick={() => setActiveTab('dashboard')} className={tabStyle(activeTab === 'dashboard')}>Dashboard</button><button onClick={() => setActiveTab('attendance')} className={tabStyle(activeTab === 'attendance')}>Attendance</button><button onClick={() => setActiveTab('team')} className={tabStyle(activeTab === 'team')}>My Team</button><button onClick={() => setActiveTab('peer-eval')} className={tabStyle(activeTab === 'peer-eval')}>Peer Eval</button><button onClick={() => setActiveTab('team-eval')} className={tabStyle(activeTab === 'team-eval')}>Team Rankings</button></>)}
            </div>

            {activeTab === 'dashboard' && <div className="grid md:grid-cols-4 gap-4"><div className={cardStyle}><p className="text-slate-400 text-sm mb-1">{isAdmin ? 'Students' : 'My Team'}</p><p className="text-3xl font-bold">{isAdmin ? getClassStudents().length : (getMyTeam()?.name || 'None')}</p></div><div className={cardStyle}><p className="text-slate-400 text-sm mb-1">Teams</p><p className="text-3xl font-bold">{getClassTeams().length}</p></div><div className={cardStyle}><p className="text-slate-400 text-sm mb-1">Projects</p><p className="text-3xl font-bold">{getClassProjects().length}</p></div><div className={cardStyle}><p className="text-slate-400 text-sm mb-1">Attendance</p><p className="text-3xl font-bold">{isAdmin ? [...new Set(attendanceRecords.filter(r => r.classId === selectedClassId).map(r => new Date(r.timestamp).toDateString()))].length : attendanceRecords.filter(r => r.userId === currentUser.uid && r.classId === selectedClassId).length}</p></div></div>}

            {isAdmin && activeTab === 'attendance' && <div className="space-y-6"><div className={cardStyle}><h3 className="font-semibold mb-4">Generate Attendance Code</h3><button onClick={generateAttendanceCode} className={btnStyle}>Generate Code ({codeExpiryMinutes} min)</button>{attendanceCodes.filter(c => c.classId === selectedClassId && new Date(c.expiresAt) > new Date()).map(c => <div key={c.id} className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl"><p className="text-emerald-400 font-mono text-3xl">{c.code}</p><p className="text-sm text-slate-400 mt-1">Expires: {formatDate(c.expiresAt)}</p></div>)}</div><div className={cardStyle}><h3 className="font-semibold mb-4">Attendance Summary</h3>{getAttendanceStats().students.length > 0 ? <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="text-slate-400 text-sm border-b border-slate-700"><th className="pb-3">Student</th><th className="pb-3">Team</th><th className="pb-3">Attended</th><th className="pb-3">Rate</th></tr></thead><tbody>{getAttendanceStats().students.map(s => <tr key={s.id} className="border-b border-slate-800"><td className="py-3">{s.name}</td><td className="py-3 text-slate-400">{getUserTeam(s.id)?.name || '-'}</td><td className="py-3">{s.attended}/{getAttendanceStats().total}</td><td className="py-3"><span className={`px-2 py-1 rounded text-sm ${s.rate >= 80 ? 'bg-emerald-500/20 text-emerald-400' : s.rate >= 50 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>{s.rate}%</span></td></tr>)}</tbody></table></div> : <p className="text-slate-500 text-center py-4">No students enrolled</p>}</div><div className={cardStyle}><h3 className="font-semibold mb-4">All Attendance Records</h3>{getAttendanceDetails().length > 0 ? <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="text-slate-400 text-sm border-b border-slate-700"><th className="pb-3">Student</th><th className="pb-3">Date/Time</th><th className="pb-3">Code</th><th className="pb-3">Action</th></tr></thead><tbody>{getAttendanceDetails().map(r => <tr key={r.id} className="border-b border-slate-800"><td className="py-3">{r.studentName}</td><td className="py-3 text-slate-400">{formatDate(r.timestamp)}</td><td className="py-3 font-mono text-xs">{r.code}</td><td className="py-3"><button onClick={() => setConfirmDelete({ message: `Delete attendance record for ${r.studentName} on ${formatDate(r.timestamp)}?`, action: () => deleteAttendanceRecord(r.id) })} className={btnDangerSmall}>Delete</button></td></tr>)}</tbody></table></div> : <p className="text-slate-500 text-center py-4">No records yet</p>}</div></div>}

            {!isAdmin && activeTab === 'attendance' && <div className={cardStyle}><h3 className="font-semibold mb-4">Mark Attendance</h3><div className="flex gap-3 mb-6"><input type="text" className={inputStyle} placeholder="Enter code" value={attendanceInput} onChange={e => setAttendanceInput(e.target.value.toUpperCase())} maxLength={6} onKeyDown={e => e.key === 'Enter' && submitAttendance()} /><button onClick={submitAttendance} className={btnStyle}>Submit</button></div><h4 className="font-medium text-slate-300 mb-3">Your History</h4>{attendanceRecords.filter(r => r.userId === currentUser.uid && r.classId === selectedClassId).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).map(r => <div key={r.id} className="flex justify-between p-3 bg-slate-900/50 rounded-xl mb-2"><span>{formatDate(r.timestamp)}</span><span className="text-emerald-400">✓ Present</span></div>)}{attendanceRecords.filter(r => r.userId === currentUser.uid && r.classId === selectedClassId).length === 0 && <p className="text-slate-500 text-center py-4">No records yet</p>}</div>}

            {isAdmin && activeTab === 'students' && <div className={cardStyle}><h3 className="font-semibold mb-4">Students ({getClassStudents().length})</h3>{getClassStudents().length > 0 ? <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="text-slate-400 text-sm border-b border-slate-700"><th className="pb-3">Name</th><th className="pb-3">Email</th><th className="pb-3">Team</th><th className="pb-3">Action</th></tr></thead><tbody>{getClassStudents().map(s => <tr key={s.id} className="border-b border-slate-800"><td className="py-3">{s.name}</td><td className="py-3 text-slate-400">{s.email}</td><td className="py-3">{getUserTeam(s.id)?.name || '-'}</td><td className="py-3"><button onClick={() => setConfirmDelete({ message: `Remove ${s.name} from this class? Their attendance and evaluations will remain.`, action: () => deleteStudentFromClass(s.id) })} className={btnDangerSmall}>Remove</button></td></tr>)}</tbody></table></div> : <p className="text-slate-500 text-center py-4">Share code: <span className="font-mono text-amber-400">{selectedClass?.joinCode}</span></p>}</div>}

            {isAdmin && activeTab === 'teams' && (getClassTeams().length > 0 ? <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{getClassTeams().map(team => <div key={team.id} className={cardStyle}><div className="flex justify-between items-start mb-3"><h3 className="font-semibold">{team.name}</h3><button onClick={() => setConfirmDelete({ message: `Delete team "${team.name}"? Members will be removed from the team but stay in the class.`, action: () => deleteTeam(team.id) })} className={btnDangerSmall}>Delete</button></div><p className="text-sm text-slate-400 mb-3">{team.members.length} members</p>{team.members.map(mid => { const m = users.find(u => u.id === mid); return m ? <div key={mid} className="flex items-center gap-2 text-sm mb-1"><div className="w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center text-xs">{m.name?.charAt(0) || '?'}</div><span>{m.name || m.email}</span></div> : null; })}</div>)}</div> : <div className={cardStyle}><p className="text-slate-500 text-center py-4">No teams yet</p></div>)}

            {isAdmin && activeTab === 'projects' && <div className="space-y-6"><div className={cardStyle}><h3 className="font-semibold mb-4">Create Project</h3><div className="flex gap-3"><input type="text" className={inputStyle} placeholder="e.g., Midterm Presentation" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createProject()} /><button onClick={createProject} className={btnStyle}>Create</button></div></div>{getClassProjects().length > 0 ? <div className="grid md:grid-cols-2 gap-4">{getClassProjects().map(p => <div key={p.id} className={cardStyle}><div className="flex justify-between items-start mb-2"><h3 className="font-semibold">{p.name}</h3><button onClick={() => setConfirmDelete({ message: `Delete project "${p.name}" and ALL its evaluations? This cannot be undone.`, action: () => deleteProject(p.id) })} className={btnDangerSmall}>Delete</button></div><p className="text-sm text-slate-400">{peerEvaluations.filter(e => e.projectId === p.id).length} peer evals • {teamRankings.filter(r => r.projectId === p.id).length} team rankings</p></div>)}</div> : <div className={cardStyle}><p className="text-slate-500 text-center py-4">Create projects like "Midterm Presentation"</p></div>}</div>}

            {isAdmin && activeTab === 'evaluations' && <div className="space-y-6">{getClassProjects().length > 0 ? <><div className="flex gap-3 flex-wrap">{getClassProjects().map(p => <button key={p.id} onClick={() => setSelectedProject(p.id)} className={tabStyle(selectedProject === p.id)}>{p.name}</button>)}</div>{selectedProject && <><div className={cardStyle}><div className="flex justify-between items-center mb-4"><h3 className="font-semibold">Peer Evaluation Results</h3><button onClick={() => setConfirmDelete({ message: `Clear ALL peer evaluations and team rankings for this project? This cannot be undone.`, action: () => clearAllEvaluations(selectedProject) })} className={btnDangerSmall}>Clear All Evaluations</button></div>{getPeerEvalResults(selectedProject).some(s => s.evalCount > 0) ? <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="text-slate-400 text-sm border-b border-slate-700"><th className="pb-3">#</th><th className="pb-3">Student</th><th className="pb-3">Team</th><th className="pb-3">Avg Rank</th><th className="pb-3">Avg Score</th></tr></thead><tbody>{getPeerEvalResults(selectedProject).map((s, i) => <tr key={s.id} className="border-b border-slate-800"><td className="py-3"><span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${i === 0 ? 'bg-amber-500 text-slate-900' : 'bg-slate-700'}`}>{i + 1}</span></td><td className="py-3">{s.name}</td><td className="py-3 text-slate-400">{s.team}</td><td className="py-3">{s.avgRanking}</td><td className="py-3">{s.avgScore}/10</td></tr>)}</tbody></table></div> : <p className="text-slate-500 text-center py-4">No evaluations yet</p>}</div><div className={cardStyle}><h3 className="font-semibold mb-4">Team Ranking Results</h3>{getTeamRankingResults(selectedProject).some(t => t.evalCount > 0) ? <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="text-slate-400 text-sm border-b border-slate-700"><th className="pb-3">#</th><th className="pb-3">Team</th><th className="pb-3">Rank</th><th className="pb-3">Present</th><th className="pb-3">Content</th><th className="pb-3">Creative</th></tr></thead><tbody>{getTeamRankingResults(selectedProject).map((t, i) => <tr key={t.id} className="border-b border-slate-800"><td className="py-3"><span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${i === 0 ? 'bg-amber-500 text-slate-900' : 'bg-slate-700'}`}>{i + 1}</span></td><td className="py-3">{t.name}</td><td className="py-3">{t.avgRanking}</td><td className="py-3">{t.avgPresentation}</td><td className="py-3">{t.avgContent}</td><td className="py-3">{t.avgCreativity}</td></tr>)}</tbody></table></div> : <p className="text-slate-500 text-center py-4">No rankings yet</p>}</div></>}</> : <div className={cardStyle}><p className="text-slate-500 text-center py-4">Create projects first</p></div>}</div>}

            {isAdmin && activeTab === 'settings' && <div className="space-y-6"><div className={cardStyle}><h3 className="font-semibold mb-4">Attendance Code Expiration</h3><select className={`${inputStyle} max-w-xs`} value={codeExpiryMinutes} onChange={e => updateCodeExpiry(parseInt(e.target.value))}><option value={2}>2 minutes</option><option value={3}>3 minutes</option><option value={5}>5 minutes</option><option value={10}>10 minutes</option><option value={15}>15 minutes</option><option value={30}>30 minutes</option><option value={60}>1 hour</option></select></div><div className={cardStyle}><h3 className="font-semibold mb-4">Registration Code</h3><p className="text-slate-400 text-sm mb-4">Students need this to register.</p><div className="bg-slate-900/50 rounded-xl p-4 mb-4"><p className="text-xs text-slate-500 mb-1">Current Code</p><p className="text-amber-400 font-mono text-2xl">{registrationCode}</p></div><div className="flex gap-3"><input type="text" className={inputStyle} placeholder="New code" value={newRegCode} onChange={e => setNewRegCode(e.target.value.toUpperCase())} maxLength={6} /><button onClick={updateRegistrationCode} className={btnStyle}>Update</button></div></div><div className={cardStyle}><h3 className="font-semibold mb-4">Share with Students</h3><div className="bg-slate-900/50 rounded-xl p-4 text-sm space-y-2"><p><span className="text-slate-500">1. Website:</span> <span className="text-slate-300">(share this page URL)</span></p><p><span className="text-slate-500">2. Registration Code:</span> <span className="text-amber-400 font-mono">{registrationCode}</span></p><p><span className="text-slate-500">3. Class Join Code:</span> <span className="text-amber-400 font-mono">{selectedClass?.joinCode}</span></p></div></div></div>}

            {!isAdmin && activeTab === 'team' && (getMyTeam() ? <div className={cardStyle}><div className="flex justify-between items-start mb-4"><h3 className="font-semibold text-xl">{getMyTeam().name}</h3><button onClick={leaveTeam} className={btnDanger}>Leave Team</button></div><p className="text-slate-400 mb-4">{getMyTeam().members.length} members</p>{getMyTeam().members.map(mid => { const m = users.find(u => u.id === mid); return m ? <div key={mid} className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-xl mb-2"><div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center"><span className="text-amber-400 font-semibold">{m.name?.charAt(0) || '?'}</span></div><div><p className="font-medium">{m.name || 'Unknown'}</p><p className="text-slate-500 text-sm">{m.email}</p></div>{mid === currentUser.uid && <span className="ml-auto text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded">You</span>}</div> : null; })}</div> : <div className="space-y-6"><div className={cardStyle}><h3 className="font-semibold mb-4">Create a New Team</h3><div className="flex gap-3"><input type="text" className={inputStyle} placeholder="Team name" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createTeam()} /><button onClick={createTeam} className={btnStyle}>Create</button></div></div>{getClassTeams().length > 0 && <div className={cardStyle}><h3 className="font-semibold mb-4">Or Join Existing</h3><div className="grid md:grid-cols-2 gap-3">{getClassTeams().map(t => <div key={t.id} className="p-4 bg-slate-900/50 rounded-xl flex justify-between items-center"><div><p className="font-medium">{t.name}</p><p className="text-sm text-slate-500">{t.members.length} members</p></div><button onClick={() => joinTeam(t.id)} className={btnSecondary}>Join</button></div>)}</div></div>}</div>)}

            {!isAdmin && activeTab === 'peer-eval' && (getClassProjects().length > 0 ? <div className="space-y-6"><div className="flex gap-3 flex-wrap">{getClassProjects().map(p => <button key={p.id} onClick={() => selectProjectForPeerEval(p.id)} className={tabStyle(selectedProject === p.id)}>{p.name}{peerEvaluations.some(e => e.projectId === p.id && e.evaluatorId === currentUser.uid) && ' ✓'}</button>)}</div>{selectedProject && getMyTeam() && (() => { const teammates = getMyTeam().members.filter(m => m !== currentUser.uid); return <div className={cardStyle}><h3 className="font-semibold mb-2">Evaluate Teammates</h3><div className="bg-slate-900/30 rounded-xl p-4 mb-6 text-sm"><p className="text-slate-300 font-medium mb-2">How to evaluate:</p><ul className="text-slate-400 space-y-1"><li><span className="text-amber-400">Rank:</span> Order by contribution (1 = most)</li><li><span className="text-amber-400">Score:</span> Rate contribution 1-10</li></ul><p className="text-slate-500 mt-2 text-xs">Evaluations are anonymous.</p></div>{teammates.length > 0 ? <>{teammates.map((mid, idx) => { const m = users.find(u => u.id === mid); const fd = evalFormData[mid] || { ranking: idx + 1, score: 5 }; return m ? <div key={mid} className="p-4 bg-slate-900/50 rounded-xl mb-4"><div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center"><span>{m.name?.charAt(0) || '?'}</span></div><p className="font-medium">{m.name || 'Unknown'}</p></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm text-slate-400 mb-2">Rank (1=best)</label><select className={inputStyle} value={fd.ranking} onChange={e => setEvalFormData({...evalFormData, [mid]: {...fd, ranking: parseInt(e.target.value)}})}>{teammates.map((_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select></div><div><label className="block text-sm text-slate-400 mb-2">Score: {fd.score}/10</label><input type="range" min="1" max="10" className="w-full accent-amber-500" value={fd.score} onChange={e => setEvalFormData({...evalFormData, [mid]: {...fd, score: parseInt(e.target.value)}})} /></div></div></div> : null; })}<button onClick={submitPeerEvaluation} className={btnStyle}>Submit Evaluation</button></> : <p className="text-slate-500 text-center py-4">No teammates to evaluate</p>}</div>; })()}{selectedProject && !getMyTeam() && <div className={cardStyle}><p className="text-slate-400 text-center py-8">Join a team first</p></div>}</div> : <div className={cardStyle}><p className="text-slate-500 text-center py-4">No projects yet</p></div>)}

            {!isAdmin && activeTab === 'team-eval' && (getClassProjects().length > 0 ? <div className="space-y-6"><div className="flex gap-3 flex-wrap">{getClassProjects().map(p => <button key={p.id} onClick={() => selectProjectForTeamRanking(p.id)} className={tabStyle(selectedProject === p.id)}>{p.name}{teamRankings.some(r => r.projectId === p.id && r.evaluatorId === currentUser.uid) && ' ✓'}</button>)}</div>{selectedProject && (() => { const others = getClassTeams().filter(t => t.id !== getMyTeam()?.id); return <div className={cardStyle}><h3 className="font-semibold mb-2">Rank Other Teams</h3><div className="bg-slate-900/30 rounded-xl p-4 mb-6 text-sm"><p className="text-slate-300 font-medium mb-2">Criteria:</p><ul className="text-slate-400 space-y-1"><li><span className="text-amber-400">Rank:</span> Order by performance (1 = best)</li><li><span className="text-amber-400">Presentation/Content/Creativity:</span> Rate 1-10</li></ul><p className="text-slate-500 mt-2 text-xs">Rankings are anonymous.</p></div>{others.length > 0 ? <>{others.map((t, idx) => { const fd = teamEvalFormData[t.id] || { ranking: idx + 1, presentation: 5, content: 5, creativity: 5 }; return <div key={t.id} className="p-4 bg-slate-900/50 rounded-xl mb-4"><div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center"><span className="text-amber-400">{t.name.charAt(0)}</span></div><div><p className="font-medium">{t.name}</p><p className="text-sm text-slate-500">{t.members.length} members</p></div></div><div className="grid grid-cols-2 md:grid-cols-4 gap-4"><div><label className="block text-sm text-slate-400 mb-2">Rank</label><select className={inputStyle} value={fd.ranking} onChange={e => setTeamEvalFormData({...teamEvalFormData, [t.id]: {...fd, ranking: parseInt(e.target.value)}})}>{others.map((_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select></div><div><label className="block text-sm text-slate-400 mb-2">Present: {fd.presentation}</label><input type="range" min="1" max="10" className="w-full accent-amber-500" value={fd.presentation} onChange={e => setTeamEvalFormData({...teamEvalFormData, [t.id]: {...fd, presentation: parseInt(e.target.value)}})} /></div><div><label className="block text-sm text-slate-400 mb-2">Content: {fd.content}</label><input type="range" min="1" max="10" className="w-full accent-amber-500" value={fd.content} onChange={e => setTeamEvalFormData({...teamEvalFormData, [t.id]: {...fd, content: parseInt(e.target.value)}})} /></div><div><label className="block text-sm text-slate-400 mb-2">Creative: {fd.creativity}</label><input type="range" min="1" max="10" className="w-full accent-amber-500" value={fd.creativity} onChange={e => setTeamEvalFormData({...teamEvalFormData, [t.id]: {...fd, creativity: parseInt(e.target.value)}})} /></div></div></div>; })}<button onClick={submitTeamRanking} className={btnStyle}>Submit Rankings</button></> : <p className="text-slate-500 text-center py-4">No other teams</p>}</div>; })()}</div> : <div className={cardStyle}><p className="text-slate-500 text-center py-4">No projects yet</p></div>)}
          </div>
        )}
      </div>
      
      {/* Footer */}
      <footer className="bg-slate-900/50 border-t border-slate-800 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-xs">
          <p>© 2026 <a href="https://robinchen.org" target="_blank" rel="noopener noreferrer" className="hover:text-slate-400">Zhengyang Chen</a> • Economics Department, Wilson College of Business, University of Northern Iowa</p>
        </div>
      </footer>
    </div>
  );
}
