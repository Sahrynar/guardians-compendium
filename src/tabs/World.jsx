import GenericListTab from '../components/common/GenericListTab'
import { TAB_RAINBOW } from '../constants'

const WORLD_FIELDS = [
  { k: 'name',     l: 'Topic',    t: 'text', r: true },
  { k: 'subtopic', l: 'Subtopic', t: 'text' },
  { k: 'detail',   l: 'Detail',   t: 'ta' },
]

export default function World({ db, rainbowOn, colDivider }) {
  return (
    <GenericListTab
      catKey="world" color={TAB_RAINBOW.world} icon="🌐"
      label="World Entries" fields={WORLD_FIELDS} db={db}
      rainbowOn={rainbowOn} colDivider={colDivider}
    />
  )
}
