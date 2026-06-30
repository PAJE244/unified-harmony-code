import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Terminal, Shield, User, Lock, LogOut, Search, Plus,
  Edit2, Trash2, UserPlus, Users, Activity, FileCode,
  AlertTriangle, RefreshCw, Eye, EyeOff, UserCheck,
  UserX, X, ChevronRight, Menu, HelpCircle, Key, CheckCircle, Settings, Smartphone,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { apiFetch, subscribeRealtime, getSiteSettings, updateSiteSettings, DEFAULT_SETTINGS } from "@/lib/scriptando-db";
import type { PublicUser as UserType, DbScript as ScriptType, DbLog as ActionLogType, SiteSettings } from "@/lib/scriptando-db";
import PlatformCard from "@/components/scripts/PlatformCard";
import ScriptDetailModal from "@/components/scripts/ScriptDetailModal";
import PlatformsAdmin from "@/components/admin/PlatformsAdmin";
import tut1 from "@/assets/tutorial/tutorial-1.jpg.asset.json";
import tut2 from "@/assets/tutorial/tutorial-2.jpg.asset.json";
import tut3 from "@/assets/tutorial/tutorial-3.jpg.asset.json";
import tut4 from "@/assets/tutorial/tutorial-4.jpg.asset.json";
import tut5 from "@/assets/tutorial/tutorial-5.jpg.asset.json";
import tut6 from "@/assets/tutorial/tutorial-6.jpg.asset.json";
import tut7 from "@/assets/tutorial/tutorial-7.jpg.asset.json";
import tut8 from "@/assets/tutorial/tutorial-8.jpg.asset.json";

const MOBILE_TUTORIAL_STEPS = [
  { img: tut1.url, title: "Copie o script", desc: 'Acesse o Scriptando e toque em "Copiar Script" da plataforma desejada.' },
  { img: tut2.url, title: "Adicione aos favoritos", desc: "Abra o menu do navegador e toque na estrela para salvar o site nos favoritos." },
  { img: tut3.url, title: "Abra seus favoritos", desc: 'Toque em "Favoritos" para visualizar a lista de sites salvos.' },
  { img: tut4.url, title: "Edite o favorito", desc: 'Toque nos três pontos ao lado do favorito recém criado e selecione "Editar".' },
  { img: tut5.url, title: "Renomeie (opcional)", desc: "Altere o nome do favorito para algo fácil de identificar depois." },
  { img: tut6.url, title: "Cole o script na URL", desc: "Apague a URL existente e cole o script copiado no campo de endereço. Salve." },
  { img: tut7.url, title: "Abra a plataforma", desc: "Acesse normalmente a plataforma escolar onde deseja executar o script." },
  { img: tut8.url, title: "Execute o favorito", desc: "Toque no favorito que você criou e veja a automação acontecer instantaneamente." },
];

interface ToastType { id: string; message: string; type: "success" | "error" | "info" | "warning"; }

export default function PlatformApp() {
  // Authentication & State
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => { setToken(localStorage.getItem("scriptando_token")); }, []);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [view, setView] = useState<"login" | "dashboard" | "admin" | "tutorial">("login");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  
  // Realtime Data
  const [scripts, setScripts] = useState<ScriptType[]>([]);
  const [stats, setStats] = useState({ onlineCount: 1, totalCount: 1 });
  const [logs, setLogs] = useState<ActionLogType[]>([]);
  const [usersList, setUsersList] = useState<UserType[]>([]);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  
  // Login Form
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);
  const [openedScript, setOpenedScript] = useState<ScriptType | null>(null);

  // Administrative Modals & Forms
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserUsername, setNewUserUsername] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [addUserError, setAddUserError] = useState<string | null>(null);

  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [editUserUsername, setEditUserUsername] = useState("");
  const [editUserPassword, setEditUserPassword] = useState("");
  const [editUserStatus, setEditUserStatus] = useState<"active" | "banned">("active");
  const [editUserError, setEditUserError] = useState<string | null>(null);

  const [showAddScriptModal, setShowAddScriptModal] = useState(false);
  const [newScriptTitle, setNewScriptTitle] = useState("");
  const [newScriptContent, setNewScriptContent] = useState("");
  const [newScriptDesc, setNewScriptDesc] = useState("");
  const [addScriptError, setAddScriptError] = useState<string | null>(null);

  const [editingScript, setEditingScript] = useState<ScriptType | null>(null);
  const [editScriptTitle, setEditScriptTitle] = useState("");
  const [editScriptContent, setEditScriptContent] = useState("");
  const [editScriptDesc, setEditScriptDesc] = useState("");
  const [editScriptError, setEditScriptError] = useState<string | null>(null);

  // Admin Self Change Credentials
  const [myUsernameInput, setMyUsernameInput] = useState("");
  const [myPasswordInput, setMyPasswordInput] = useState("");
  const [myCredsMessage, setMyCredsMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Admin Panel Active Tab
  const [adminTab, setAdminTab] = useState<"users" | "scripts" | "logs" | "profile" | "site">("users");
  const [userSearchQuery, setUserSearchQuery] = useState("");

  // Site settings (admin editable)
  const [siteForm, setSiteForm] = useState<SiteSettings>(() => getSiteSettings());
  const [siteSaveMsg, setSiteSaveMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  useEffect(() => { setSiteForm(getSiteSettings()); }, [adminTab]);
  const handleSaveSite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSiteSettings(siteForm);
      setSiteSaveMsg({ text: "Configurações salvas! A landing page foi atualizada em tempo real.", type: "success" });
      showToast("Configurações do site atualizadas.", "success");
      setTimeout(() => setSiteSaveMsg(null), 4000);
    } catch (err: any) {
      setSiteSaveMsg({ text: err?.message || "Erro ao salvar.", type: "error" });
    }
  };
  const handleResetSite = async () => {
    if (!confirm("Restaurar configurações padrão?")) return;
    const next = await updateSiteSettings({ ...DEFAULT_SETTINGS });
    setSiteForm(next);
    showToast("Configurações restauradas para o padrão.", "info");
  };

  // Toast System
  const [toasts, setToasts] = useState<ToastType[]>([]);

  // Mobile Menu
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Live Clock
  const [currentTime, setCurrentTime] = useState(new Date());

  // Realtime subscription cleanup
  const unsubRef = useRef<(() => void) | null>(null);

  // Real-Time Clock Update
  useEffect(() => {
    const clockTimer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  // Toast trigger helper
  const showToast = (message: string, type: ToastType["type"] = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Setup realtime subscription (cross-tab BroadcastChannel)
  const connectWebSocket = (_tokenStr: string) => {
    if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }
    setWsConnected(true);
    const unsub = subscribeRealtime((payload: any) => {
      switch (payload.type) {
        case "stats_updated":
          setStats(payload.data);
          break;
        case "users_list_updated":
          setUsersList(payload.data);
          break;
        case "logs_updated":
          setLogs(payload.data);
          break;
        case "scripts_updated":
          setScripts(payload.data);
          showToast("A biblioteca de scripts foi atualizada pelo administrador.", "info");
          break;
        case "account_deleted":
          if (payload.targetUserId && currentUserRef.current?.id === payload.targetUserId) {
            showToast(payload.message, "error");
            alert(payload.message);
            handleLogout();
          }
          break;
        case "account_banned":
          if (payload.targetUserId && currentUserRef.current?.id === payload.targetUserId) {
            showToast(payload.message, "error");
            alert(payload.message);
            handleLogout();
          }
          break;
        case "account_modified":
          if (payload.targetUserId && currentUserRef.current?.id === payload.targetUserId) {
            const { passwordChanged, user } = payload.data;
            if (passwordChanged) {
              showToast("Sua senha foi alterada. Faça login novamente.", "warning");
              alert("Sua senha foi alterada. Solicitar novo login.");
              handleLogout();
            } else {
              setCurrentUser((prev) => prev ? { ...prev, ...user } : null);
              showToast("Sua conta foi modificada pelo administrador.", "info");
            }
          }
          break;
      }
    });
    unsubRef.current = unsub;
  };

  // Track current user via ref for subscribe callback
  const currentUserRef = useRef<UserType | null>(null);
  useEffect(() => { currentUserRef.current = currentUser; });

  useEffect(() => {
    return () => {
      if (unsubRef.current) unsubRef.current();
    };
  }, []);

  // Fetch Session data & initial content
  const validateSessionAndFetchData = async (tokenStr: string) => {
    setIsLoading(true);
    try {
      const response = await apiFetch("/api/me", {
        headers: { "Authorization": `Bearer ${tokenStr}` }
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
        setMyUsernameInput(data.user.username);
        
        // Fetch Scripts
        const scriptsRes = await apiFetch("/api/scripts", {
          headers: { "Authorization": `Bearer ${tokenStr}` }
        });
        if (scriptsRes.ok) {
          const scriptsData = await scriptsRes.json();
          setScripts(scriptsData);
        }

        // Fetch Stats
        const statsRes = await apiFetch("/api/stats", {
          headers: { "Authorization": `Bearer ${tokenStr}` }
        });
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }

        // If admin, fetch admin data
        if (data.user.role === "admin") {
          fetchAdminData(tokenStr);
        }

        connectWebSocket(tokenStr);
        setView("dashboard");
      } else {
        // Token stale
        handleLogout();
      }
    } catch (err) {
      console.error("Erro na validação da sessão:", err);
      handleLogout();
    } finally {
      // Simulate premium delay for high-end aesthetic entry
      setTimeout(() => {
        setIsLoading(false);
      }, 800);
    }
  };

  const fetchAdminData = async (tokenStr: string) => {
    try {
      // Fetch user list
      const usersRes = await apiFetch("/api/admin/users", {
        headers: { "Authorization": `Bearer ${tokenStr}` }
      });
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsersList(usersData);
      }

      // Fetch audit logs
      const logsRes = await apiFetch("/api/admin/logs", {
        headers: { "Authorization": `Bearer ${tokenStr}` }
      });
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData);
      }
    } catch (err) {
      console.error("Erro ao carregar dados administrativos:", err);
    }
  };

  // Run on mount to check existing session
  useEffect(() => {
    if (token) {
      validateSessionAndFetchData(token);
    } else {
      setIsLoading(false);
      setView("login");
    }
  }, [token]);

  // Handle Login submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim() || !passwordInput.trim()) {
      setLoginError("Preencha todos os campos.");
      return;
    }

    setLoginError(null);
    setIsLoggingIn(true);

    try {
      const response = await apiFetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: usernameInput.trim(),
          password: passwordInput
        })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("scriptando_token", data.token);
        setToken(data.token);
        setCurrentUser(data.user);
        setMyUsernameInput(data.user.username);
        showToast(`Bem-vindo, ${data.user.username}!`, "success");
        
        // Reset login form fields
        setUsernameInput("");
        setPasswordInput("");
      } else {
        setLoginError(data.error || "Falha na autenticação.");
        showToast(data.error || "Falha ao entrar.", "error");
      }
    } catch (err) {
      setLoginError("Erro de conexão com o servidor.");
      showToast("Erro de rede.", "error");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Logout routine
  const handleLogout = async () => {
    if (token) {
      try {
        await apiFetch("/api/logout", {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` }
        });
      } catch (err) {
        // Ignored, proceed to clean client state
      }
    }

    localStorage.removeItem("scriptando_token");
    setToken(null);
    setCurrentUser(null);
    setScripts([]);
    setUsersList([]);
    setLogs([]);
    setView("login");

    if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }
    setWsConnected(false);
  };

  // ADMINISTRATIVE ACTIONS

  // Add User
  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserUsername.trim() || !newUserPassword.trim()) {
      setAddUserError("Nome de usuário e senha são obrigatórios.");
      return;
    }

    setAddUserError(null);
    try {
      const response = await apiFetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          username: newUserUsername.trim(),
          password: newUserPassword
        })
      });

      const data = await response.json();
      if (response.ok) {
        showToast(`Usuário "${newUserUsername}" criado com sucesso!`, "success");
        setNewUserUsername("");
        setNewUserPassword("");
        setShowAddUserModal(false);
        fetchAdminData(token!);
      } else {
        setAddUserError(data.error || "Erro ao criar usuário.");
      }
    } catch (err) {
      setAddUserError("Erro na conexão.");
    }
  };

  // Edit User
  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setEditUserError(null);
    try {
      const response = await apiFetch(`/api/admin/users/${editingUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          username: editUserUsername.trim(),
          password: editUserPassword || undefined,
          status: editUserStatus
        })
      });

      const data = await response.json();
      if (response.ok) {
        showToast(`Usuário "${editUserUsername}" atualizado com sucesso!`, "success");
        setEditingUser(null);
        setEditUserPassword("");
        fetchAdminData(token!);
      } else {
        setEditUserError(data.error || "Erro ao atualizar usuário.");
      }
    } catch (err) {
      setEditUserError("Erro na conexão.");
    }
  };

  // Ban User
  const handleBanUser = async (userId: string) => {
    try {
      const response = await apiFetch(`/api/admin/users/${userId}/ban`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        showToast("Usuário banido com sucesso.", "success");
        fetchAdminData(token!);
      } else {
        const data = await response.json();
        showToast(data.error || "Erro ao banir usuário.", "error");
      }
    } catch (err) {
      showToast("Erro de conexão.", "error");
    }
  };

  // Unban User
  const handleUnbanUser = async (userId: string) => {
    try {
      const response = await apiFetch(`/api/admin/users/${userId}/unban`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        showToast("Usuário reativado com sucesso.", "success");
        fetchAdminData(token!);
      } else {
        const data = await response.json();
        showToast(data.error || "Erro ao reativar usuário.", "error");
      }
    } catch (err) {
      showToast("Erro de conexão.", "error");
    }
  };

  // Delete User
  const handleDeleteUser = async (userId: string, username: string) => {
    if (!confirm(`Tem certeza de que deseja excluir permanentemente o usuário "${username}"?`)) {
      return;
    }

    try {
      const response = await apiFetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        showToast("Usuário excluído com sucesso.", "success");
        fetchAdminData(token!);
      } else {
        const data = await response.json();
        showToast(data.error || "Erro ao excluir usuário.", "error");
      }
    } catch (err) {
      showToast("Erro de conexão.", "error");
    }
  };

  // Self change credentials
  const handleUpdateMyCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myUsernameInput.trim()) {
      setMyCredsMessage({ text: "Nome de usuário é obrigatório.", type: "error" });
      return;
    }

    setMyCredsMessage(null);
    try {
      const response = await apiFetch("/api/admin/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          username: myUsernameInput.trim(),
          password: myPasswordInput || undefined
        })
      });

      const data = await response.json();
      if (response.ok) {
        setMyCredsMessage({ text: "Credenciais atualizadas com sucesso!", type: "success" });
        showToast("Minhas credenciais foram atualizadas.", "success");
        setMyPasswordInput("");
        setCurrentUser((prev) => prev ? { ...prev, username: data.username } : null);
        fetchAdminData(token!);
      } else {
        setMyCredsMessage({ text: data.error || "Erro ao atualizar credenciais.", type: "error" });
      }
    } catch (err) {
      setMyCredsMessage({ text: "Erro na conexão.", type: "error" });
    }
  };

  // SCRIPT ACTIONS

  // Add Script
  const handleAddScriptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScriptTitle.trim() || !newScriptContent.trim()) {
      setAddScriptError("Título e conteúdo são obrigatórios.");
      return;
    }

    setAddScriptError(null);
    try {
      const response = await apiFetch("/api/admin/scripts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newScriptTitle.trim(),
          content: newScriptContent,
          description: newScriptDesc.trim()
        })
      });

      const data = await response.json();
      if (response.ok) {
        showToast(`Script "${newScriptTitle}" adicionado com sucesso!`, "success");
        setNewScriptTitle("");
        setNewScriptContent("");
        setNewScriptDesc("");
        setShowAddScriptModal(false);
        
        // Refresh local scripts
        setScripts((prev) => [...prev, data]);
      } else {
        setAddScriptError(data.error || "Erro ao adicionar script.");
      }
    } catch (err) {
      setAddScriptError("Erro na conexão.");
    }
  };

  // Edit Script
  const handleEditScriptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingScript) return;

    setEditScriptError(null);
    try {
      const response = await apiFetch(`/api/admin/scripts/${editingScript.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          title: editScriptTitle.trim(),
          content: editScriptContent,
          description: editScriptDesc.trim()
        })
      });

      const data = await response.json();
      if (response.ok) {
        showToast(`Script "${editScriptTitle}" atualizado!`, "success");
        setEditingScript(null);
        setScripts((prev) => prev.map((s) => s.id === editingScript.id ? data : s));
      } else {
        setEditScriptError(data.error || "Erro ao atualizar script.");
      }
    } catch (err) {
      setEditScriptError("Erro na conexão.");
    }
  };

  // Delete Script
  const handleDeleteScript = async (scriptId: string, title: string) => {
    if (!confirm(`Deseja excluir permanentemente o script "${title}"?`)) {
      return;
    }

    try {
      const response = await apiFetch(`/api/admin/scripts/${scriptId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        showToast("Script removido com sucesso.", "success");
        setScripts((prev) => prev.filter((s) => s.id !== scriptId));
      } else {
        const data = await response.json();
        showToast(data.error || "Erro ao excluir script.", "error");
      }
    } catch (err) {
      showToast("Erro de conexão.", "error");
    }
  };

  const copyTextWithTextarea = (text: string) => {
    const selection = document.getSelection();
    const selectedRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    const textarea = document.createElement("textarea");

    textarea.value = text;
    textarea.readOnly = true;
    textarea.setAttribute("aria-hidden", "true");
    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.left = "0";
    textarea.style.width = "1px";
    textarea.style.height = "1px";
    textarea.style.padding = "0";
    textarea.style.border = "0";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    textarea.style.zIndex = "-1";

    document.body.appendChild(textarea);
    textarea.focus({ preventScroll: true });
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);

    let copied = false;
    try {
      copied = document.execCommand("copy");
    } finally {
      document.body.removeChild(textarea);
      if (selectedRange && selection) {
        selection.removeAllRanges();
        selection.addRange(selectedRange);
      }
    }

    return copied;
  };

  // Copy Script content to clipboard with a reliable fallback for iframe/mobile contexts
  const handleCopyScript = async (scriptContent: string, _scriptTitle: string) => {
    const textToCopy = String(scriptContent ?? "");

    if (!textToCopy.trim()) {
      showToast("Este script está vazio.", "warning");
      return;
    }

    let copied = false;

    try {
      if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(textToCopy);
        copied = true;
      }
    } catch {
      copied = false;
    }

    if (!copied) {
      try {
        copied = copyTextWithTextarea(textToCopy);
      } catch {
        copied = false;
      }
    }

    if (copied) {
      showToast("Script copiado com sucesso.", "success");
      return;
    }

    window.prompt("Copie o script manualmente:", textToCopy);
    showToast("O navegador bloqueou a cópia automática. O script foi aberto para copiar manualmente.", "info");
  };

  // Filter and Search computed lists
  const filteredScripts = useMemo(() => {
    return scripts.filter((script) => {
      const matchSearch = 
        script.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        script.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSearch;
    });
  }, [scripts, searchQuery]);

  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      return u.username.toLowerCase().includes(userSearchQuery.toLowerCase());
    });
  }, [usersList, userSearchQuery]);

  // Clock string helper in Portuguese
  const formattedDate = currentTime.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const formattedTime = currentTime.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

  return (
    <div id="applet-container" className="min-h-screen bg-black text-white relative overflow-x-hidden selection:bg-white selection:text-black">
      {/* Background gradients for Ambient Apple aesthetic */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-tr from-zinc-900/10 to-zinc-800/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-tr from-zinc-800/15 to-neutral-900/10 blur-[120px] pointer-events-none" />

      {/* Floating System-wide Toast Notifications */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`pointer-events-auto px-6 py-3 rounded-2xl border flex items-center gap-3 shadow-2xl ${
                toast.type === "success" 
                  ? "bg-[#222222] border-[#444444] text-white"
                  : toast.type === "error"
                  ? "bg-[#111111] border-rose-950 text-rose-300"
                  : toast.type === "warning"
                  ? "bg-[#111111] border-amber-950 text-amber-300"
                  : "bg-[#111111] border-[#222222] text-zinc-300"
              }`}
            >
              {toast.type === "success" && <CheckCircle className="w-5 h-5 flex-shrink-0" />}
              {toast.type === "error" && <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
              {toast.type === "warning" && <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
              {toast.type === "info" && <Activity className="w-5 h-5 flex-shrink-0" />}
              <span className="text-sm font-medium leading-relaxed">{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 1. Loading Splash Screen */}
      <AnimatePresence>
        {isLoading && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center gap-6"
            >
              <div className="relative">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  className="w-16 h-16 rounded-full border-t-2 border-r-2 border-white/90 border-b-2 border-l-2 border-l-transparent border-b-transparent"
                />
                <Shield className="w-6 h-6 absolute inset-0 m-auto text-white/80 animate-pulse" />
              </div>
              <div className="text-center">
                <h1 className="text-2xl font-display font-medium tracking-[0.15em] text-white">SCRIPTANDO</h1>
                <p className="text-xs text-zinc-500 font-mono tracking-wider uppercase mt-1">Carregando Biblioteca Premium...</p>
              </div>
              <p className="text-[10px] text-zinc-600 font-mono mt-12">By Pajé 01</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Sections based on Auth View */}
      
      {/* 2. Login Page */}
      {view === "login" && !isLoading && (
        <div className="min-h-screen flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-md bg-[#0a0a0a] border border-[#222222] rounded-[32px] p-8 shadow-[0_30px_100px_rgba(0,0,0,0.8)] relative overflow-hidden"
          >
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="inline-flex p-4 rounded-2xl bg-[#111111] border border-[#222222] mb-4"
              >
                <Terminal className="w-8 h-8 text-white" />
              </motion.div>
              <h2 className="text-3xl font-display font-bold tracking-tighter text-white">SCRIPTANDO</h2>
              <p className="text-[10px] text-[#444444] uppercase tracking-[0.2em] mt-1 italic">By Pajé 01</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#444444] mb-2">Usuário</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#444444]" />
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="Digite seu usuário"
                    className="w-full bg-[#111111] border border-[#222222] focus:border-[#444444] rounded-2xl py-3.5 pl-11 pr-4 text-sm text-white placeholder-[#444444] outline-none transition-all duration-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#444444] mb-2">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#444444]" />
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Sua senha secreta"
                    className="w-full bg-[#111111] border border-[#222222] focus:border-[#444444] rounded-2xl py-3.5 pl-11 pr-12 text-sm text-white placeholder-[#444444] outline-none transition-all duration-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-[#444444] hover:text-zinc-300 transition-colors"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {loginError && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3.5 bg-rose-950/20 border border-rose-500/20 text-rose-300 text-xs rounded-2xl flex items-center gap-2 font-medium"
                >
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{loginError}</span>
                </motion.div>
              )}

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-white text-black font-bold text-sm py-4 px-4 rounded-2xl hover:bg-[#dddddd] transition-all duration-300 flex items-center justify-center gap-2 shadow-lg active:scale-98 disabled:opacity-50"
              >
                {isLoggingIn ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Autenticando...</span>
                  </>
                ) : (
                  <>
                    <span>Entrar</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-[#111111] text-center">
              <p className="text-[9px] text-[#333333] tracking-widest uppercase">
                POWERED BY PAJÉ 01
              </p>
            </div>
          </motion.div>
        </div>
      )}

      {/* 3. Authenticated Dashboard Area */}
      {view !== "login" && !isLoading && currentUser && (
        <div className="flex min-h-screen relative">
          
          {/* A. Sidebar (Apple Layout) */}
          <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#0a0a0a] border-r border-[#222222] flex flex-col justify-between p-8 transition-all duration-300 lg:translate-x-0 ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}>
            <div className="space-y-8">
              {/* Logo branding */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold tracking-tighter text-white">SCRIPTANDO</h1>
                  <p className="text-[10px] text-[#444444] uppercase tracking-[0.2em] mt-1 italic">By Pajé 01</p>
                </div>
                <button 
                  onClick={() => setMobileMenuOpen(false)}
                  className="lg:hidden p-1.5 rounded-lg hover:bg-[#111111] text-[#666666] hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Badge */}
              <div className="bg-[#111111] p-4 rounded-2xl border border-[#222222] space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#333] to-[#111] border border-[#444] flex items-center justify-center text-xs font-bold text-white">
                    {currentUser.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{currentUser.username}</p>
                    <p className="text-[10px] text-green-500 font-medium">
                      {currentUser.role === "admin" ? "Administrador" : "Membro"}
                    </p>
                  </div>
                </div>
                <div className="pt-2 border-t border-[#222222]/60 flex items-center justify-between text-[10px] text-[#444444] uppercase tracking-widest">
                  <span>Sync Status</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${wsConnected ? "bg-green-500 shadow-[0_0_10px_#22c55e]" : "bg-rose-500"}`} />
                    <span className={wsConnected ? "text-green-500 font-bold" : "text-rose-500"}>
                      {wsConnected ? "ONLINE" : "OFFLINE"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Navigation Menu Links */}
              <nav className="space-y-2">
                <label className="text-[10px] text-[#444444] uppercase tracking-widest block mb-1">Navegação</label>
                <button
                  onClick={() => { setView("dashboard"); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all border ${
                    view === "dashboard"
                      ? "bg-[#1a1a1a] border-[#333333] text-white"
                      : "bg-transparent border-transparent text-[#666666] hover:bg-[#111111] hover:text-white"
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${view === "dashboard" ? "bg-white shadow-[0_0_10px_#fff]" : "bg-[#333333]"}`} />
                  <span className="text-sm font-medium">Dashboard</span>
                </button>

                {currentUser.role !== "admin" && (
                  <button
                    onClick={() => { setView("tutorial"); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all border ${
                      view === "tutorial"
                        ? "bg-[#1a1a1a] border-[#333333] text-white"
                        : "bg-transparent border-transparent text-[#666666] hover:bg-[#111111] hover:text-white"
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${view === "tutorial" ? "bg-white shadow-[0_0_10px_#fff]" : "bg-[#333333]"}`} />
                    <span className="text-sm font-medium">Tutorial</span>
                  </button>
                )}


                {currentUser.role === "admin" && (
                  <button
                    onClick={() => { setView("admin"); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all border ${
                      view === "admin"
                        ? "bg-[#1a1a1a] border-[#333333] text-white"
                        : "bg-transparent border-transparent text-[#666666] hover:bg-[#111111] hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${view === "admin" ? "bg-white shadow-[0_0_10px_#fff]" : "bg-[#333333]"}`} />
                      <span className="text-sm font-medium">Painel Admin</span>
                    </div>
                  </button>
                )}
              </nav>
            </div>

            {/* Bottom logout block */}
            <div className="space-y-4 pt-4 mt-auto">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 bg-[#111111] hover:bg-[#1a1a1a] border border-[#222222] hover:border-[#333333] text-[#666666] hover:text-white py-3 px-4 rounded-xl text-sm font-medium transition-all active:scale-98"
              >
                <LogOut className="w-4 h-4" />
                <span>Sair da Plataforma</span>
              </button>
              <p className="text-[9px] text-[#333333] mt-4 text-center tracking-widest">POWERED BY PAJÉ 01</p>
            </div>
          </aside>

          {/* Background Overlay for mobile sidebar */}
          {mobileMenuOpen && (
            <div 
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 z-30 backdrop-blur-sm lg:hidden"
            />
          )}

          {/* B. Main Area Container */}
          <main className="flex-1 lg:pl-64 min-h-screen flex flex-col pb-12">
            
            {/* Header top bar */}
            <header className="sticky top-0 z-20 bg-black/50 backdrop-blur-xl border-b border-[#111111] px-8 py-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  className="lg:hidden p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-zinc-400 hover:text-white"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <div className="hidden sm:block">
                  <h2 className="text-xl font-medium text-white">
                    {view === "dashboard" ? "Biblioteca Premium" : view === "tutorial" ? "Tutorial — Como usar no Celular" : "Painel de Administração"}
                  </h2>
                  <p className="text-xs text-[#666666] mt-0.5">{formattedDate}</p>
                </div>
              </div>

              <div className="flex gap-8">
                <div className="text-right">
                  <p className="text-[10px] text-[#444444] uppercase tracking-widest">Usuários Online</p>
                  <div className="flex items-center justify-end gap-2 mt-0.5">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <p className="text-sm font-bold text-white">{stats.onlineCount}</p>
                  </div>
                </div>
                <div className="text-right border-l border-[#222222] pl-8">
                  <p className="text-[10px] text-[#444444] uppercase tracking-widest">Total de Scripts</p>
                  <p className="text-sm font-bold text-white mt-0.5">{scripts.length}</p>
                </div>
              </div>
            </header>

            {/* C. Views */}

            {/* view: DASHBOARD */}
            {view === "dashboard" && (
              <div className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-8">
                
                {/* Visual Intro Banner */}
                <div className="bg-[#0a0a0a] border border-[#222222] rounded-[32px] p-8 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl">
                  {/* Subtle lights */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-[#111111]/10 rounded-full blur-[80px]" />
                  
                  <div className="space-y-2 relative z-10">
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-white/5 text-[9px] rounded-md border border-white/10 uppercase font-mono tracking-wider text-white">
                      <span>Plataforma Premium Oficial</span>
                    </div>
                    <h2 className="text-3xl font-display font-semibold tracking-wide text-white">SCRIPTANDO</h2>
                    <p className="text-[#666666] max-w-xl text-sm leading-relaxed">
                      Sua biblioteca definitiva de ferramentas e automações premium, otimizada para máximo rendimento e velocidade. Desenvolvido por <strong className="text-white font-medium">Pajé 01</strong>.
                    </p>
                  </div>

                  {/* High Level Quick Status Row */}
                  <div className="grid grid-cols-2 gap-4 relative z-10 w-full md:w-auto">
                    <div className="bg-black/40 border border-[#222222] p-4 rounded-2xl min-w-[130px]">
                      <span className="block text-[10px] font-mono text-[#444444] uppercase tracking-wide mb-1">Membros Ativos</span>
                      <strong className="text-2xl font-display font-semibold text-white">{stats.totalCount}</strong>
                    </div>
                    <div className="bg-black/40 border border-[#222222] p-4 rounded-2xl min-w-[130px]">
                      <span className="block text-[10px] font-mono text-[#444444] uppercase tracking-wide mb-1">Scripts</span>
                      <strong className="text-2xl font-display font-semibold text-white">{scripts.length}</strong>
                    </div>
                  </div>
                </div>

                {/* Search and Filters Header */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-[#0a0a0a] border border-[#222222] p-4 rounded-[24px]">
                  <div className="relative w-full sm:max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#444444]" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Pesquisar scripts..."
                      className="w-full bg-[#111111] border border-[#222222] focus:border-[#444444] rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder-[#444444] outline-none transition-all"
                    />
                  </div>

                  <div className="text-xs text-[#444444] font-mono w-full sm:w-auto text-right uppercase tracking-widest">
                    Exibindo <strong className="text-zinc-300 font-bold">{filteredScripts.length}</strong> de {scripts.length} scripts
                  </div>
                </div>

                {/* Library 5 Cards Showcase (Responsive Grid) */}
                {filteredScripts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredScripts.map((script) => {
                      const isSelected = selectedScriptId === script.id;
                      return (
                        <motion.div
                          key={script.id}
                          layout
                          className="bg-[#111111] border border-[#222222] hover:border-[#444444] rounded-[32px] p-6 transition-all duration-300 shadow-xl flex flex-col justify-between group relative overflow-hidden"
                          whileHover={{ y: -4, transition: { duration: 0.2 } }}
                        >
                          {/* Inner glowing top-border */}
                          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                          <div>
                            <div className="flex justify-between items-start mb-4">
                              <h3 className="font-bold text-lg text-white group-hover:text-zinc-200 transition-colors">
                                {script.title}
                              </h3>
                              <span className="px-2 py-1 bg-white/5 text-[9px] rounded-md border border-white/10 uppercase text-white/70 font-mono tracking-wider">
                                Ativo
                              </span>
                            </div>

                            <p className="text-sm text-[#666666] line-clamp-2 min-h-[40px] mb-5 leading-relaxed">
                              {script.description || "Sem descrição adicional fornecida para este script premium."}
                            </p>

                            {/* Blur script area block (preview locked) */}
                            <div className="relative rounded-2xl border border-white/5 bg-black/40 overflow-hidden mb-6 h-28">
                              <div className="p-4 select-none font-mono text-[10px] leading-tight text-white/40 filter blur-[6px] opacity-40 whitespace-pre-wrap h-full pointer-events-none">
                                {script.content}
                                {"\n"}██████████████████████
                                {"\n"}██████████████████████
                                {"\n"}██████████████████████
                              </div>
                              <div className="absolute inset-0 bg-black/20" />
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleCopyScript(script.content, script.title)}
                              className="w-full py-4 bg-white text-black rounded-2xl font-bold text-sm hover:bg-[#dddddd] transition-all flex items-center justify-center gap-2 active:scale-98"
                            >
                              Copiar Script
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center p-12 bg-zinc-950/40 border border-zinc-900 rounded-3xl">
                    <HelpCircle className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                    <h3 className="font-display font-medium text-lg text-white">Nenhum script encontrado</h3>
                    <p className="text-sm text-zinc-500 mt-1">Experimente alterar a sua palavra de busca.</p>
                  </div>
                )}

                <div className="pt-8 border-t border-[#111111] flex flex-col sm:flex-row justify-between items-center text-[#444444] gap-4">
                  <p className="text-[10px] font-medium tracking-widest uppercase">Desenvolvido por Pajé 01</p>
                  <div className="flex gap-4">
                    <p className="text-[10px] uppercase tracking-widest">v4.0.2 Stable</p>
                    <p className="text-[10px] uppercase tracking-widest">© 2024 SCRIPTANDO</p>
                  </div>
                </div>
              </div>
            )}

            {/* view: TUTORIAL (apenas usuários comuns) */}
            {view === "tutorial" && currentUser.role !== "admin" && (
              <div className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-8">
                <div className="bg-[#0a0a0a] border border-[#222222] rounded-[32px] p-8 relative overflow-hidden shadow-2xl">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/[0.02] rounded-full blur-[80px]" />
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-white/5 text-[9px] rounded-md border border-white/10 uppercase font-mono tracking-wider text-white">
                        <Smartphone className="w-3 h-3" />
                        <span>Tutorial para Celular</span>
                      </div>
                      <h2 className="text-3xl font-display font-semibold tracking-wide text-white">Como usar os scripts no celular</h2>
                      <p className="text-[#666666] max-w-xl text-sm leading-relaxed">
                        Um guia visual passo a passo. Siga as 8 etapas abaixo para configurar e executar qualquer script direto do seu navegador móvel.
                      </p>
                    </div>
                    <div className="bg-black/40 border border-[#222222] p-4 rounded-2xl min-w-[130px] text-center">
                      <span className="block text-[10px] font-mono text-[#444444] uppercase tracking-wide mb-1">Passos</span>
                      <strong className="text-2xl font-display font-semibold text-white">{MOBILE_TUTORIAL_STEPS.length}</strong>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {MOBILE_TUTORIAL_STEPS.map((step, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: idx * 0.05, ease: [0.16, 1, 0.3, 1] }}
                      className="group relative rounded-[28px] bg-[#0a0a0a] border border-[#222222] overflow-hidden hover:border-[#444444] hover:-translate-y-1 transition-all duration-500 flex flex-col shadow-xl"
                    >
                      <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                      <div className="relative aspect-[9/16] overflow-hidden bg-gradient-to-br from-[#111] via-black to-[#111] p-3">
                        <div className="relative w-full h-full rounded-2xl overflow-hidden bg-black/60 ring-1 ring-white/10">
                          <img
                            src={step.img}
                            alt={`Passo ${idx + 1} — ${step.title}`}
                            loading="lazy"
                            className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-[1.03]"
                          />
                        </div>
                        <div className="absolute top-5 left-5 w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center text-sm font-black shadow-xl shadow-black/40 ring-1 ring-white/40">
                          {idx + 1}
                        </div>
                      </div>
                      <div className="p-5 pt-4 space-y-1.5 flex-1 flex flex-col border-t border-white/5">
                        <h3 className="text-white font-bold text-base tracking-tight leading-snug">{step.title}</h3>
                        <p className="text-sm text-[#888888] leading-relaxed">{step.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="bg-[#0a0a0a] border border-[#222222] rounded-[24px] p-6 text-center">
                  <p className="text-sm text-[#888888]">
                    Dúvidas? Fale com o suporte no WhatsApp e receba ajuda em minutos.
                  </p>
                </div>
              </div>
            )}


            {view === "admin" && currentUser.role === "admin" && (
              <div className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-8">
                
                {/* Admin Navigation Tab Buttons */}
                <div className="flex border-b border-[#222222] overflow-x-auto pb-[1px] gap-2">
                  <button
                    onClick={() => setAdminTab("users")}
                    className={`px-5 py-3 border-b-2 text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 flex-shrink-0 ${
                      adminTab === "users"
                        ? "border-white text-white"
                        : "border-transparent text-[#444444] hover:text-[#666666]"
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>Gerenciar Usuários</span>
                  </button>
                  <button
                    onClick={() => setAdminTab("scripts")}
                    className={`px-5 py-3 border-b-2 text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 flex-shrink-0 ${
                      adminTab === "scripts"
                        ? "border-white text-white"
                        : "border-transparent text-[#444444] hover:text-[#666666]"
                    }`}
                  >
                    <FileCode className="w-4 h-4" />
                    <span>Gerenciar Scripts</span>
                  </button>
                  <button
                    onClick={() => setAdminTab("logs")}
                    className={`px-5 py-3 border-b-2 text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 flex-shrink-0 ${
                      adminTab === "logs"
                        ? "border-white text-white"
                        : "border-transparent text-[#444444] hover:text-[#666666]"
                    }`}
                  >
                    <Activity className="w-4 h-4" />
                    <span>Logs de Auditoria</span>
                  </button>
                  <button
                    onClick={() => setAdminTab("profile")}
                    className={`px-5 py-3 border-b-2 text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 flex-shrink-0 ${
                      adminTab === "profile"
                        ? "border-white text-white"
                        : "border-transparent text-[#444444] hover:text-[#666666]"
                    }`}
                  >
                    <Key className="w-4 h-4" />
                    <span>Minhas Credenciais</span>
                  </button>
                  <button
                    onClick={() => setAdminTab("site")}
                    className={`px-5 py-3 border-b-2 text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 flex-shrink-0 ${
                      adminTab === "site"
                        ? "border-white text-white"
                        : "border-transparent text-[#444444] hover:text-[#666666]"
                    }`}
                  >
                    <Settings className="w-4 h-4" />
                    <span>Configurações do Site</span>
                  </button>
                </div>

                {/* Tab Content: Users Management */}
                {adminTab === "users" && (
                  <div className="space-y-6">
                    {/* Header bar */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-[#0a0a0a] border border-[#222222] p-4 rounded-[24px]">
                      <div className="relative w-full sm:max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#444444]" />
                        <input
                          type="text"
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                          placeholder="Buscar usuários..."
                          className="w-full bg-[#111111] border border-[#222222] focus:border-[#444444] rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder-[#444444] outline-none transition-all"
                        />
                      </div>
                      
                      <button
                        onClick={() => { setAddUserError(null); setShowAddUserModal(true); }}
                        className="w-full sm:w-auto bg-white text-black hover:bg-[#dddddd] px-6 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-98"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Novo Usuário</span>
                      </button>
                    </div>

                    {/* Users list table */}
                    <div className="bg-[#0a0a0a] border border-[#222222] rounded-[24px] overflow-hidden shadow-2xl">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-[#050505] border-b border-[#111111] text-[#444444] font-mono text-[10px] uppercase tracking-widest">
                              <th className="py-4 px-6 font-medium">Nome do Usuário</th>
                              <th className="py-4 px-6 font-medium">Cargo</th>
                              <th className="py-4 px-6 font-medium">Status</th>
                              <th className="py-4 px-6 font-medium">Criado Em</th>
                              <th className="py-4 px-6 font-medium text-right">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#111111]">
                            {filteredUsers.length > 0 ? (
                              filteredUsers.map((u) => (
                                <tr key={u.id} className="hover:bg-[#111111]/40 transition-colors">
                                  <td className="py-4 px-6">
                                    <div className="flex items-center gap-2">
                                      <User className="w-4 h-4 text-[#444444]" />
                                      <span className="font-semibold text-sm text-white">{u.username}</span>
                                      {u.id === currentUser.id && (
                                        <span className="text-[9px] bg-white/10 text-white font-mono px-1.5 py-0.5 rounded uppercase">Você</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-4 px-6">
                                    <span className={`text-xs font-mono font-medium ${u.role === "admin" ? "text-amber-400" : "text-[#666666]"}`}>
                                      {u.role === "admin" ? "Administrador" : "Membro"}
                                    </span>
                                  </td>
                                  <td className="py-4 px-6">
                                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                                      u.status === "active" 
                                        ? "bg-emerald-500/10 text-emerald-400"
                                        : "bg-rose-500/10 text-rose-400"
                                    }`}>
                                      <span className={`w-1.5 h-1.5 rounded-full ${u.status === "active" ? "bg-emerald-400" : "bg-rose-400"}`} />
                                      <span className="capitalize">{u.status === "active" ? "Ativo" : "Banido"}</span>
                                    </span>
                                  </td>
                                  <td className="py-4 px-6 text-xs text-[#444444] font-mono">
                                    {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                                  </td>
                                  <td className="py-4 px-6 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        onClick={() => {
                                          setEditingUser(u);
                                          setEditUserUsername(u.username);
                                          setEditUserStatus(u.status);
                                          setEditUserPassword("");
                                          setEditUserError(null);
                                        }}
                                        className="p-2.5 rounded-xl bg-[#111111] hover:bg-[#1a1a1a] border border-[#222222] text-[#666666] hover:text-white transition-all"
                                        title="Editar"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      
                                      {u.role !== "admin" && (
                                        <>
                                          {u.status === "active" ? (
                                            <button
                                              onClick={() => handleBanUser(u.id)}
                                              className="p-2.5 rounded-xl bg-[#111111] hover:bg-rose-950/20 border border-[#222222] hover:border-rose-900/40 text-[#666666] hover:text-rose-400 transition-all"
                                              title="Banir"
                                            >
                                              <UserX className="w-3.5 h-3.5" />
                                            </button>
                                          ) : (
                                            <button
                                              onClick={() => handleUnbanUser(u.id)}
                                              className="p-2.5 rounded-xl bg-[#111111] hover:bg-emerald-950/20 border border-[#222222] hover:border-emerald-900/40 text-[#666666] hover:text-emerald-400 transition-all"
                                              title="Desbanir"
                                            >
                                              <UserCheck className="w-3.5 h-3.5" />
                                            </button>
                                          )}

                                          <button
                                            onClick={() => handleDeleteUser(u.id, u.username)}
                                            className="p-2.5 rounded-xl bg-[#111111] hover:bg-rose-950/20 border border-[#222222] hover:border-rose-900/40 text-[#666666] hover:text-rose-400 transition-all"
                                            title="Excluir"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={5} className="py-8 px-6 text-center text-[#444444] text-sm">
                                  Nenhum usuário correspondente encontrado.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab Content: Scripts Library Control */}
                {adminTab === "scripts" && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-lg text-white">Scripts da Biblioteca</h3>
                        <p className="text-xs text-[#666666]">Crie, edite e organize os scripts mostrados na biblioteca.</p>
                      </div>
                      <button
                        onClick={() => { setAddScriptError(null); setShowAddScriptModal(true); }}
                        className="bg-white text-black hover:bg-[#dddddd] px-6 py-3 rounded-2xl text-sm font-bold flex items-center gap-2 transition-all active:scale-98"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Novo Script</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {scripts.map((script) => (
                        <div key={script.id} className="bg-[#111111] border border-[#222222] p-6 rounded-[32px] flex flex-col justify-between shadow-lg">
                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-bold text-base text-white">{script.title}</h4>
                              <span className="text-[9px] px-2 py-0.5 bg-white/5 border border-white/10 text-white/70 rounded-md font-mono uppercase tracking-wider">
                                ID: {script.id}
                              </span>
                            </div>
                            <p className="text-sm text-[#666666] mb-4 line-clamp-2">{script.description || "Sem descrição."}</p>
                            
                            <div className="bg-black/40 border border-white/5 rounded-2xl p-3.5 mb-4 max-h-24 overflow-y-auto font-mono text-[11px] text-[#666666] whitespace-pre-wrap">
                              {script.content}
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 border-t border-[#222222] pt-4 mt-2">
                            <button
                              onClick={() => {
                                setEditingScript(script);
                                setEditScriptTitle(script.title);
                                setEditScriptContent(script.content);
                                setEditScriptDesc(script.description);
                                setEditScriptError(null);
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-[#111111] hover:bg-[#1a1a1a] border border-[#222222] text-xs font-semibold text-white/70 hover:text-white transition-all flex items-center gap-1.5"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Editar</span>
                            </button>
                            <button
                              onClick={() => handleDeleteScript(script.id, script.title)}
                              className="px-3.5 py-1.5 rounded-xl bg-[#111111] hover:bg-rose-950/20 border border-[#222222] hover:border-rose-900/40 text-xs font-semibold text-rose-400 hover:text-rose-300 transition-all flex items-center gap-1.5"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Excluir</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tab Content: Action logs audit */}
                {adminTab === "logs" && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-bold text-lg text-white">Logs de Atividades</h3>
                      <p className="text-xs text-[#666666]">Histórico detalhado de ações e alterações do sistema em tempo real.</p>
                    </div>

                    <div className="bg-[#0a0a0a] border border-[#222222] rounded-[24px] overflow-hidden shadow-2xl">
                      <div className="max-h-[500px] overflow-y-auto">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-[#050505] border-b border-[#111111] sticky top-0 z-10 text-[#444444] font-mono text-[10px] uppercase tracking-widest">
                            <tr>
                              <th className="py-4 px-6 font-medium">Data e Hora</th>
                              <th className="py-4 px-6 font-medium">Usuário</th>
                              <th className="py-4 px-6 font-medium">Ação</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#111111]">
                            {logs.length > 0 ? (
                              logs.map((log) => (
                                <tr key={log.id} className="hover:bg-[#111111]/40 transition-colors">
                                  <td className="py-3 px-6 text-xs text-[#444444] font-mono">
                                    {new Date(log.timestamp).toLocaleString("pt-BR")}
                                  </td>
                                  <td className="py-3 px-6">
                                    <span className="font-medium text-sm text-white">{log.username}</span>
                                  </td>
                                  <td className="py-3 px-6 text-sm text-[#666666]">
                                    {log.action}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={3} className="py-8 px-6 text-center text-[#444444] text-sm">
                                  Nenhum log disponível.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab Content: Admin credentials profile */}
                {adminTab === "profile" && (
                  <div className="max-w-xl">
                    <div className="bg-[#0a0a0a] border border-[#222222] p-8 rounded-[32px] space-y-6">
                      <div>
                        <h3 className="font-bold text-lg text-white">Atualizar minhas Credenciais</h3>
                        <p className="text-xs text-[#666666]">Modifique seu nome de usuário ou sua senha de acesso administrativo.</p>
                      </div>

                      <form onSubmit={handleUpdateMyCredentials} className="space-y-4">
                        <div>
                          <label className="block text-xs font-mono uppercase tracking-wider text-[#444444] mb-2">Novo Usuário Admin</label>
                          <input
                            type="text"
                            value={myUsernameInput}
                            onChange={(e) => setMyUsernameInput(e.target.value)}
                            className="w-full bg-[#111111] border border-[#222222] focus:border-[#444444] rounded-xl py-3 px-4 text-sm text-white placeholder-[#444444] outline-none transition-all"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-mono uppercase tracking-wider text-[#444444] mb-2">Nova Senha Admin</label>
                          <input
                            type="password"
                            value={myPasswordInput}
                            onChange={(e) => setMyPasswordInput(e.target.value)}
                            placeholder="Deixe em branco para não alterar"
                            className="w-full bg-[#111111] border border-[#222222] focus:border-[#444444] rounded-xl py-3 px-4 text-sm text-white placeholder-[#444444] outline-none transition-all"
                          />
                        </div>

                        {myCredsMessage && (
                          <div className={`p-4 text-xs font-medium rounded-xl border ${
                            myCredsMessage.type === "success" 
                              ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-300"
                              : "bg-rose-950/20 border-rose-500/20 text-rose-300"
                          }`}>
                            {myCredsMessage.text}
                          </div>
                        )}

                        <button
                          type="submit"
                          className="w-full py-4 bg-white text-black rounded-2xl font-bold text-sm hover:bg-[#dddddd] transition-all flex items-center justify-center gap-2 active:scale-98"
                        >
                          Salvar Alterações
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                {/* Tab Content: Site Settings (PIX, WhatsApp, hero) */}
                {adminTab === "site" && (
                  <div className="max-w-3xl">
                    <div className="bg-[#0a0a0a] border border-[#222222] p-6 sm:p-8 rounded-[32px] space-y-6">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <h3 className="font-bold text-lg text-white flex items-center gap-2"><Settings className="w-5 h-5" /> Configurações da Landing Page</h3>
                          <p className="text-xs text-[#666666] mt-1">Edite o PIX, WhatsApp e textos principais. As alterações aparecem ao vivo na landing.</p>
                        </div>
                        <button
                          type="button"
                          onClick={handleResetSite}
                          className="text-[10px] uppercase tracking-widest font-semibold px-3 py-2 rounded-xl border border-[#222222] text-[#888] hover:text-white hover:border-[#444]"
                        >
                          Restaurar padrão
                        </button>
                      </div>

                      <form onSubmit={handleSaveSite} className="space-y-5">
                        <fieldset className="space-y-4">
                          <legend className="text-[10px] font-mono uppercase tracking-widest text-[#666] mb-2">Pagamento PIX</legend>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-mono uppercase tracking-wider text-[#444] mb-2">Chave PIX</label>
                              <input value={siteForm.pixKey} onChange={(e) => setSiteForm({ ...siteForm, pixKey: e.target.value })} className="w-full bg-[#111] border border-[#222] focus:border-[#444] rounded-xl py-3 px-4 text-sm text-white outline-none" />
                            </div>
                            <div>
                              <label className="block text-xs font-mono uppercase tracking-wider text-[#444] mb-2">Valor (ex: 9.90)</label>
                              <input value={siteForm.pixAmount} onChange={(e) => setSiteForm({ ...siteForm, pixAmount: e.target.value })} className="w-full bg-[#111] border border-[#222] focus:border-[#444] rounded-xl py-3 px-4 text-sm text-white outline-none font-mono" />
                            </div>
                            <div>
                              <label className="block text-xs font-mono uppercase tracking-wider text-[#444] mb-2">Nome do Recebedor</label>
                              <input value={siteForm.pixName} onChange={(e) => setSiteForm({ ...siteForm, pixName: e.target.value })} maxLength={25} className="w-full bg-[#111] border border-[#222] focus:border-[#444] rounded-xl py-3 px-4 text-sm text-white outline-none" />
                            </div>
                            <div>
                              <label className="block text-xs font-mono uppercase tracking-wider text-[#444] mb-2">Cidade</label>
                              <input value={siteForm.pixCity} onChange={(e) => setSiteForm({ ...siteForm, pixCity: e.target.value })} maxLength={15} className="w-full bg-[#111] border border-[#222] focus:border-[#444] rounded-xl py-3 px-4 text-sm text-white outline-none" />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-xs font-mono uppercase tracking-wider text-[#444] mb-2">Rótulo do Preço (exibido na landing)</label>
                              <input value={siteForm.priceLabel} onChange={(e) => setSiteForm({ ...siteForm, priceLabel: e.target.value })} placeholder="R$9,90" className="w-full bg-[#111] border border-[#222] focus:border-[#444] rounded-xl py-3 px-4 text-sm text-white outline-none" />
                            </div>
                          </div>
                        </fieldset>

                        <fieldset className="space-y-4 pt-2 border-t border-[#1a1a1a]">
                          <legend className="text-[10px] font-mono uppercase tracking-widest text-[#666] mb-2">Contato</legend>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-mono uppercase tracking-wider text-[#444] mb-2">WhatsApp (com DDI, só números)</label>
                              <input value={siteForm.whatsappNumber} onChange={(e) => setSiteForm({ ...siteForm, whatsappNumber: e.target.value.replace(/\D/g, '') })} placeholder="5541999999999" className="w-full bg-[#111] border border-[#222] focus:border-[#444] rounded-xl py-3 px-4 text-sm text-white outline-none font-mono" />
                            </div>
                            <div>
                              <label className="block text-xs font-mono uppercase tracking-wider text-[#444] mb-2">E-mail de suporte</label>
                              <input type="email" value={siteForm.supportEmail} onChange={(e) => setSiteForm({ ...siteForm, supportEmail: e.target.value })} className="w-full bg-[#111] border border-[#222] focus:border-[#444] rounded-xl py-3 px-4 text-sm text-white outline-none" />
                            </div>
                          </div>
                        </fieldset>

                        <fieldset className="space-y-4 pt-2 border-t border-[#1a1a1a]">
                          <legend className="text-[10px] font-mono uppercase tracking-widest text-[#666] mb-2">Textos principais</legend>
                          <div>
                            <label className="block text-xs font-mono uppercase tracking-wider text-[#444] mb-2">Barra de urgência (topo)</label>
                            <input value={siteForm.loteText} onChange={(e) => setSiteForm({ ...siteForm, loteText: e.target.value })} className="w-full bg-[#111] border border-[#222] focus:border-[#444] rounded-xl py-3 px-4 text-sm text-white outline-none" />
                          </div>
                          <div>
                            <label className="block text-xs font-mono uppercase tracking-wider text-[#444] mb-2">Título principal (Hero)</label>
                            <textarea rows={2} value={siteForm.heroTitle} onChange={(e) => setSiteForm({ ...siteForm, heroTitle: e.target.value })} className="w-full bg-[#111] border border-[#222] focus:border-[#444] rounded-xl py-3 px-4 text-sm text-white outline-none resize-none" />
                          </div>
                          <div>
                            <label className="block text-xs font-mono uppercase tracking-wider text-[#444] mb-2">Subtítulo curto</label>
                            <textarea rows={2} value={siteForm.heroSubtitle} onChange={(e) => setSiteForm({ ...siteForm, heroSubtitle: e.target.value })} className="w-full bg-[#111] border border-[#222] focus:border-[#444] rounded-xl py-3 px-4 text-sm text-white outline-none resize-none" />
                          </div>
                        </fieldset>

                        {siteSaveMsg && (
                          <div className={`p-4 text-xs font-medium rounded-xl border ${siteSaveMsg.type === "success" ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-300" : "bg-rose-950/20 border-rose-500/20 text-rose-300"}`}>
                            {siteSaveMsg.text}
                          </div>
                        )}

                        <button type="submit" className="w-full py-4 bg-white text-black rounded-2xl font-bold text-sm hover:bg-[#dddddd] transition-all active:scale-98">
                          Salvar configurações
                        </button>
                      </form>
                    </div>
                  </div>
                )}


              </div>
            )}

          </main>
        </div>
      )}

      {/* 4. DIALOGS AND MODAL POPUPS */}

      {/* Modal: Add New User */}
      <AnimatePresence>
        {showAddUserModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddUserModal(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-[#0a0a0a] border border-[#222222] rounded-[32px] p-8 shadow-2xl z-10 overflow-hidden"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-xl text-white">Criar Novo Usuário</h3>
                <button 
                  onClick={() => setShowAddUserModal(false)}
                  className="p-2 rounded-xl bg-[#111111] border border-[#222222] text-[#444444] hover:text-white transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddUserSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-[#444444] mb-2">Usuário</label>
                  <input
                    type="text"
                    value={newUserUsername}
                    onChange={(e) => setNewUserUsername(e.target.value)}
                    placeholder="Nome de acesso do usuário"
                    className="w-full bg-[#111111] border border-[#222222] focus:border-[#444444] rounded-xl py-3 px-4 text-sm text-white placeholder-[#444444] outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-[#444444] mb-2">Senha</label>
                  <input
                    type="password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="Senha secreta de acesso"
                    className="w-full bg-[#111111] border border-[#222222] focus:border-[#444444] rounded-xl py-3 px-4 text-sm text-white placeholder-[#444444] outline-none transition-all"
                  />
                </div>

                {addUserError && (
                  <div className="p-4 bg-rose-950/20 border border-rose-500/20 text-rose-300 text-xs rounded-xl">
                    {addUserError}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-4 bg-white text-black rounded-2xl font-bold text-sm hover:bg-[#dddddd] transition-all flex items-center justify-center gap-2 active:scale-98"
                >
                  Criar Usuário
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Edit Existing User */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingUser(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-[#0a0a0a] border border-[#222222] rounded-[32px] p-8 shadow-2xl z-10 overflow-hidden"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-xl text-white">Editar Usuário</h3>
                <button 
                  onClick={() => setEditingUser(null)}
                  className="p-2 rounded-xl bg-[#111111] border border-[#222222] text-[#444444] hover:text-white transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleEditUserSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-[#444444] mb-2">Nome de Usuário</label>
                  <input
                    type="text"
                    value={editUserUsername}
                    onChange={(e) => setEditUserUsername(e.target.value)}
                    className="w-full bg-[#111111] border border-[#222222] focus:border-[#444444] rounded-xl py-3 px-4 text-sm text-white placeholder-[#444444] outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-[#444444] mb-2">Alterar Senha</label>
                  <input
                    type="password"
                    value={editUserPassword}
                    onChange={(e) => setEditUserPassword(e.target.value)}
                    placeholder="Deixe em branco para manter a atual"
                    className="w-full bg-[#111111] border border-[#222222] focus:border-[#444444] rounded-xl py-3 px-4 text-sm text-white placeholder-[#444444] outline-none transition-all"
                  />
                </div>

                {editingUser.role !== "admin" && (
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-widest text-[#444444] mb-2">Status da Conta</label>
                    <select
                      value={editUserStatus}
                      onChange={(e) => setEditUserStatus(e.target.value as "active" | "banned")}
                      className="w-full bg-[#111111] border border-[#222222] focus:border-[#444444] rounded-xl py-3 px-4 text-sm text-white outline-none transition-all"
                    >
                      <option value="active">Ativo</option>
                      <option value="banned">Banido</option>
                    </select>
                  </div>
                )}

                {editUserError && (
                  <div className="p-4 bg-rose-950/20 border border-rose-500/20 text-rose-300 text-xs rounded-xl">
                    {editUserError}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-4 bg-white text-black rounded-2xl font-bold text-sm hover:bg-[#dddddd] transition-all flex items-center justify-center gap-2 active:scale-98"
                >
                  Salvar Alterações
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Add New Script */}
      <AnimatePresence>
        {showAddScriptModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddScriptModal(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-[#0a0a0a] border border-[#222222] rounded-[32px] p-8 shadow-2xl z-10 overflow-hidden"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-xl text-white">Adicionar Script Premium</h3>
                <button 
                  onClick={() => setShowAddScriptModal(false)}
                  className="p-2 rounded-xl bg-[#111111] border border-[#222222] text-[#444444] hover:text-white transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddScriptSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-[#444444] mb-2">Título da Plataforma</label>
                  <input
                    type="text"
                    value={newScriptTitle}
                    onChange={(e) => setNewScriptTitle(e.target.value)}
                    placeholder="Ex: Khan Academy"
                    className="w-full bg-[#111111] border border-[#222222] focus:border-[#444444] rounded-xl py-3 px-4 text-sm text-white placeholder-[#444444] outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-[#444444] mb-2">Descrição Curta</label>
                  <input
                    type="text"
                    value={newScriptDesc}
                    onChange={(e) => setNewScriptDesc(e.target.value)}
                    placeholder="Descrição breve da funcionalidade"
                    className="w-full bg-[#111111] border border-[#222222] focus:border-[#444444] rounded-xl py-3 px-4 text-sm text-white placeholder-[#444444] outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-[#444444] mb-2">Conteúdo do Script</label>
                  <textarea
                    value={newScriptContent}
                    onChange={(e) => setNewScriptContent(e.target.value)}
                    placeholder="Insira as linhas de código ou o script aqui"
                    rows={6}
                    className="w-full bg-[#111111] border border-[#222222] focus:border-[#444444] rounded-xl py-3 px-4 text-sm text-white placeholder-[#444444] font-mono outline-none transition-all resize-none"
                  />
                </div>

                {addScriptError && (
                  <div className="p-4 bg-rose-950/20 border border-rose-500/20 text-rose-300 text-xs rounded-xl">
                    {addScriptError}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-4 bg-white text-black rounded-2xl font-bold text-sm hover:bg-[#dddddd] transition-all flex items-center justify-center gap-2 active:scale-98"
                >
                  Salvar Script
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Edit Existing Script */}
      <AnimatePresence>
        {editingScript && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingScript(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-[#0a0a0a] border border-[#222222] rounded-[32px] p-8 shadow-2xl z-10 overflow-hidden"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-xl text-white">Editar Script Premium</h3>
                <button 
                  onClick={() => setEditingScript(null)}
                  className="p-2 rounded-xl bg-[#111111] border border-[#222222] text-[#444444] hover:text-white transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleEditScriptSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-[#444444] mb-2">Título da Plataforma</label>
                  <input
                    type="text"
                    value={editScriptTitle}
                    onChange={(e) => setEditScriptTitle(e.target.value)}
                    className="w-full bg-[#111111] border border-[#222222] focus:border-[#444444] rounded-xl py-3 px-4 text-sm text-white outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-[#444444] mb-2">Descrição Curta</label>
                  <input
                    type="text"
                    value={editScriptDesc}
                    onChange={(e) => setEditScriptDesc(e.target.value)}
                    className="w-full bg-[#111111] border border-[#222222] focus:border-[#444444] rounded-xl py-3 px-4 text-sm text-white outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-[#444444] mb-2">Conteúdo do Script</label>
                  <textarea
                    value={editScriptContent}
                    onChange={(e) => setEditScriptContent(e.target.value)}
                    rows={6}
                    className="w-full bg-[#111111] border border-[#222222] focus:border-[#444444] rounded-xl py-3 px-4 text-sm text-white font-mono outline-none transition-all resize-none"
                  />
                </div>

                {editScriptError && (
                  <div className="p-4 bg-rose-950/20 border border-rose-500/20 text-rose-300 text-xs rounded-xl">
                    {editScriptError}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-4 bg-white text-black rounded-2xl font-bold text-sm hover:bg-[#dddddd] transition-all flex items-center justify-center gap-2 active:scale-98"
                >
                  Salvar Alterações
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
