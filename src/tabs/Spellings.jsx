import GenericListTab from '../components/common/GenericListTab'

const SP_FIELDS = [
  { k: 'name', l: 'Term', t: 'text', r: true },
  { k: 'working', l: 'Working', t: 'text' },
  { k: 'alternates', l: 'Alternates', t: 'text' },
  { k: 'detail', l: 'Notes', t: 'ta' },
]

export default function Spellings({ db, navSearch }) {
  return (
    <GenericListTab
      catKey="spellings"
      color="#ff69b4"
      icon="✎"
      label="Spellings"
      fields={SP_FIELDS}
      db={db}
      navSearch={navSearch}
      getJumpName={e => e.word || e.name}
    />
  )
}
