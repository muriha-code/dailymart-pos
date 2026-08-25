"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import { updateProfile } from "firebase/auth";
import { clientAuth } from "@/lib/firebase/client";
import { AppUser, UserRole } from "@/types/auth.types";
import {
  userManagementService,
  CreateUserPayload,
  UpdateUserPayload,
} from "@/services/userManagement.service";
import { useAuth } from "@/components/providers/AuthProvider";

export default function UserManagementPage() {
  const { user: currentUser, setUser: setCurrentUser, refreshUserData } = useAuth();

  // Data States
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);

  // Form States - Create
  const [addForm, setAddForm] = useState<CreateUserPayload>({
    displayName: "",
    email: "",
    password: "",
    role: "" as any,
    phone: "",
    photoURL: "",
    photoPublicId: "",
  });

  // Form States - Edit
  const [editForm, setEditForm] = useState<UpdateUserPayload>({
    displayName: "",
    role: "CASHIER",
    isActive: true,
    phone: "",
    photoURL: "",
    photoPublicId: "",
  });

  // Photo Upload States
  const [isUploadingAddPhoto, setIsUploadingAddPhoto] = useState<boolean>(false);
  const [isUploadingEditPhoto, setIsUploadingEditPhoto] = useState<boolean>(false);

  // Form States - Reset Password
  const [newPassword, setNewPassword] = useState<string>("");

  // Password Visibility Toggle States
  const [showAddPassword, setShowAddPassword] = useState<boolean>(false);
  const [showResetPassword, setShowResetPassword] = useState<boolean>(false);

  // Submitting State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Load Users
  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await userManagementService.getUsers();
      setUsers(data);
    } catch (err: any) {
      console.error("Gagal memuat pengguna:", err);
      setError(err.message || "Gagal memuat data pengguna.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Calculated KPI Summaries
  const kpiData = useMemo(() => {
    const total = users.length;
    const admin = users.filter((u) => u.role === "ADMIN").length;
    const cashier = users.filter((u) => u.role === "CASHIER").length;
    const warehouse = users.filter((u) => u.role === "WAREHOUSE").length;

    return { total, admin, cashier, warehouse };
  }, [users]);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Search
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        u.displayName.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        (u.phone && u.phone.includes(query));

      // Role Filter
      const matchesRole = roleFilter === "ALL" || u.role === roleFilter;

      // Status Filter
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && u.isActive) ||
        (statusFilter === "INACTIVE" && !u.isActive);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  // Open Add Modal
  const handleOpenAddModal = () => {
    setAddForm({
      displayName: "",
      email: "",
      password: "",
      role: "" as any,
      phone: "",
      photoURL: "",
      photoPublicId: "",
    });
    setShowAddPassword(false);
    setIsAddModalOpen(true);
  };

  // Handle Photo Upload (Cloudinary to dailymart-pos/store/foto-profil)
  const handlePhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    isEdit: boolean
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar (JPG, PNG, WEBP).");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran foto maksimal 2MB.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folderType", "dailymart-pos/store/foto-profil");

    try {
      if (isEdit) setIsUploadingEditPhoto(true);
      else setIsUploadingAddPhoto(true);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();

      if (res.ok && json.success && json.imageUrl) {
        if (isEdit) {
          // Hapus foto lama di Cloudinary jika foto diganti
          if (editForm.photoPublicId && editForm.photoPublicId !== json.publicId) {
            try {
              await fetch("/api/cloudinary/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ public_id: editForm.photoPublicId }),
              });
            } catch (delErr) {
              console.warn("Gagal menghapus foto lama di Cloudinary:", delErr);
            }
          }

          setEditForm((prev) => ({
            ...prev,
            photoURL: json.imageUrl,
            photoPublicId: json.publicId || "",
          }));
        } else {
          setAddForm((prev) => ({
            ...prev,
            photoURL: json.imageUrl,
            photoPublicId: json.publicId || "",
          }));
        }
        toast.success("Foto profil berhasil diunggah.");
      } else {
        toast.error(json.message || "Gagal mengunggah foto profil.");
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat mengunggah foto.");
    } finally {
      if (isEdit) setIsUploadingEditPhoto(false);
      else setIsUploadingAddPhoto(false);
    }
  };

  // Handle Remove Photo (Destroy in Cloudinary & clear state)
  const handleRemovePhoto = async (isEdit: boolean) => {
    const targetPublicId = isEdit ? editForm.photoPublicId : addForm.photoPublicId;
    if (targetPublicId) {
      try {
        await fetch("/api/cloudinary/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ public_id: targetPublicId }),
        });
      } catch (err) {
        console.warn("Gagal menghapus foto di Cloudinary:", err);
      }
    }

    if (isEdit) {
      setEditForm((prev) => ({ ...prev, photoURL: "", photoPublicId: "" }));
    } else {
      setAddForm((prev) => ({ ...prev, photoURL: "", photoPublicId: "" }));
    }
    toast.success("Foto profil berhasil dihapus.");
  };

  // Handle Submit Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.displayName || !addForm.email || !addForm.password || !addForm.role) {
      toast.error("Nama, Email, Kata Sandi, dan Role wajib diisi!");
      return;
    }

    if (addForm.password.length < 6) {
      toast.error("Kata sandi minimal 6 karakter!");
      return;
    }

    setIsSubmitting(true);
    try {
      await userManagementService.createUser(addForm);
      toast.success("Pengguna baru berhasil dibuat");
      setIsAddModalOpen(false);
      setAddForm({
        displayName: "",
        email: "",
        password: "",
        role: "" as any,
        phone: "",
        photoURL: "",
        photoPublicId: "",
      });
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat pengguna baru.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (user: AppUser) => {
    setSelectedUser(user);
    setEditForm({
      displayName: user.displayName,
      role: user.role,
      isActive: user.isActive,
      phone: user.phone || "",
      photoURL: user.photoURL || "",
      photoPublicId: user.photoPublicId || "",
    });
    setIsEditModalOpen(true);
  };

  // Handle Submit Edit User
  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (!editForm.displayName) {
      toast.error("Nama pengguna wajib diisi!");
      return;
    }

    setIsSubmitting(true);
    try {
      await userManagementService.updateUser(selectedUser.uid, editForm);
      toast.success("Profil pengguna berhasil diperbarui");

      // Sinkronisasi real-time dengan AuthContext & Client Firebase Auth jika user yang diedit adalah user yang sedang aktif
      if (selectedUser.uid === (currentUser?.uid || clientAuth.currentUser?.uid)) {
        if (clientAuth.currentUser) {
          try {
            await updateProfile(clientAuth.currentUser, {
              displayName: editForm.displayName,
              photoURL: editForm.photoURL || "",
            });
          } catch (authErr) {
            console.warn("Gagal update client auth profile:", authErr);
          }
        }

        if (setCurrentUser) {
          setCurrentUser((prev) => (prev ? { ...prev, ...editForm } : null));
        }

        if (refreshUserData) {
          await refreshUserData();
        }
      }

      setIsEditModalOpen(false);
      setSelectedUser(null);
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || "Gagal memperbarui pengguna.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Reset Password Modal
  const handleOpenResetPassword = (user: AppUser) => {
    setSelectedUser(user);
    setNewPassword("");
    setShowResetPassword(false);
    setIsResetModalOpen(true);
  };

  // Handle Submit Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (!newPassword || newPassword.length < 6) {
      toast.error("Kata sandi baru minimal 6 karakter!");
      return;
    }

    setIsSubmitting(true);
    try {
      await userManagementService.resetPassword(selectedUser.uid, newPassword);
      toast.success(`Kata sandi untuk pengguna ${selectedUser.displayName} berhasil diubah!`);
      setIsResetModalOpen(false);
      setSelectedUser(null);
      setNewPassword("");
    } catch (err: any) {
      toast.error(err.message || "Gagal mereset kata sandi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete User
  const handleDeleteUser = async (user: AppUser) => {
    if (
      !confirm(
        `Apakah Anda yakin ingin menghapus akun pengguna "${user.displayName}" (${user.email})? Tindakan ini tidak dapat dibatalkan.`
      )
    ) {
      return;
    }

    try {
      await userManagementService.deleteUser(user.uid);
      toast.success("Pengguna berhasil dihapus");
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus pengguna.");
    }
  };

  // Get Avatar Initials Helper
  const getInitials = (name: string) => {
    if (!name) return "US";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="w-full min-h-screen bg-slate-100 dark:bg-[#0F172A] p-4 lg:p-6 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ========================================================================= */}
        {/* 1. HEADER SECTION                                                         */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
              Manajemen Pengguna & Hak Akses
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5">
              Kelola akun pengguna, peranan hak akses (RBAC), reset kata sandi, dan status aktif staf.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="bg-[#6366F1] hover:bg-[#4F46E5] active:bg-[#4338CA] text-white font-black text-xs px-4 py-2.5 rounded-xl border-2 border-slate-900 dark:border-slate-100 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              <span>+ Tambah Pengguna Baru</span>
            </button>

            <button
              type="button"
              onClick={loadUsers}
              title="Refresh Data"
              className="bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border-2 border-slate-900 dark:border-slate-100 p-2.5 rounded-xl shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] text-slate-900 dark:text-slate-100 transition-all cursor-pointer"
            >
              <svg
                className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. 4 CARD KPI RINGKASAN                                                   */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] flex flex-col justify-between transition-all">
            <span className="text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase tracking-wider block">
              Total Pengguna
            </span>
            <span className="text-xl font-black font-mono text-slate-900 dark:text-slate-50 mt-2 block">
              {kpiData.total}{" "}
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 font-sans">akun</span>
            </span>
          </div>

          <div className="bg-[#EEF2FF] dark:bg-indigo-950/40 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] flex flex-col justify-between transition-all">
            <span className="text-[#4338CA] dark:text-indigo-300 font-black text-[10px] uppercase tracking-wider block">
              Administrator
            </span>
            <span className="text-xl font-black font-mono text-[#4338CA] dark:text-indigo-300 mt-2 block">
              {kpiData.admin}{" "}
              <span className="text-xs font-bold text-[#4338CA]/70 dark:text-indigo-300/70 font-sans">orang</span>
            </span>
          </div>

          <div className="bg-[#FEF3C7] dark:bg-amber-950/40 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] flex flex-col justify-between transition-all">
            <span className="text-[#B45309] dark:text-amber-300 font-black text-[10px] uppercase tracking-wider block">
              Kasir (Cashier)
            </span>
            <span className="text-xl font-black font-mono text-[#B45309] dark:text-amber-300 mt-2 block">
              {kpiData.cashier}{" "}
              <span className="text-xs font-bold text-[#B45309]/70 dark:text-amber-300/70 font-sans">orang</span>
            </span>
          </div>

          <div className="bg-[#E0F2FE] dark:bg-sky-950/40 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] flex flex-col justify-between transition-all">
            <span className="text-[#0369A1] dark:text-sky-300 font-black text-[10px] uppercase tracking-wider block">
              Staf Gudang
            </span>
            <span className="text-xl font-black font-mono text-[#0369A1] dark:text-sky-300 mt-2 block">
              {kpiData.warehouse}{" "}
              <span className="text-xs font-bold text-[#0369A1]/70 dark:text-sky-300/70 font-sans">orang</span>
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. TOOLBAR SEARCH & FILTERS                                               */}
        {/* ========================================================================= */}
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-3 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] flex flex-wrap items-center gap-3 mb-6 transition-colors">
          <div className="relative flex-1 min-w-[240px]">
            <svg
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari Nama Pengguna, Email, atau No. Telepon..."
              className="w-full pl-9 pr-4 py-1.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-lg text-xs font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:bg-white dark:focus:bg-slate-900 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Role:</label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)]"
              >
                <option value="ALL">Semua Role</option>
                <option value="ADMIN">ADMIN</option>
                <option value="CASHIER">CASHIER (Kasir)</option>
                <option value="WAREHOUSE">WAREHOUSE (Gudang)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)]"
              >
                <option value="ALL">Semua Status</option>
                <option value="ACTIVE">Aktif</option>
                <option value="INACTIVE">Nonaktif</option>
              </select>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. TABEL PENGGUNA FIT-WIDTH 100%                                          */}
        {/* ========================================================================= */}
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] overflow-hidden transition-colors">
          {isLoading ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400 space-y-3">
              <div className="w-8 h-8 border-4 border-[#6366F1] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Memuat data pengguna...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center text-rose-600 dark:text-rose-400 space-y-3">
              <p className="text-sm font-black">{error}</p>
              <button
                type="button"
                onClick={loadUsers}
                className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-black border-2 border-slate-900 dark:border-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] cursor-pointer"
              >
                Coba Lagi
              </button>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400 space-y-2">
              <p className="text-sm font-black text-slate-800 dark:text-slate-200">
                Tidak ada pengguna yang sesuai dengan kriteria filter.
              </p>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Coba ubah kata kunci pencarian atau filter status/role.
              </p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full table-fixed text-left border-collapse text-xs text-slate-600 dark:text-slate-300">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 border-b-2 border-slate-900 dark:border-slate-100 text-slate-900 dark:text-slate-100 font-black text-[11px] uppercase tracking-wider">
                    <th className="w-[32%] px-4 py-3.5">Pengguna & Email</th>
                    <th className="w-[18%] px-3 py-3.5 text-center">Role / Hak Akses</th>
                    <th className="w-[15%] px-3 py-3.5 text-center">Status</th>
                    <th className="w-[18%] px-3 py-3.5">No. Telepon</th>
                    <th className="w-[17%] px-4 py-3.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {filteredUsers.map((user) => {
                    const initials = getInitials(user.displayName);

                    return (
                      <tr
                        key={user.uid}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/80 transition-colors"
                      >
                        {/* Pengguna & Email */}
                        <td className="px-4 py-3.5 align-middle">
                          <div className="flex items-center gap-3">
                            {user.photoURL ? (
                              <img
                                src={user.photoURL}
                                alt={user.displayName}
                                className="w-9 h-9 rounded-lg border-2 border-slate-900 dark:border-slate-100 object-cover shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-[#FFB800] text-slate-950 font-black text-xs border-1.5 border-slate-900 dark:border-slate-100 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] flex items-center justify-center shrink-0">
                                {initials}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div
                                className="font-bold text-slate-900 dark:text-slate-100 truncate"
                                title={user.displayName}
                              >
                                {user.displayName}
                              </div>
                              <div
                                className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate"
                                title={user.email}
                              >
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Role / Hak Akses */}
                        <td className="px-3 py-3.5 align-middle text-center">
                          {user.role === "ADMIN" ? (
                            <span className="bg-[#EEF2FF] dark:bg-indigo-950/60 text-[#4338CA] dark:text-indigo-300 border-1.5 border-slate-900 dark:border-slate-100 font-mono font-bold text-[10px] px-2 py-0.5 rounded-md shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] inline-block">
                              ADMIN
                            </span>
                          ) : user.role === "CASHIER" ? (
                            <span className="bg-[#FEF3C7] dark:bg-amber-950/60 text-[#B45309] dark:text-amber-300 border-1.5 border-slate-900 dark:border-slate-100 font-mono font-bold text-[10px] px-2 py-0.5 rounded-md shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] inline-block">
                              CASHIER
                            </span>
                          ) : (
                            <span className="bg-[#E0F2FE] dark:bg-sky-950/60 text-[#0369A1] dark:text-sky-300 border-1.5 border-slate-900 dark:border-slate-100 font-mono font-bold text-[10px] px-2 py-0.5 rounded-md shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] inline-block">
                              WAREHOUSE
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-3 py-3.5 align-middle text-center">
                          {user.isActive ? (
                            <span className="bg-[#D1FAE5] dark:bg-emerald-950/60 text-[#065F46] dark:text-emerald-300 border-1.5 border-slate-900 dark:border-slate-100 font-mono font-bold text-[10px] px-2 py-0.5 rounded-md inline-block">
                              Aktif
                            </span>
                          ) : (
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-1.5 border-slate-900 dark:border-slate-100 font-mono font-bold text-[10px] px-2 py-0.5 rounded-md inline-block">
                              Nonaktif
                            </span>
                          )}
                        </td>

                        {/* No. Telepon */}
                        <td className="px-3 py-3.5 align-middle font-mono font-bold text-slate-800 dark:text-slate-200">
                          {user.phone || "-"}
                        </td>

                        {/* Aksi */}
                        <td className="px-4 py-3.5 align-middle text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(user)}
                              title="Edit Pengguna"
                              className="bg-white dark:bg-slate-800 border-1.5 border-slate-900 dark:border-slate-100 p-1.5 rounded-lg shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer text-slate-900 dark:text-slate-100"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>

                            {/* Reset Password */}
                            <button
                              type="button"
                              onClick={() => handleOpenResetPassword(user)}
                              title="Reset Password"
                              className="bg-white dark:bg-slate-800 border-1.5 border-slate-900 dark:border-slate-100 p-1.5 rounded-lg shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer text-amber-700 dark:text-amber-400"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                              </svg>
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(user)}
                              title="Hapus Pengguna"
                              className="bg-white dark:bg-slate-800 border-1.5 border-slate-900 dark:border-slate-100 p-1.5 rounded-lg shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer text-rose-600 dark:text-rose-400"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. MODAL 1: TAMBAH PENGGUNA BARU                                         */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-900 dark:border-slate-100 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 transition-colors">
            <div className="px-6 py-4 border-b-2 border-slate-900 dark:border-slate-100 flex items-center justify-between bg-slate-100 dark:bg-slate-800">
              <h3 className="font-black text-base text-slate-900 dark:text-slate-50">
                Tambah Pengguna Baru
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-900 dark:text-slate-100 hover:text-rose-600 dark:hover:text-rose-400 text-lg font-black p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              {/* Photo Upload Field at Top of Modal */}
              <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-900 dark:border-slate-100 rounded-xl">
                <div className="w-16 h-16 border-2 border-slate-900 dark:border-slate-100 rounded-xl overflow-hidden bg-amber-400 font-black text-slate-950 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] shrink-0 relative">
                  {addForm.photoURL ? (
                    <img
                      src={addForm.photoURL}
                      alt="Preview Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xl">
                      {getInitials(addForm.displayName || "Pengguna")}
                    </span>
                  )}
                  {isUploadingAddPhoto && (
                    <div className="absolute inset-0 bg-slate-950/60 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-1.5 min-w-0">
                  <label className="block text-xs font-black uppercase text-slate-800 dark:text-slate-200">
                    Foto Profil Pengguna
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="bg-slate-100 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 text-xs font-bold px-3 py-1.5 rounded-lg shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-all inline-block">
                      {isUploadingAddPhoto ? "Mengunggah..." : "Pilih Foto Profil"}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploadingAddPhoto}
                        onChange={(e) => handlePhotoUpload(e, false)}
                        className="hidden"
                      />
                    </label>

                    {addForm.photoURL && (
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(false)}
                        className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                      >
                        Hapus Foto
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-800 dark:text-slate-200 mb-1">
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addForm.displayName}
                  onChange={(e) =>
                    setAddForm({ ...addForm, displayName: e.target.value })
                  }
                  placeholder="Contoh: Budi Santoso"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-800 dark:text-slate-200 mb-1">
                  Alamat Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={addForm.email}
                  onChange={(e) =>
                    setAddForm({ ...addForm, email: e.target.value })
                  }
                  placeholder="Contoh: nama@dailymart.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-800 dark:text-slate-200 mb-1">
                  Kata Sandi Awal <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showAddPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={addForm.password}
                    onChange={(e) =>
                      setAddForm({ ...addForm, password: e.target.value })
                    }
                    placeholder="Minimal 6 karakter"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddPassword(!showAddPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors p-1 cursor-pointer"
                    title={showAddPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showAddPassword ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-800 dark:text-slate-200 mb-1">
                    Role / Akses <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={addForm.role}
                    onChange={(e) =>
                      setAddForm({ ...addForm, role: e.target.value as UserRole })
                    }
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="" disabled>
                      -- Pilih Role --
                    </option>
                    <option value="CASHIER">CASHIER (Kasir)</option>
                    <option value="WAREHOUSE">WAREHOUSE (Gudang)</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-800 dark:text-slate-200 mb-1">
                    No. Telepon / HP
                  </label>
                  <input
                    type="text"
                    value={addForm.phone}
                    onChange={(e) =>
                      setAddForm({ ...addForm, phone: e.target.value })
                    }
                    placeholder="Contoh: 081234567890"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t-2 border-slate-900 dark:border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border-2 border-slate-900 dark:border-slate-100 text-xs font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1.5px_1.5px_0px_0px_rgba(255,255,255,1)] transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] active:bg-[#4338CA] text-white text-xs font-black border-2 border-slate-900 dark:border-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {isSubmitting && (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>Simpan Pengguna</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL 2: EDIT PENGGUNA                                                */}
      {/* ========================================================================= */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-900 dark:border-slate-100 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 transition-colors">
            <div className="px-6 py-4 border-b-2 border-slate-900 dark:border-slate-100 flex items-center justify-between bg-slate-100 dark:bg-slate-800">
              <div>
                <h3 className="font-black text-base text-slate-900 dark:text-slate-50">
                  Edit Pengguna
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-mono font-bold mt-0.5">
                  {selectedUser.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-900 dark:text-slate-100 hover:text-rose-600 dark:hover:text-rose-400 text-lg font-black p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditUser} className="p-6 space-y-4">
              {/* Photo Upload Field at Top of Modal */}
              <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-900 dark:border-slate-100 rounded-xl">
                <div className="w-16 h-16 border-2 border-slate-900 dark:border-slate-100 rounded-xl overflow-hidden bg-amber-400 font-black text-slate-950 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] shrink-0 relative">
                  {editForm.photoURL ? (
                    <img
                      src={editForm.photoURL}
                      alt="Preview Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xl">
                      {getInitials(editForm.displayName || "Pengguna")}
                    </span>
                  )}
                  {isUploadingEditPhoto && (
                    <div className="absolute inset-0 bg-slate-950/60 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-1.5 min-w-0">
                  <label className="block text-xs font-black uppercase text-slate-800 dark:text-slate-200">
                    Foto Profil Pengguna
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="bg-slate-100 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 text-xs font-bold px-3 py-1.5 rounded-lg shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-all inline-block">
                      {isUploadingEditPhoto ? "Mengunggah..." : "Pilih Foto Profil"}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploadingEditPhoto}
                        onChange={(e) => handlePhotoUpload(e, true)}
                        className="hidden"
                      />
                    </label>

                    {editForm.photoURL && (
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(true)}
                        className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                      >
                        Hapus Foto
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-800 dark:text-slate-200 mb-1">
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.displayName}
                  onChange={(e) =>
                    setEditForm({ ...editForm, displayName: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-800 dark:text-slate-200 mb-1">
                    Role / Akses <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editForm.role}
                    onChange={(e) =>
                      setEditForm({ ...editForm, role: e.target.value as UserRole })
                    }
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="CASHIER">CASHIER (Kasir)</option>
                    <option value="WAREHOUSE">WAREHOUSE (Gudang)</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-800 dark:text-slate-200 mb-1">
                    Status Akun <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editForm.isActive ? "ACTIVE" : "INACTIVE"}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        isActive: e.target.value === "ACTIVE",
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="ACTIVE">Aktif (Bisa Login)</option>
                    <option value="INACTIVE">Nonaktif (Blokir)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-800 dark:text-slate-200 mb-1">
                  No. Telepon / HP
                </label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm({ ...editForm, phone: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t-2 border-slate-900 dark:border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border-2 border-slate-900 dark:border-slate-100 text-xs font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1.5px_1.5px_0px_0px_rgba(255,255,255,1)] transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] active:bg-[#4338CA] text-white text-xs font-black border-2 border-slate-900 dark:border-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {isSubmitting && (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>Update Pengguna</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MODAL 3: RESET PASSWORD                                                */}
      {/* ========================================================================= */}
      {isResetModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-900 dark:border-slate-100 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 transition-colors">
            <div className="px-6 py-4 border-b-2 border-slate-900 dark:border-slate-100 flex items-center justify-between bg-[#FEF3C7] dark:bg-amber-950/60">
              <div>
                <h3 className="font-black text-base text-[#B45309] dark:text-amber-200">
                  Reset Kata Sandi
                </h3>
                <p className="text-xs text-[#B45309] dark:text-amber-300 font-mono font-bold mt-0.5">
                  {selectedUser.displayName} ({selectedUser.email})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="text-slate-900 dark:text-slate-100 hover:text-rose-600 dark:hover:text-rose-400 text-lg font-black p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-slate-800 dark:text-slate-200 mb-1">
                  Kata Sandi Baru <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showResetPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Masukkan kata sandi baru (min 6 karakter)"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors p-1 cursor-pointer"
                    title={showResetPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showResetPassword ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-[#FEF3C7] dark:bg-amber-950/50 border-1.5 border-slate-900 dark:border-slate-100 rounded-xl text-[11px] text-[#B45309] dark:text-amber-200 font-bold shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)]">
                ⚠️ Kata sandi pengguna akan langsung diperbarui di Firebase Auth. Pastikan Anda menyampaikan kata sandi baru kepada pengguna yang bersangkutan.
              </div>

              <div className="pt-3 border-t-2 border-slate-900 dark:border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border-2 border-slate-900 dark:border-slate-100 text-xs font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1.5px_1.5px_0px_0px_rgba(255,255,255,1)] transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-black border-2 border-slate-900 dark:border-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {isSubmitting && (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>Update Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
