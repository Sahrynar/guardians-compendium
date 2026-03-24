import GenericListTab from '../components/common/GenericListTab'

const CANON_FIELDS = [
  { k: 'name',    l: 'Decision', t: 'text', r: true },
  { k: 'session', l: 'Session',  t: 'text' },
  { k: 'detail',  l: 'Detail',   t: 'ta' },
]

export default function Canon({ db }) {
  return (
    <GenericListTab
      catKey="canon" color="var(--ccn)" icon="✦"
      label="Canon Decisions" fields={CANON_FIELDS} db={db}
    />
  )
}
