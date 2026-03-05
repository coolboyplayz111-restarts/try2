import React, { useEffect, useState } from 'react'

export default function TasksPanel({ telemetry, onLog, apiToken }) {
  const [tasks, setTasks] = useState([])
  const [newTask, setNewTask] = useState('')
  const [priority, setPriority] = useState('medium')

  function addTask() {
    if (!newTask.trim()) return
    const task = {
      id: Date.now(),
      text: newTask,
      priority,
      completed: false,
      createdAt: new Date().toLocaleTimeString()
    }
    setTasks(t => {
      const next = [task, ...t]
      try { localStorage.setItem('tasks', JSON.stringify(next)) } catch (e) {}
      return next
    })
    setNewTask('')
    onLog(`Task added: ${newTask}`)
  }

  function toggleTask(id) {
    setTasks(t => {
      const next = t.map(task => task.id === id ? { ...task, completed: !task.completed } : task)
      try { localStorage.setItem('tasks', JSON.stringify(next)) } catch (e) {}
      return next
    })
  }

  function deleteTask(id) {
    setTasks(t => {
      const next = t.filter(task => task.id !== id)
      try { localStorage.setItem('tasks', JSON.stringify(next)) } catch (e) {}
      return next
    })
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem('tasks')
      if (saved) setTasks(JSON.parse(saved))
    } catch (e) {}
  }, [])

  async function doNow(task) {
    if (!apiToken && !localStorage.getItem('apiToken')) {
      onLog('No API token available to send command')
      return
    }
    const token = apiToken || localStorage.getItem('apiToken')
    try {
      const res = await fetch('/bot/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-token': token },
        body: JSON.stringify({ type: 'force-task', data: { type: 'task', text: task.text } })
      })
      const j = await res.json()
      if (j.ok) onLog(`Task sent to bot: ${task.text}`)
      else onLog(`Task send failed: ${j.error}`)
    } catch (e) {
      onLog(`Task send error: ${e.message}`)
    }
  }

  const pendingCount = tasks.filter(t => !t.completed).length
  const completedCount = tasks.filter(t => t.completed).length

  return (
    <div className="panel tasks-panel">
      <div className="panel-header">
        <h3>📋 Tasks & Goals</h3>
        <div className="task-stats">{pendingCount} pending • {completedCount} done</div>
      </div>
      <div className="task-form">
        <textarea 
          value={newTask} 
          onChange={(e) => setNewTask(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), addTask())}
          placeholder="Add a task or goal..."
        />
        <div className="form-controls">
          <select value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <button onClick={addTask} disabled={!newTask.trim()}>Add Task</button>
        </div>
      </div>
      <div className="task-list">
        {tasks.length === 0 && <div className="empty-state">No tasks yet. Add one above!</div>}
        {tasks.map(task => (
          <div key={task.id} className={`task-item priority-${task.priority} ${task.completed ? 'completed' : ''}`}>
            <input 
              type="checkbox" 
              checked={task.completed} 
              onChange={() => toggleTask(task.id)}
            />
            <div className="task-content">
              <div className="task-text">{task.text}</div>
              <div className="task-meta">{task.createdAt}</div>
            </div>
            <div className="task-actions">
              <button className="do-now-btn" onClick={() => doNow(task)}>Do Now</button>
              <button className="delete-btn" onClick={() => deleteTask(task.id)}>✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
