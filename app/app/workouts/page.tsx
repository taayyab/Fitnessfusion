"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Workout, Exercise } from "@/lib/types"
import { Dumbbell, Plus, Search, X, Trash2, Edit2 } from "lucide-react"

export default function WorkoutsPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [filtered, setFiltered] = useState<Workout[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Workout | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: "",
    description: "",
    difficulty: "intermediate" as Workout["difficulty"],
    duration: "",
    target_bmi_category: "",
    exercises: [{ name: "", sets: 3, reps: 12 }] as Exercise[],
  })

  useEffect(() => {
    fetchWorkouts()
  }, [])

  useEffect(() => {
    if (search) {
      setFiltered(workouts.filter((w) => w.title.toLowerCase().includes(search.toLowerCase())))
    } else {
      setFiltered(workouts)
    }
  }, [search, workouts])

  async function fetchWorkouts() {
    const supabase = createClient()
    const { data } = await supabase.from("workouts").select("*").order("created_at", { ascending: false })
    setWorkouts(data || [])
    setFiltered(data || [])
    setLoading(false)
  }

  function openCreate() {
    setEditId(null)
    setForm({ title: "", description: "", difficulty: "intermediate", duration: "", target_bmi_category: "", exercises: [{ name: "", sets: 3, reps: 12 }] })
    setShowForm(true)
  }

  function openEdit(workout: Workout) {
    setEditId(workout.id)
    setForm({
      title: workout.title,
      description: workout.description || "",
      difficulty: workout.difficulty,
      duration: workout.duration || "",
      target_bmi_category: workout.target_bmi_category || "",
      exercises: workout.exercises?.length ? workout.exercises : [{ name: "", sets: 3, reps: 12 }],
    })
    setShowForm(true)
  }

  function addExercise() {
    setForm({ ...form, exercises: [...form.exercises, { name: "", sets: 3, reps: 12 }] })
  }

  function removeExercise(index: number) {
    setForm({ ...form, exercises: form.exercises.filter((_, i) => i !== index) })
  }

  function updateExercise(index: number, field: string, value: string | number) {
    const updated = [...form.exercises]
    updated[index] = { ...updated[index], [field]: value }
    setForm({ ...form, exercises: updated })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const payload = {
      title: form.title,
      description: form.description || null,
      difficulty: form.difficulty,
      duration: form.duration || null,
      target_bmi_category: form.target_bmi_category || null,
      exercises: form.exercises.filter((ex) => ex.name.trim()),
      created_by: user?.id,
    }

    if (editId) {
      await supabase.from("workouts").update(payload).eq("id", editId)
    } else {
      await supabase.from("workouts").insert(payload)
    }

    setShowForm(false)
    setSaving(false)
    fetchWorkouts()
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this workout?")) return
    setDeleting(id)
    const supabase = createClient()
    await supabase.from("workouts").delete().eq("id", id)
    setDeleting(null)
    if (selected?.id === id) setSelected(null)
    fetchWorkouts()
  }

  const difficultyColor = (d: string) =>
    d === "beginner" ? "bg-green-500/10 text-green-400" :
    d === "intermediate" ? "bg-yellow-500/10 text-yellow-400" :
    "bg-red-500/10 text-red-400"

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
        <h2 className="text-white text-lg font-semibold">Workouts ({filtered.length})</h2>
        <button onClick={openCreate} className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm transition-colors">
          <Plus className="w-4 h-4" /> Create Workout
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
        <input
          type="text"
          placeholder="Search workouts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-red-500/50"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map((workout) => (
          <div
            key={workout.id}
            className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 hover:border-neutral-700 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-red-500" />
                <h3 className="text-white text-sm font-semibold">{workout.title}</h3>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(workout)} className="p-1 text-neutral-500 hover:text-white">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(workout.id)} className="p-1 text-neutral-500 hover:text-red-400">
                  {deleting === workout.id ? <div className="animate-spin w-3.5 h-3.5 border border-red-500 border-t-transparent rounded-full" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            {workout.description && <p className="text-neutral-500 text-xs mb-3 line-clamp-2">{workout.description}</p>}
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <span className={`text-xs px-2 py-0.5 rounded-full ${difficultyColor(workout.difficulty)}`}>{workout.difficulty}</span>
              {workout.duration && <span className="text-xs text-neutral-500">{workout.duration}</span>}
              {workout.target_bmi_category && <span className="text-xs bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-full">{workout.target_bmi_category}</span>}
            </div>
            <div className="flex items-center justify-between">
              <p className="text-neutral-500 text-xs">{workout.exercises?.length || 0} exercises</p>
              <button onClick={() => setSelected(workout)} className="text-xs text-red-400 hover:text-red-300">View Details</button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && <div className="text-center py-12 text-neutral-500">No workouts yet. Create your first one!</div>}

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
                <span className={`text-xs px-2 py-0.5 rounded-full ${difficultyColor(selected.difficulty)}`}>{selected.difficulty}</span>
                {selected.duration && <span className="text-xs bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-full">{selected.duration}</span>}
              </div>
              <h4 className="text-white text-sm font-medium mb-3">Exercises</h4>
              <div className="space-y-2">
                {selected.exercises?.map((ex, i) => (
                  <div key={i} className="bg-neutral-800/50 rounded-lg p-3">
                    <p className="text-white text-sm font-medium">{ex.name}</p>
                    <div className="flex gap-3 mt-1 text-xs text-neutral-500">
                      {ex.sets && <span>{ex.sets} sets</span>}
                      {ex.reps && <span>{ex.reps} reps</span>}
                      {ex.duration && <span>{ex.duration}</span>}
                      {ex.rest && <span>Rest: {ex.rest}</span>}
                    </div>
                    {ex.notes && <p className="text-neutral-600 text-xs mt-1">{ex.notes}</p>}
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
                <h3 className="text-white text-lg font-semibold">{editId ? "Edit Workout" : "Create Workout"}</h3>
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
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm text-neutral-400 mb-1">Difficulty</label>
                    <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value as Workout["difficulty"] })} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-red-500/50">
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-neutral-400 mb-1">Duration</label>
                    <input placeholder="e.g. 45 mins" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-red-500/50" />
                  </div>
                  <div>
                    <label className="block text-sm text-neutral-400 mb-1">Target BMI</label>
                    <input placeholder="e.g. Overweight" value={form.target_bmi_category} onChange={(e) => setForm({ ...form, target_bmi_category: e.target.value })} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-red-500/50" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-neutral-400">Exercises</label>
                    <button type="button" onClick={addExercise} className="text-xs text-red-400 hover:text-red-300">+ Add Exercise</button>
                  </div>
                  <div className="space-y-2">
                    {form.exercises.map((ex, i) => (
                      <div key={i} className="bg-neutral-800/50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            placeholder="Exercise name"
                            value={ex.name}
                            onChange={(e) => updateExercise(i, "name", e.target.value)}
                            className="flex-1 bg-neutral-700 border border-neutral-600 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-red-500/50"
                          />
                          {form.exercises.length > 1 && (
                            <button type="button" onClick={() => removeExercise(i)} className="text-neutral-500 hover:text-red-400">
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <input type="number" placeholder="Sets" value={ex.sets || ""} onChange={(e) => updateExercise(i, "sets", parseInt(e.target.value) || 0)} className="bg-neutral-700 border border-neutral-600 rounded px-3 py-1.5 text-white text-xs focus:outline-none focus:border-red-500/50" />
                          <input type="number" placeholder="Reps" value={ex.reps || ""} onChange={(e) => updateExercise(i, "reps", parseInt(e.target.value) || 0)} className="bg-neutral-700 border border-neutral-600 rounded px-3 py-1.5 text-white text-xs focus:outline-none focus:border-red-500/50" />
                          <input placeholder="Rest" value={ex.rest || ""} onChange={(e) => updateExercise(i, "rest", e.target.value)} className="bg-neutral-700 border border-neutral-600 rounded px-3 py-1.5 text-white text-xs focus:outline-none focus:border-red-500/50" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button type="submit" disabled={saving} className="w-full bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
                  {saving ? "Saving..." : editId ? "Update Workout" : "Create Workout"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
