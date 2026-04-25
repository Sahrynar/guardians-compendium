export default function Breadcrumb({ crumbs }) {
  if (!crumbs || crumbs.length === 0) return null
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
        padding: '4px 14px',
        fontSize: '0.77em',
        color: 'var(--dim)',
        borderBottom: '1px solid var(--brd)',
        background: 'var(--sf)',
      }}
    >
      {crumbs.map((c, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {i > 0 && <span style={{ opacity: 0.5 }}>›</span>}
          {c.icon && <span>{c.icon}</span>}
          <span style={{ color: i === crumbs.length - 1 ? '#fff' : 'var(--dim)', fontWeight: i === crumbs.length - 1 ? 600 : 400 }}>
            {c.label}
          </span>
        </span>
      ))}
    </div>
  )
}
