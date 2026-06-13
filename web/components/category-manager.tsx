'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  createCategory, updateCategory, deleteCategory, seedCategories,
  type FinancialCategory,
} from '@/store/categoriesSlice';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pencil, Plus, Trash2, Sparkles } from 'lucide-react';

const PRESET_COLORS = [
  '#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#6366f1', '#9ca3af',
  '#ef4444', '#f97316', '#eab308', '#ec4899', '#3b82f6', '#a855f7',
  '#14b8a6', '#64748b', '#e11d48',
];

interface Props {
  open: boolean;
  onClose: () => void;
  type: 'INCOME' | 'EXPENSE';
}

export function CategoryManager({ open, onClose, type }: Props) {
  const dispatch = useAppDispatch();
  const { items } = useAppSelector((s) => s.categories);
  const filtered = items.filter((c) => c.type === type);

  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6366f1');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [loading, setLoading] = useState(false);

  const title = type === 'INCOME' ? 'Categorias de entrada' : 'Categorias de saída';

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setLoading(true);
    const res = await dispatch(createCategory({ name: newName.trim(), type, color: newColor }));
    setLoading(false);
    if (createCategory.fulfilled.match(res)) {
      toast.success('Categoria criada');
      setNewName('');
      setNewColor('#6366f1');
    } else {
      toast.error(typeof res.payload === 'string' ? res.payload : 'Nome já existe');
    }
  }

  async function onSeedDefault() {
    setLoading(true);
    await dispatch(seedCategories());
    setLoading(false);
    toast.success('Categorias padrão adicionadas');
  }

  function startEdit(cat: FinancialCategory) {
    setEditId(cat.id);
    setEditName(cat.name);
    setEditColor(cat.color);
  }

  async function onSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    setLoading(true);
    const res = await dispatch(updateCategory({ id: editId, name: editName.trim(), color: editColor }));
    setLoading(false);
    if (updateCategory.fulfilled.match(res)) {
      toast.success('Categoria atualizada');
      setEditId(null);
    } else {
      toast.error(typeof res.payload === 'string' ? res.payload : 'Erro ao atualizar');
    }
  }

  async function onDelete(cat: FinancialCategory) {
    if (!window.confirm(`Remover a categoria "${cat.name}"? Cobranças existentes com essa categoria não serão afetadas.`)) return;
    const res = await dispatch(deleteCategory(cat.id));
    if (deleteCategory.fulfilled.match(res)) toast.success('Categoria removida');
    else toast.error('Erro ao remover');
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">{title}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
          {filtered.length === 0 && (
            <div className="rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-400">
              Nenhuma categoria ainda.{' '}
              <button
                onClick={() => void onSeedDefault()}
                className="font-semibold text-indigo-600 hover:text-indigo-700"
              >
                Adicionar padrões
              </button>
            </div>
          )}

          {filtered.map((cat) =>
            editId === cat.id ? (
              <form key={cat.id} onSubmit={onSaveEdit}
                className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 p-2">
                <input
                  type="color"
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  className="h-7 w-7 cursor-pointer rounded border-none bg-transparent p-0"
                />
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-8 flex-1 rounded-lg border-indigo-200 bg-white text-sm"
                  autoFocus
                />
                <button type="submit" disabled={loading}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
                  Salvar
                </button>
                <button type="button" onClick={() => setEditId(null)}
                  className="rounded-lg px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-100">
                  Cancelar
                </button>
              </form>
            ) : (
              <div key={cat.id}
                className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-3 py-2.5 hover:bg-gray-50">
                <span className="h-3 w-3 flex-shrink-0 rounded-full" style={{ background: cat.color }} />
                <span className="flex-1 text-sm text-gray-800">{cat.name}</span>
                {cat.isDefault && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-400">
                    padrão
                  </span>
                )}
                <button onClick={() => startEdit(cat)}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 hover:bg-gray-200 hover:text-gray-700">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => void onDelete(cat)}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-500">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ),
          )}
        </div>

        {/* Adicionar nova */}
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500">Nova categoria</p>
          <form onSubmit={onAdd} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="space-y-1">
                <Label className="text-[11px] text-gray-500">Cor</Label>
                <input
                  type="color"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="h-9 w-9 cursor-pointer rounded-lg border border-gray-200 bg-white p-1"
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-[11px] text-gray-500">Nome</Label>
                <Input
                  placeholder="Ex: Freelance, Aluguel..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="rounded-xl border-gray-200 bg-gray-50"
                />
              </div>
            </div>
            {/* palette rápida */}
            <div className="flex flex-wrap gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  className={`h-5 w-5 rounded-full transition-transform hover:scale-110 ${newColor === c ? 'ring-2 ring-offset-1 ring-gray-700' : ''}`}
                  style={{ background: c }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!newName.trim() || loading}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gray-900 py-2 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Adicionar
              </button>
              {filtered.length === 0 && (
                <button
                  type="button"
                  onClick={() => void onSeedDefault()}
                  disabled={loading}
                  className="flex items-center gap-1.5 rounded-xl border border-indigo-200 px-3 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Usar padrões
                </button>
              )}
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
