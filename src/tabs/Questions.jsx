import GenericListTab from '../components/common/GenericListTab'

const Q_FIELDS = [
  { k: 'name',           l: 'Question',       t: 'text', r: true },
  { k: 'related_topic',  l: 'Topic',          t: 'text' },
  { k: 'priority',       l: 'Priority',       t: 'sel', o: ['','High','Medium','Low'] },
  { k: 'session_raised', l: 'Session Raised', t: 'text' },
  { k: 'detail',         l: 'Detail',         t: 'ta' },
]

const Q_FILTERS = [
  { key: 'priority', label: 'Priority', options: [
    { value: 'High', label: '🔴 High' },
    { value: 'Medium', label: '🟡 Medium' },
    { value: 'Low', label: '🟢 Low' },
  ]},
  { key: 'status', label: 'Status', options: [
    { value: 'open', label: 'Open' },
    { value: 'locked', label: 'Locked' },
    { value: 'provisional', label: 'Provisional' },
  ]},
]

export default function Questions({ db, navSearch }) {
  return (
    <GenericListTab
      catKey="questions" color="#c77dff" icon="❓"
      label="Open Questions" fields={Q_FIELDS} db={db}
      navSearch={navSearch} extraFilters={Q_FILTERS}
    />
  )
}
