import React, { useEffect, useRef } from 'react'

export default function LiveAIFeed({ telemetry }) {
  const canvasRef = useRef(null)
  const [compact, setCompact] = React.useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const size = 320
    canvas.width = size
    canvas.height = size

    ctx.fillStyle = '#07101a'
    ctx.fillRect(0,0,size,size)

    if (!telemetry || !telemetry.position) {
      ctx.fillStyle = '#999'
      ctx.font = '14px sans-serif'
      ctx.fillText('No telemetry / perception available', 12, 20)
      return
    }

    const centerX = size/2
    const centerY = size/2

    // draw bot center
    ctx.fillStyle = '#4cc2ff'
    ctx.beginPath(); ctx.arc(centerX, centerY, 6, 0, Math.PI*2); ctx.fill();

    // draw mobs (red) and players (green) relative to bot
    const perception = telemetry.perception || {}
    const scale = 4 // blocks per pixel

    if (perception.hostileMobs && perception.hostileMobs.length) {
      perception.hostileMobs.forEach(m => {
        const dx = m.position.x - telemetry.position.x
        const dz = m.position.z - telemetry.position.z
        ctx.fillStyle = '#ff4d4d'
        ctx.beginPath(); ctx.arc(centerX + dx/scale, centerY + dz/scale, 6, 0, Math.PI*2); ctx.fill();
        // mob icon
        ctx.fillStyle = '#fff'
        ctx.font = '10px sans-serif'
        const label = (m.type && m.type[0]) ? m.type[0].toUpperCase() : 'M'
        ctx.fillText(label, centerX + dx/scale - 4, centerY + dz/scale + 3)
      })
    }

    if (perception.players && perception.players.length) {
      perception.players.forEach(p => {
        const dx = p.position.x - telemetry.position.x
        const dz = p.position.z - telemetry.position.z
        ctx.fillStyle = '#5ce67a'
        ctx.beginPath(); ctx.arc(centerX + dx/scale, centerY + dz/scale, 5, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#001'
        ctx.font = '10px sans-serif'
        ctx.fillText('P', centerX + dx/scale - 3, centerY + dz/scale + 3)
      })
    }

    if (perception.ores && perception.ores.length) {
      perception.ores.forEach(o => {
        const dx = o.position.x - telemetry.position.x
        const dz = o.position.z - telemetry.position.z
        ctx.fillStyle = '#ffd166'
        ctx.beginPath(); ctx.rect(centerX + dx/scale - 2, centerY + dz/scale - 2, 4, 4); ctx.fill();
      })
    }

    // draw horizon grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)'
    for (let i = -8; i <= 8; i++) {
      ctx.beginPath(); ctx.moveTo(centerX + i*20, 0); ctx.lineTo(centerX + i*20, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, centerY + i*20); ctx.lineTo(size, centerY + i*20); ctx.stroke();
    }

  }, [telemetry, compact])

  const perception = telemetry ? telemetry.perception : null

  const viewerPort = telemetry ? telemetry.viewerPort : null

  return (
    <div className={`panel live-ai-feed ${compact ? 'compact' : ''}`}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <h3 style={{margin:0}}>🔴 Live AI Feed</h3>
        <div>
          <button onClick={() => setCompact(c => !c)} style={{marginRight:8}}>{compact ? 'Expand' : 'Compact'}</button>
        </div>
      </div>

      {/* Legend */}
      <div style={{display:'flex', gap:12, marginTop:8, alignItems:'center'}}>
        <div style={{display:'flex', alignItems:'center', gap:6}}><div style={{width:12,height:12,background:'#4cc2ff',borderRadius:6,border:'1px solid #222'}}></div><div style={{fontSize:12,color:'#ccc'}}>Bot</div></div>
        <div style={{display:'flex', alignItems:'center', gap:6}}><div style={{width:12,height:12,background:'#ff4d4d',borderRadius:6,border:'1px solid #222'}}></div><div style={{fontSize:12,color:'#ccc'}}>Hostile</div></div>
        <div style={{display:'flex', alignItems:'center', gap:6}}><div style={{width:12,height:12,background:'#5ce67a',borderRadius:6,border:'1px solid #222'}}></div><div style={{fontSize:12,color:'#ccc'}}>Player</div></div>
        <div style={{display:'flex', alignItems:'center', gap:6}}><div style={{width:12,height:12,background:'#ffd166',borderRadius:3,border:'1px solid #222'}}></div><div style={{fontSize:12,color:'#ccc'}}>Ore</div></div>
      </div>

      <div style={{display:'flex',gap:12, marginTop:8}}>
        {viewerPort ? (
          <iframe title="ai-viewer" src={`http://127.0.0.1:${viewerPort}/`} style={{width: compact ? 240 : 320, height: compact ? 180 : 320, border:'1px solid #222'}} />
        ) : (
          <canvas ref={canvasRef} style={{border:'1px solid #222', width: compact ? 240 : 320, height: compact ? 180 : 320}} />
        )}
        <div style={{flex:1}}>
          <div style={{fontSize:12, color:'#ccc'}}>
            <div><strong>Current Goal:</strong> {telemetry && telemetry.ai && telemetry.ai.currentGoal ? telemetry.ai.currentGoal : '—'}</div>
            <div style={{marginTop:6}}><strong>Target:</strong> {telemetry && telemetry.ai && telemetry.ai.targetBlock ? telemetry.ai.targetBlock : '—'}</div>
            <div style={{marginTop:8}}><strong>Perception:</strong></div>
            <div style={{maxHeight: compact ? 120 : 220, overflow:'auto', background:'#081018', padding:8, borderRadius:4}}>
              {perception ? (
                <pre style={{whiteSpace:'pre-wrap', fontSize:12, color:'#bcd'}}>{JSON.stringify(perception, null, 2)}</pre>
              ) : (
                <div style={{color:'#666'}}>No perception data</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
