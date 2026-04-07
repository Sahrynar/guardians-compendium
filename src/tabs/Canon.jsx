import GenericListTab from '../components/common/GenericListTab'
import { TAB_RAINBOW } from '../constants'

const CANON_FIELDS = [
  { k: 'name',    l: 'Decision', t: 'text', r: true },
  { k: 'session', l: 'Session',  t: 'text' },
  { k: 'detail',  l: 'Detail',   t: 'ta' },
]

export default function Canon({ db, rainbowOn, colDivider }) {
  return (
    <GenericListTab
      catKey="canon" color={TAB_RAINBOW.canon} icon="✦"
      label="Canon Decisions" fields={CANON_FIELDS} db={db}
      rainbowOn={rainbowOn} colDivider={colDivider}
    />
  )
}
