import GenericListTab from '../components/common/GenericListTab'
import { TAB_RAINBOW } from '../constants'

const Q_FIELDS = [
  { k: 'name', l: 'Question', t: 'text', r: true },
  { k: 'related_topic', l: 'Topic', t: 'text' },
  { k: 'priority', l: 'Priority', t: 'sel', o: ['', 'High', 'Medium', 'Low'] },
  { k: 'session_raised', l: 'Session Raised', t: 'text' },
  { k: 'detail', l: 'Detail', t: 'ta' },
]

export default function Questions({ db, navSearch }) {
  return (
    <GenericListTab
      catKey="questions"
      color={TAB_RAINBOW.questions}
      icon="❓"
      label="Open Questions"
      fields={Q_FIELDS}
      db={db}
      navSearch={navSearch}
      entityKey="questions"
      tabColor={TAB_RAINBOW.questions}
    />
  )
}
