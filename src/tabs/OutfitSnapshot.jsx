import { useMemo, useState } from 'react'
import { TAB_RAINBOW } from '../constants'

const OUTFIT_SLOTS = [
  { id: 'head', label: 'Head / Hat' },
  { id: 'hair', label: 'Hair / Hairpiece' },
  { id: 'face', label: 'Face / Mask' },
  { id: 'neck', label: 'Neck / Necklace' },
  { id: 'shoulders', label: 'Shoulders / Cape' },
  { id: 'torso_outer', label: 'Torso - Outer' },
  { id: 'torso_under', label: 'Torso - Under' },
  { id: 'waist', label: 'Waist / Belt' },
  { id: 'hands', label: 'Hands / Gloves' },
  { id: 'ring_left', label: 'Left Hand - Ring' },
  { id: 'ring_right', label: 'Right Hand - Ring' },
  { id: 'legs', label: 'Legs' },
  { id: 'feet', label: 'Feet / Boots' },
  { id: 'bag', label: 'Bag / Pouch' },
  { id: 'weapon_main', label: 'Weapon - Main' },
  { id: 'weapon_off', label: 'Weapon - Off Hand' },
  { id: 'accessory_1', label: 'Accessory 1' },
  { id: 'accessory_2', label: 'Accessory 2' },
]

function SlotPicker({ slot, charItems, value, onChange, tabColor }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontSize: '0.69em', fontWeight: 700, color: 'var(--mut)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 3 }}>{slot.label}</div>
      <select value={value || ''} onChange={e => onChange(slot.id, e.target.value)}
        style={{ width: '100%', fontSize: '0.77em', padding: '4px 8px', background: 'var(--sf)', border: `1px solid ${value ? tabColor : 'var(--brd)'}`, borderRadius: 6, color: 'var(--tx)' }}>
        <option value="">- empty -</option>
        {charItems.map(item => (
          <option key={item.id} value={item.id}>{item.name}</option>
        ))}
      </select>
      {value && (() => {
        const item = charItems.find(i => i.id === value)
        return item?.color_material ? (
          <div style={{ fontSize: '0.69em', color: 'var(--mut)', marginTop: 2, paddingLeft: 4 }}>{item.color_material}</div>
        ) : null
      })()}
    </div>
  )
}

export default function OutfitSnapshot({ db, chars, allEntries }) {
  const tabColor = TAB_RAINBOW.items || '#aaaaaa'
  const [selectedChar, setSelectedChar] = useState('')
  const [slots, setSlots] = useState({})
  const [snapshotName, setSnapshotName] = useState('')
  const [linkedScene, setLinkedScene] = useState('')
  const [savedSnapshots, setSavedSnapshots] = useState(() => {
    try { return JSON.parse(db.getSetting?.('outfit_snapshots') || '[]') } catch { return [] }
  })
  const [showSaved, setShowSaved] = useState(false)

  const charObj = chars.find(c => c.id === selectedChar)
  const charItems = useMemo(() => {
    if (!selectedChar) return []
    return allEntries.filter(e => (e.character || e.holder) === selectedChar)
  }, [allEntries, selectedChar])

  function setSlot(slotId, itemId) {
    setSlots(prev => ({ ...prev, [slotId]: itemId }))
  }

  function saveSnapshot() {
    if (!selectedChar || !snapshotName.trim()) return
    const snapshot = {
      id: Date.now().toString(),
      name: snapshotName.trim(),
      character: selectedChar,
      characterName: charObj?.name || selectedChar,
      scene: linkedScene,
      slots: { ...slots },
      created: new Date().toISOString(),
    }
    const next = [snapshot, ...savedSnapshots]
    setSavedSnapshots(next)
    db.saveSetting?.('outfit_snapshots', JSON.stringify(next))
    setSnapshotName('')
    setLinkedScene('')
  }

  function deleteSnapshot(id) {
    const next = savedSnapshots.filter(s => s.id !== id)
    setSavedSnapshots(next)
    db.saveSetting?.('outfit_snapshots', JSON.stringify(next))
  }

  function loadSnapshot(snap) {
    setSelectedChar(snap.character)
    setSlots(snap.slots || {})
    setSnapshotName(snap.name)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: '1.08em', color: tabColor }}>Outfit Snapshot</div>
        <button onClick={() => setShowSaved(s => !s)}
          style={{ fontSize: '0.77em', padding: '3px 10px', borderRadius: 10, background: showSaved ? tabColor : 'none', color: showSaved ? '#000' : 'var(--dim)', border: `1px solid ${tabColor}`, cursor: 'pointer' }}>
          Saved ({savedSnapshots.length})
        </button>
      </div>

      {showSaved && (
        <div style={{ marginBottom: 14, padding: '10px 14px', background: 'var(--card)', border: '1px solid var(--brd)', borderRadius: 8 }}>
          <div style={{ fontSize: '0.77em', color: 'var(--mut)', marginBottom: 8 }}>All saved outfit snapshots</div>
          {savedSnapshots.length === 0 && <div style={{ fontSize: '0.85em', color: 'var(--mut)' }}>No snapshots saved yet.</div>}
          {savedSnapshots.map(snap => {
            const filledSlots = OUTFIT_SLOTS.filter(slot => snap.slots && snap.slots[slot.id])
            return (
              <div key={snap.id} style={{ borderLeft: `3px solid ${tabColor}`, marginBottom: 6, background: 'var(--sf)', borderRadius: '0 6px 6px 0', padding: '8px 10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.85em', fontWeight: 600 }}>{snap.name}</div>
                    <div style={{ fontSize: '0.69em', color: 'var(--mut)' }}>{snap.characterName}{snap.scene ? ` · ${snap.scene}` : ''}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => loadSnapshot(snap)}
                      style={{ fontSize: '0.69em', padding: '2px 8px', borderRadius: 6, background: 'none', border: `1px solid ${tabColor}`, color: tabColor, cursor: 'pointer' }}>↻ Load</button>
                    <button onClick={() => deleteSnapshot(snap.id)}
                      style={{ fontSize: '0.69em', padding: '2px 8px', borderRadius: 6, background: 'none', border: '1px solid #ff335544', color: '#ff3355', cursor: 'pointer' }}>✕</button>
                  </div>
                </div>
                {filledSlots.length > 0 && (
                  <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--brd)', fontSize: '0.77em', color: 'var(--dim)', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2px 8px' }}>
                    {filledSlots.map(slot => {
                      const itemId = snap.slots[slot.id]
                      const item = (allEntries || []).find(e => e.id === itemId)
                      return (
                        <div key={slot.id} style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <span style={{ color: 'var(--mut)' }}>{slot.label}:</span> {item ? item.name : '(missing item)'}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="field" style={{ marginBottom: 12 }}>
        <label>Character</label>
        <select value={selectedChar} onChange={e => { setSelectedChar(e.target.value); setSlots({}) }}>
          <option value="">- Pick character -</option>
          {[...chars].sort((a, b) => (a.display_name || a.name || '').localeCompare(b.display_name || b.name || '')).map(c => (
            <option key={c.id} value={c.id}>{c.display_name || c.name}</option>
          ))}
        </select>
      </div>

      {selectedChar && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8, marginBottom: 14 }}>
            {OUTFIT_SLOTS.map(slot => (
              <SlotPicker key={slot.id} slot={slot} charItems={charItems} value={slots[slot.id] || ''} onChange={setSlot} tabColor={tabColor} />
            ))}
          </div>

          <div className="field" style={{ marginBottom: 8 }}>
            <label>Additional notes (underwear, base layer, etc.)</label>
            <textarea value={slots._notes || ''} onChange={e => setSlot('_notes', e.target.value)} rows={2}
              placeholder="e.g. off-white linen shift underneath, hair braided..."
              style={{ width: '100%', fontSize: '0.85em', padding: '6px 8px', background: 'var(--sf)', border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', padding: '10px 0', borderTop: '1px solid var(--brd)' }}>
            <div className="field" style={{ flex: 1, minWidth: 160, margin: 0 }}>
              <label>Snapshot name</label>
              <input value={snapshotName} onChange={e => setSnapshotName(e.target.value)} placeholder="e.g. Lila at Book 1 opening" />
            </div>
            <div className="field" style={{ flex: 1, minWidth: 160, margin: 0 }}>
              <label>Link to scene/event (optional)</label>
              <input value={linkedScene} onChange={e => setLinkedScene(e.target.value)} placeholder="e.g. Ch. 1 - Barn power manifestation" />
            </div>
            <button className="btn btn-primary btn-sm" style={{ background: tabColor, alignSelf: 'flex-end' }} onClick={saveSnapshot} disabled={!snapshotName.trim()}>
              Save Snapshot
            </button>
          </div>
        </>
      )}
    </div>
  )
}
