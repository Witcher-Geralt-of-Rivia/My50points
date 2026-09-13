"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Plus, Lock } from "lucide-react";
import AppPageHeader from "@/frontend/components/layout/AppPageHeader";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import { useAuth } from "@/frontend/contexts/AuthContext";
import { fetchAuthJson } from "@/frontend/lib/api/client";

export default function GroupsPage() {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [groups, setGroups] = useState([]);
  const [name, setName] = useState("");
  const [privacy, setPrivacy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchAuthJson("/groups")
      .then((data) => setGroups(data.groups || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [isAuthenticated]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await fetchAuthJson("/groups", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), privacyMode: privacy }),
      });
      setName("");
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
        <AppPageHeader title={t("nav.groups")} />

        {!isAuthenticated ? (
          <p className="text-zinc-500 text-sm">{t("profile.loginToView")}</p>
        ) : (
          <>
            <form onSubmit={handleCreate} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 mb-6">
              <p className="text-xs text-zinc-500 mb-3 flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" />
                Crear grupo
              </p>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre del grupo"
                className="w-full mb-2 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm"
              />
              <label className="flex items-center gap-2 text-xs text-zinc-400 mb-3">
                <input type="checkbox" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} />
                Modo privado (oculta cupos admin disponibles)
              </label>
              <button type="submit" className="w-full py-2 rounded-lg bg-purple text-sm font-bold">
                Crear
              </button>
            </form>

            {error ? <p className="text-red-400 text-sm mb-4">{error}</p> : null}
            {loading ? (
              <p className="text-zinc-500 text-sm">Cargando...</p>
            ) : groups.length === 0 ? (
              <p className="text-zinc-500 text-sm">No perteneces a ningun grupo aun.</p>
            ) : (
              <ul className="space-y-2">
                {groups.map((g) => (
                  <li key={g.id}>
                    <Link
                      href={`/groups/${g.id}`}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 hover:bg-white/[0.06]"
                    >
                      <span className="font-semibold">{g.name}</span>
                      <span className="text-xs text-zinc-500">
                        {g.role} · {g.memberCount} miembros
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
    </>
  );
}
