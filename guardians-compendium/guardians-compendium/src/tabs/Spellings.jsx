import GenericListTab from '../components/common/GenericListTab'

const SP_FIELDS = [
  { k: 'name',       l: 'Term',       t: 'text', r: true },
  { k: 'working',    l: 'Working',    t: 'text' },
  { k: 'alternates', l: 'Alternates', t: 'text' },
  { k: 'detail',     l: 'Notes',      t: 'ta' },
]

export default function Spellings({ db }) {
  return (
    <GenericListTab
      catKey="spellings" color="var(--csp)" icon="✎"
      label="Spellings" fields={SP_FIELDS} db={db}
    />
  )
}
