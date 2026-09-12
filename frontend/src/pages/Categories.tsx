import { useCallback, useEffect, useState } from "react";
import { createCategory, deleteCategory, listCategories, renameCategory } from "../api/client";
import { IconTag } from "../components/icons";
import { useLanguage } from "../context/LanguageContext";
import { translateCategoryName } from "../i18n/categoryNames";
import type { Category } from "../types/admin";

export function Categories() {
  const { t, language } = useLanguage();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setIsLoading(true);
    listCategories()
      .then(setCategories)
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    if (!newName.trim()) return;
    try {
      await createCategory(newName.trim());
      setNewName("");
      refresh();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : String(err));
    }
  };

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setEditName(category.name);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setActionError(null);
    try {
      await renameCategory(editingId, editName);
      setEditingId(null);
      refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDelete = async (id: string) => {
    setActionError(null);
    try {
      await deleteCategory(id);
      refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>{t("categories.title")}</h1>
          <p className="page-subtitle">{t("categories.subtitle")}</p>
        </div>
      </div>

      <form className="card merge-panel" onSubmit={handleAdd}>
        <h2>{t("categories.addTitle")}</h2>
        <div className="merge-controls">
          <input
            className="text-input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t("categories.addPlaceholder")}
          />
          <button className="save-button merge-button" type="submit">
            {t("categories.addButton")}
          </button>
        </div>
        {addError && <p className="error-text">{addError}</p>}
      </form>

      {actionError && <p className="error-text">{actionError}</p>}

      <div className="card table-card">
        {isLoading ? (
          <p className="loading-state">{t("categories.loading")}</p>
        ) : categories.length === 0 ? (
          <p className="empty-state">{t("categories.empty")}</p>
        ) : (
          <table className="invoice-table">
            <thead>
              <tr>
                <th>{t("common.colName")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id}>
                  <td>
                    {editingId === category.id ? (
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <input value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
                        <button className="inline-action" onClick={saveEdit}>
                          {t("common.save")}
                        </button>
                        <button className="inline-action" onClick={() => setEditingId(null)}>
                          {t("common.cancel")}
                        </button>
                      </div>
                    ) : (
                      <button className="link-button row-with-avatar" onClick={() => startEdit(category)}>
                        <span className="row-avatar">
                          <IconTag width={13} height={13} />
                        </span>
                        {translateCategoryName(category.name, language)}
                      </button>
                    )}
                  </td>
                  <td>
                    <button className="inline-action" onClick={() => handleDelete(category.id)}>
                      {t("common.delete")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
