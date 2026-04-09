import GenericListTab from '../components/common/GenericListTab'

const WORLD_FIELDS = [
  { k: 'name',     l: 'Topic',    t: 'text', r: true },
  { k: 'subtopic', l: 'Subtopic', t: 'text' },
  { k: 'detail',   l: 'Detail',   t: 'ta' },
]

const WORLD_FILTERS = [
  { key: 'status', label: 'Status', options: [
    { value: 'locked', label: 'Locked' },
    { value: 'provisional', label: 'Provisional' },
    { value: 'open', label: 'Open' },
    { value: 'exploratory', label: 'Exploratory' },
  ]},
]

export default function World({ db, navSearch }) {
  return (
    <GenericListTab
      catKey="world" color="#ff8c00" icon="🌐"
      label="World Entries" fields={WORLD_FIELDS} db={db}
      navSearch={navSearch} extraFilters={WORLD_FILTERS}
    />
  )
}
