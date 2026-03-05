import React, { useState, useEffect } from 'react'

export default function TogglesPanel({ apiToken, onLog }) {
  const [toggles, setToggles] = useState({
    aiChat: true,
    farming: false,
    mining: false,
    combat: false,
    survival: true,
    building: false,
    crafting: false,
    inventory: true,
    pathfinding: true,
    learning: true
  })

  const handleToggle = async (feature, value) => {
    try {
      const response = await fetch('/api/toggles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`
        },
        body: JSON.stringify({ feature, enabled: value })
      })

      if (response.ok) {
        setToggles(prev => ({ ...prev, [feature]: value }))
        onLog(`Toggled ${feature}: ${value ? 'ON' : 'OFF'}`)
      } else {
        onLog(`Failed to toggle ${feature}`)
      }
    } catch (error) {
      onLog(`Error toggling ${feature}: ${error.message}`)
    }
  }

  useEffect(() => {
    // Load current toggle states
    fetch('/api/toggles', {
      headers: { 'Authorization': `Bearer ${apiToken}` }
    })
      .then(res => res.json())
      .then(data => setToggles(data))
      .catch(err => onLog(`Failed to load toggles: ${err.message}`))
  }, [apiToken, onLog])

  return (
    <div className="toggles-panel">
      <h2>Feature Toggles</h2>
      <div className="toggles-grid">
        {Object.entries(toggles).map(([feature, enabled]) => (
          <div key={feature} className="toggle-item">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => handleToggle(feature, e.target.checked)}
              />
              <span className="toggle-slider"></span>
              <span className="toggle-text">{feature.charAt(0).toUpperCase() + feature.slice(1)}</span>
            </label>
          </div>
        ))}
      </div>
    </div>
  )
}