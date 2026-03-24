import GenericListTab from '../components/common/GenericListTab'

const WORLD_FIELDS = [
  { k: 'name',     l: 'Topic',    t: 'text', r: true },
  { k: 'subtopic', l: 'Subtopic', t: 'text' },
  { k: 'detail',   l: 'Detail',   t: 'ta' },
]

export default function World({ db }) {
  return (
    <GenericListTab
      catKey="world" color="var(--cw)" icon="🌐"
      label="World Entries" fields={WORLD_FIELDS} db={db}
    />
  )
}
