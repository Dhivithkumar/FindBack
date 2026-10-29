import { Link } from 'react-router-dom';
import { imgUrl } from '../api';
import { fmtDate, tagNo } from '../utils/format';
import StatusBadge from './StatusBadge';

// A report drawn as a crafted luggage tag: yellow for lost, mint for found
export default function ItemTag({ item, type, children }) {
  const kind = type || item.type;
  const date = kind === 'lost' ? item.lostAt : item.foundAt;

  return (
    <article className={`tag tag-${kind}`}>
      <span className="tag-string" aria-hidden="true" />
      <span className="tag-hole" aria-hidden="true">
        <span className="tag-grommet" />
      </span>
      <Link to={`/items/${kind}/${item._id}`} className="tag-link">
        <div className="tag-head">
          <span className="tag-kind">{kind === 'lost' ? 'LOST' : 'FOUND'}</span>
          <span className="tag-no">#{tagNo(item._id)}</span>
        </div>
        <div className="tag-photo">
          {item.image ? (
            <img src={imgUrl(item.image)} alt={item.itemName} loading="lazy" decoding="async" />
          ) : (
            <span className="tag-photo-empty" aria-hidden="true">{item.itemName?.[0]?.toUpperCase()}</span>
          )}
        </div>
        <h3 className="tag-title">{item.itemName}</h3>
        <dl className="tag-meta">
          <div>
            <dt>{kind === 'lost' ? 'Last seen:' : 'Found at:'}</dt>
            <dd>{item.location}</dd>
          </div>
          <div>
            <dt>Date:</dt>
            <dd>{fmtDate(date)}</dd>
          </div>
        </dl>
        <div className="tag-foot">
          <span className="tag-cat">{item.category?.name}</span>
          <StatusBadge status={item.status} />
        </div>
      </Link>
      {children && <div className="tag-actions">{children}</div>}
    </article>
  );
}
