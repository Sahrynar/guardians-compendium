import GenericListTab from '../components/common/GenericListTab'

const Q_FIELDS = [
  { k: 'name',           l: 'Question',       t: 'text', r: true },
  { k: 'related_topic',  l: 'Topic',          t: 'text' },
  { k: 'priority',       l: 'Priority',       t: 'sel', o: ['','High','Medium','Low'] },
  { k: 'session_raised', l: 'Session Raised', t: 'text' },
  { k: 'detail',         l: 'Detail',         t: 'ta' },
]

export default function Questions({ db }) {
  return (
    <GenericListTab
      catKey="questions" color="var(--cq)" icon="❓"
      label="Open Questions" fields={Q_FIELDS} db={db}
    />
  )
}
