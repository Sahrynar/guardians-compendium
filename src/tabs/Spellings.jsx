import GenericListTab from '../components/common/GenericListTab'

const SP_FIELDS = [
  { k: 'name',       l: 'Term',       t: 'text', r: true },
  { k: 'working',    l: 'Working',    t: 'text' },
  { k: 'alternates', l: 'Alternates', t: 'text' },
  { k: 'detail',     l: 'Notes',      t: 'ta' },
]

const SP_FILTERS = [
  { key: 'status', label: 'Status', options: [
    { value: 'locked', label: 'Locked' },
    { value: 'provisional', label: 'Provisional' },
    { value: 'open', label: 'Open' },
  ]},
]

export default function Spellings({ db, navSearch }) {
  return (
    <GenericListTab
      catKey="spellings" color="#ff69b4" icon="✎"
      label="Spellings" fields={SP_FIELDS} db={db}
      navSearch={navSearch} extraFilters={SP_FILTERS}
    />
  )
}
