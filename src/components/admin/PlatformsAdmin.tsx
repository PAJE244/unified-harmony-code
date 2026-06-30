import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Plus, Edit2, Trash2, Copy as CopyIcon, GripVertical, Eye, EyeOff } from "lucide-react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext, arrayMove, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { AdminScript } from "@/lib/scriptando-db";
import { apiFetch } from "@/lib/scriptando-db";
import { getLucideIcon } from "@/components/scripts/iconRegistry";
import PlatformEditor from "./PlatformEditor";

interface Props {
  token: string;
  onToast: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
}

export default function PlatformsAdmin({ token, onToast }: Props) {
  const [items, setItems] = useState<AdminScript[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AdminScript | null>(null);

  const load = async () => {
    setLoading(true);
    const r = await apiFetch("/api/admin/scripts", { headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) setItems(await r.json());
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex((i) => i.id === active.id);
    const newIdx = items.findIndex((i) => i.id === over.id);
    const next = arrayMove(items, oldIdx, newIdx);
    setItems(next);
    await apiFetch("/api/admin/scripts/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ids: next.map((i) => i.id) }),
    });
  };

  const handleCreate = async () => {
    const r = await apiFetch("/api/admin/scripts", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: "Nova plataforma", content: "", description: "" }),
    });
    if (r.ok) {
      const created = await r.json();
      setItems((p) => [...p, created]);
      setEditing(created);
      onToast("Plataforma criada. Edite os detalhes.", "success");
    }
  };

  const handleDuplicate = async (id: string) => {
    const r = await apiFetch(`/api/admin/scripts/${id}/duplicate`, {
      method: "POST", headers: { Authorization: `Bearer ${token}` },
    });
    if (r.ok) { const c = await r.json(); setItems((p) => [...p, c]); onToast("Plataforma duplicada.", "success"); }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Excluir permanentemente "${title}"?`)) return;
    const r = await apiFetch(`/api/admin/scripts/${id}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` },
    });
    if (r.ok) { setItems((p) => p.filter((i) => i.id !== id)); onToast("Plataforma excluída.", "success"); }
  };

  const handleSave = async (id: string, patch: Partial<AdminScript>): Promise<AdminScript | null> => {
    const r = await apiFetch(`/api/admin/scripts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(patch),
    });
    if (!r.ok) return null;
    const updated = await r.json();
    setItems((p) => p.map((i) => (i.id === id ? updated : i)));
    return updated;
  };

  const toggleActive = async (it: AdminScript) => {
    const updated = await handleSave(it.id, { active: !it.active });
    if (updated) onToast(updated.active ? "Plataforma ativada." : "Plataforma desativada.", "info");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold text-white">Plataformas</h3>
          <p className="text-xs text-white/50">Gerencie todas as plataformas disponíveis na biblioteca. Arraste para reordenar.</p>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-black font-semibold text-sm hover:bg-white/90 transition-all active:scale-[0.98]"
        ><Plus className="w-4 h-4" /> Nova plataforma</button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-3xl bg-white/5 border border-white/10 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/15 p-12 text-center text-white/50">
          Nenhuma plataforma cadastrada. Clique em "Nova plataforma" para começar.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {items.map((it) => (
                <SortableRow
                  key={it.id}
                  item={it}
                  onEdit={() => setEditing(it)}
                  onDelete={() => handleDelete(it.id, it.title)}
                  onDuplicate={() => handleDuplicate(it.id)}
                  onToggleActive={() => toggleActive(it)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {editing && (
        <PlatformEditor
          script={editing}
          onClose={() => setEditing(null)}
          onSave={(patch) => handleSave(editing.id, patch)}
        />
      )}
    </div>
  );
}

function SortableRow({ item, onEdit, onDelete, onDuplicate, onToggleActive }: {
  item: AdminScript;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggleActive: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const Icon = getLucideIcon(item.icon);
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div
      ref={setNodeRef} style={style}
      className="group flex items-center gap-4 p-4 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.05] hover:border-white/20 transition-all"
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-white/30 hover:text-white/70 p-1">
        <GripVertical className="w-5 h-5" />
      </button>
      <div className="w-11 h-11 rounded-xl border border-white/10 bg-white/[0.04] flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="font-semibold text-white truncate">{item.title}</h4>
          {!item.active && <span className="px-2 py-0.5 text-[9px] uppercase tracking-wider rounded-md bg-white/5 border border-white/10 text-white/50">Inativa</span>}
          <span className="px-2 py-0.5 text-[9px] uppercase tracking-wider rounded-md bg-white/5 border border-white/10 text-white/60">{item.status}</span>
        </div>
        <p className="text-xs text-white/50 truncate mt-0.5">{item.shortDescription || item.description || "Sem descrição"}</p>
      </div>
      <div className="hidden sm:flex items-center gap-2">
        <button onClick={onToggleActive} title={item.active ? "Desativar" : "Ativar"} className="p-2 rounded-lg border border-white/10 text-white/70 hover:text-white hover:bg-white/5">
          {item.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
        <button onClick={onDuplicate} title="Duplicar" className="p-2 rounded-lg border border-white/10 text-white/70 hover:text-white hover:bg-white/5">
          <CopyIcon className="w-4 h-4" />
        </button>
        <button onClick={onEdit} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-xs font-semibold text-white hover:bg-white/10">
          <Edit2 className="w-3.5 h-3.5" /> Editar
        </button>
        <button onClick={onDelete} title="Excluir" className="p-2 rounded-lg border border-rose-500/20 bg-rose-500/5 text-rose-300 hover:text-rose-200">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <button onClick={onEdit} className="sm:hidden px-3 py-2 rounded-lg bg-white text-black text-xs font-bold">Abrir</button>
    </div>
  );
}
