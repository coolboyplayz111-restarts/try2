import React from 'react'

export default function ControlPanel({ apiToken, onLog, telemetry }) {
  const [autoReconnect, setAutoReconnect] = React.useState(true)
  const [autoMove, setAutoMove] = React.useState(false)
  const [structures, setStructures] = React.useState([])
  const [selectedStructure, setSelectedStructure] = React.useState('')
  const send = async (type, data) => {
    try {
      const res = await fetch('/bot/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-token': apiToken },
        body: JSON.stringify({ type, data })
      });
      const j = await res.json();
      onLog(`Sent ${type} command: ${j.ok ? 'OK' : j.error}`);
    } catch (e) {
      onLog(`Command error: ${e.message}`);
    }
  }
  const [goto, setGoto] = React.useState('')

  // update available structures when telemetry arrives
  React.useEffect(() => {
    if (telemetry && telemetry.ai && Array.isArray(telemetry.ai.structures)) {
      setStructures(telemetry.ai.structures);
      if (!selectedStructure && telemetry.ai.structures.length > 0) {
        setSelectedStructure(telemetry.ai.structures[0]);
      }
    }
  }, [telemetry]);

  return (
    <div className="panel">
      <h3>Control Panel</h3>
      <div className="button-grid">
        <button onClick={() => send('reconnect')}>Reconnect Bot</button>
        <button onClick={() => send('pause')}>Pause AI</button>
        <button onClick={() => send('resume')}>Resume AI</button>
        <button onClick={() => send('force-task', { type: 'mine', oreType: 'diamond' })}>Force Mining</button>
        <button onClick={() => send('force-task', { type: 'explore' })}>Force Exploration</button>
        <button onClick={() => {
          const next = !autoReconnect
          setAutoReconnect(next)
          send('toggle-reconnect', { enabled: next })
        }}>{autoReconnect ? 'Auto Reconnect: ON' : 'Auto Reconnect: OFF'}</button>

        <button onClick={() => {
          const next = !autoMove
          setAutoMove(next)
          send('toggle-auto-move', { enabled: next })
        }}>{autoMove ? 'Auto Move: ON' : 'Auto Move: OFF'}</button>
      </div>
      {structures.length > 0 && (
        <div style={{marginTop:'8px'}}>
          <label style={{marginRight:'4px'}}>Build:</label>
          <select value={selectedStructure} onChange={e=>setSelectedStructure(e.target.value)}>
            {structures.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button style={{marginLeft:'4px'}} onClick={() => {
            if (selectedStructure) {
              send('force-task', { type: 'build', structure: selectedStructure });
            } else {
              onLog('No structure selected');
            }
          }}>Build</button>
        </div>
      )}
      <div style={{marginTop:'8px'}}>
        <input style={{width:'60%'}} placeholder="Goto x y z" value={goto} onChange={e=>setGoto(e.target.value)} />
        <button onClick={()=>{
          const parts = goto.trim().split(/[ ,]+/).map(Number);
          if(parts.length>=3 && parts.every(n=>!isNaN(n))){
            send('force-task',{ type:'move', x:parts[0], y:parts[1], z:parts[2]});
            setGoto('');
          } else {
            onLog('Invalid goto coords');
          }
        }}>Go</button>
      </div>
    </div>
  )
}
