import GenericListTab from '../components/common/GenericListTab'

const CANON_FIELDS = [
  { k: 'name',    l: 'Decision', t: 'text', r: true },
  { k: 'session', l: 'Session',  t: 'text' },
  { k: 'detail',  l: 'Detail',   t: 'ta' },
]

const CANON_FILTERS = [
  { key: 'status', label: 'Status', options: [
    { value: 'locked', label: 'Locked' },
    { value: 'provisional', label: 'Provisional' },
    { value: 'open', label: 'Open' },
  ]},
]

export default function Canon({ db, navSearch }) {
  return (
    <GenericListTab
      catKey="canon" color="#ff48c4" icon="✦"
      label="Canon Decisions" fields={CANON_FIELDS} db={db}
      navSearch={navSearch} extraFilters={CANON_FILTERS}
    />
  )
}
