import GenericListTab from '../components/common/GenericListTab'
import { TAB_RAINBOW } from '../constants'

const CANON_FIELDS = [
  { k: 'name', l: 'Decision', t: 'text', r: true },
  { k: 'session', l: 'Session', t: 'text' },
  { k: 'detail', l: 'Detail', t: 'ta' },
]

export default function Canon({ db, navSearch }) {
  return (
    <GenericListTab
      catKey="canon"
      color={TAB_RAINBOW.canon}
      icon="✦"
      label="Canon Decisions"
      fields={CANON_FIELDS}
      db={db}
      navSearch={navSearch}
      entityKey="canon"
      tabColor={TAB_RAINBOW.canon}
    />
  )
}
