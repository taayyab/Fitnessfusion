"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Meal, MealItem } from "@/lib/types"
import { UtensilsCrossed, Plus, Search, X, Trash2, Edit2, Flame } from "lucide-react"

export default function MealsPage() {
  const [meals, setMeals] = useState<Meal[]>([])
  const [filtered, setFiltered] = useState<Meal[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Meal | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: "",
    description: "",
    goal_type: "",
    total_calories: "",
    meal_data: [{ name: "", type: "breakfast", calories: 0, protein: 0, carbs: 0, fat: 0 }] as MealItem[],
  })

  useEffect(() => {
    fetchMeals()
  }, [])

  useEffect(() => {
    if (search) {
      setFiltered(meals.filter((m) => m.title.toLowerCase().includes(search.toLowerCase())))
    } else {
      setFiltered(meals)
    }
  }, [search, meals])

  async function fetchMeals() {
    const supabase = createClient()
    const { data } = await supabase.from("meals").select("*").order("created_at", { ascending: false })
    setMeals(data || [])
    setFiltered(data || [])
    setLoading(false)
  }

  function openCreate() {
    setEditId(null)
    setForm({ title: "", description: "", goal_type: "", total_calories: "", meal_data: [{ name: "", type: "breakfast", calories: 0, protein: 0, carbs: 0, fat: 0 }] })
    setShowForm(true)
  }

  function openEdit(meal: Meal) {
    setEditId(meal.id)
    setForm({
      title: meal.title,
      description: meal.description || "",
      goal_type: meal.goal_type || "",
      total_calories: meal.total_calories?.toString() || "",
      meal_data: meal.meal_data?.length ? meal.meal_data : [{ name: "", type: "breakfast", calories: 0, protein: 0, carbs: 0, fat: 0 }],
    })
    setShowForm(true)
  }

  function addMealItem() {
    setForm({ ...form, meal_data: [...form.meal_data, { name: "", type: "snack", calories: 0, protein: 0, carbs: 0, fat: 0 }] })
  }

  function removeMealItem(index: number) {
    setForm({ ...form, meal_data: form.meal_data.filter((_, i) => i !== index) })
  }

  function updateMealItem(index: number, field: string, value: string | number) {
    const updated = [...form.meal_data]
    updated[index] = { ...updated[index], [field]: value }
    setForm({ ...form, meal_data: updated })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const validItems = form.meal_data.filter((item) => item.name.trim())
    const payload = {
      title: form.title,
      description: form.description || null,
      goal_type: form.goal_type || null,
      total_calories: form.total_calories ? parseInt(form.total_calories) : validItems.reduce((sum, m) => sum + (m.calories || 0), 0),
      meal_data: validItems,
      created_by: user?.id,
    }

    if (editId) {
      await supabase.from("meals").update(payload).eq("id", editId)
    } else {
      await supabase.from("meals").insert(payload)
    }

    setShowForm(false)
    setSaving(false)
    fetchMeals()
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this meal plan?")) return
    setDeleting(id)
    const supabase = createClient()
    await supabase.from("meals").delete().eq("id", id)
    setDeleting(null)
    if (selected?.id === id) setSelected(null)
    fetchMeals()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-white text-lg font-semibold">Meal Plans ({filtered.length})</h2>
        <button onClick={openCreate} className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm transition-colors">
          <Plus className="w-4 h-4" /> Create Meal Plan
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
        <input
          type="text"
          placeholder="Search meal plans..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-red-500/50"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map((meal) => (
          <div key={meal.id} className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 hover:border-neutral-700 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4 text-orange-500" />
                <h3 className="text-white text-sm font-semibold">{meal.title}</h3>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(meal)} className="p-1 text-neutral-500 hover:text-white"><Edit2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleDelete(meal.id)} className="p-1 text-neutral-500 hover:text-red-400">
                  {deleting === meal.id ? <div className="animate-spin w-3.5 h-3.5 border border-red-500 border-t-transparent rounded-full" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            {meal.description && <p className="text-neutral-500 text-xs mb-3 line-clamp-2">{meal.description}</p>}
            <div className="flex items-center gap-2 flex-wrap mb-3">
              {meal.total_calories && (
                <span className="flex items-center gap-1 text-xs bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-full">
                  <Flame className="w-3 h-3" /> {meal.total_calories} kcal
                </span>
              )}
              {meal.goal_type && <span className="text-xs bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-full">{meal.goal_type}</span>}
            </div>
            <div className="flex items-center justify-between">
              <p className="text-neutral-500 text-xs">{meal.meal_data?.length || 0} items</p>
              <button onClick={() => setSelected(meal)} className="text-xs text-red-400 hover:text-red-300">View Details</button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && <div className="text-center py-12 text-neutral-500">No meal plans yet. Create your first one!</div>}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white text-lg font-semibold">{selected.title}</h3>
                <button onClick={() => setSelected(null)} className="text-neutral-500 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              {selected.description && <p className="text-neutral-400 text-sm mb-4">{selected.description}</p>}
              <div className="flex gap-2 mb-4">
                {selected.total_calories && <span className="flex items-center gap-1 text-xs bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-full"><Flame className="w-3 h-3" /> {selected.total_calories} kcal</span>}
                {selected.goal_type && <span className="text-xs bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-full">{selected.goal_type}</span>}
              </div>
              <h4 className="text-white text-sm font-medium mb-3">Meal Items</h4>
              <div className="space-y-2">
                {selected.meal_data?.map((item, i) => (
                  <div key={i} className="bg-neutral-800/50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-white text-sm font-medium">{item.name}</p>
                      {item.type && <span className="text-xs bg-neutral-700 text-neutral-400 px-2 py-0.5 rounded-full capitalize">{item.type}</span>}
                    </div>
                    <div className="flex gap-3 mt-1 text-xs text-neutral-500">
                      {item.calories ? <span>{item.calories} cal</span> : null}
                      {item.protein ? <span>{item.protein}g protein</span> : null}
                      {item.carbs ? <span>{item.carbs}g carbs</span> : null}
                      {item.fat ? <span>{item.fat}g fat</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white text-lg font-semibold">{editId ? "Edit Meal Plan" : "Create Meal Plan"}</h3>
                <button onClick={() => setShowForm(false)} className="text-neutral-500 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">Title</label>
                  <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500/50" />
                </div>
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">Description</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500/50 resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-neutral-400 mb-1">Goal Type</label>
                    <input placeholder="e.g. Weight Loss" value={form.goal_type} onChange={(e) => setForm({ ...form, goal_type: e.target.value })} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-red-500/50" />
                  </div>
                  <div>
                    <label className="block text-sm text-neutral-400 mb-1">Total Calories</label>
                    <input type="number" placeholder="Auto-calculated" value={form.total_calories} onChange={(e) => setForm({ ...form, total_calories: e.target.value })} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-red-500/50" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-neutral-400">Meal Items</label>
                    <button type="button" onClick={addMealItem} className="text-xs text-red-400 hover:text-red-300">+ Add Item</button>
                  </div>
                  <div className="space-y-2">
                    {form.meal_data.map((item, i) => (
                      <div key={i} className="bg-neutral-800/50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <input placeholder="Food name" value={item.name} onChange={(e) => updateMealItem(i, "name", e.target.value)} className="flex-1 bg-neutral-700 border border-neutral-600 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-red-500/50" />
                          <select value={item.type || "snack"} onChange={(e) => updateMealItem(i, "type", e.target.value)} className="bg-neutral-700 border border-neutral-600 rounded px-2 py-1.5 text-white text-xs focus:outline-none">
                            <option value="breakfast">Breakfast</option>
                            <option value="lunch">Lunch</option>
                            <option value="dinner">Dinner</option>
                            <option value="snack">Snack</option>
                          </select>
                          {form.meal_data.length > 1 && (
                            <button type="button" onClick={() => removeMealItem(i)} className="text-neutral-500 hover:text-red-400"><X className="w-4 h-4" /></button>
                          )}
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          <input type="number" placeholder="Calories" value={item.calories || ""} onChange={(e) => updateMealItem(i, "calories", parseInt(e.target.value) || 0)} className="bg-neutral-700 border border-neutral-600 rounded px-2 py-1.5 text-white text-xs focus:outline-none" />
                          <input type="number" placeholder="Protein(g)" value={item.protein || ""} onChange={(e) => updateMealItem(i, "protein", parseInt(e.target.value) || 0)} className="bg-neutral-700 border border-neutral-600 rounded px-2 py-1.5 text-white text-xs focus:outline-none" />
                          <input type="number" placeholder="Carbs(g)" value={item.carbs || ""} onChange={(e) => updateMealItem(i, "carbs", parseInt(e.target.value) || 0)} className="bg-neutral-700 border border-neutral-600 rounded px-2 py-1.5 text-white text-xs focus:outline-none" />
                          <input type="number" placeholder="Fat(g)" value={item.fat || ""} onChange={(e) => updateMealItem(i, "fat", parseInt(e.target.value) || 0)} className="bg-neutral-700 border border-neutral-600 rounded px-2 py-1.5 text-white text-xs focus:outline-none" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button type="submit" disabled={saving} className="w-full bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
                  {saving ? "Saving..." : editId ? "Update Meal Plan" : "Create Meal Plan"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
