import GenericListTab from '../components/common/GenericListTab'
import { TAB_RAINBOW } from '../constants'

const SP_FIELDS = [
  { k: 'name',       l: 'Term',       t: 'text', r: true },
  { k: 'working',    l: 'Working',    t: 'text' },
  { k: 'alternates', l: 'Alternates', t: 'text' },
  { k: 'detail',     l: 'Notes',      t: 'ta' },
]

export default function Spellings({ db, rainbowOn, colDivider }) {
  return (
    <GenericListTab
      catKey="spellings" color={TAB_RAINBOW.spellings} icon="✎"
      label="Spellings" fields={SP_FIELDS} db={db}
      rainbowOn={rainbowOn} colDivider={colDivider}
    />
  )
}
