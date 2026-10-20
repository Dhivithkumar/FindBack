import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errMsg } from '../api';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/Loading';
import Notice from '../components/Notice';
import { timeAgo } from '../utils/format';

const TYPE_LABEL = {
  match: 'Possible match',
  claim_new: 'New claim',
  claim_approved: 'Claim approved',
  claim_rejected: 'Claim rejected',
  claim_withdrawn: 'Claim withdrawn',
  returned: 'Returned',
  disputed: 'Dispute',
  flagged: 'Flagged report',
  system: 'Update',
};

// Module 7: in-app notifications
export default function Notifications() {
  const { refreshUnread } = useAuth();
  const navigate = useNavigate();
  const [list, setList] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get('/notifications').then((r) => setList(r.data.notifications)).catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); }, []);

  const open = async (n) => {
    if (!n.read) {
      await api.patch(`/notifications/${n._id}/read`).catch(() => {});
      refreshUnread();
    }
    if (n.link) navigate(n.link);
    else load();
  };

  const markAll = async () => {
    await api.patch('/notifications/read-all');
    refreshUnread();
    load();
  };

  const remove = async (n) => {
    await api.delete(`/notifications/${n._id}`);
    refreshUnread();
    setList((l) => l.filter((x) => x._id !== n._id));
  };

  if (error) return <div className="page"><Notice kind="error">{error}</Notice></div>;
  if (!list) return <Loading />;
  const unread = list.filter((n) => !n.read).length;

  return (
    <div className="page narrow-wide">
      <header className="page-head">
        <div>
          <h1>Notifications</h1>
          <p className="muted">{unread ? `${unread} unread` : 'You are all caught up.'}</p>
        </div>
        {unread > 0 && <button className="btn btn-ghost" onClick={markAll}>Mark all as read</button>}
      </header>

      {list.length === 0 ? (
        <div className="empty"><p>Nothing yet. Matches, claim decisions and returns will show up here.</p></div>
      ) : (
        <ul className="notif-list">
          {list.map((n) => (
            <li key={n._id} className={`notif ${n.read ? '' : 'unread'} notif-${n.type}`}>
              <button className="notif-main" onClick={() => open(n)}>
                <span className="notif-type">{TYPE_LABEL[n.type] || 'Update'}</span>
                <span className="notif-msg">{n.message}</span>
                <span className="muted small">{timeAgo(n.createdAt)}</span>
              </button>
              <button className="notif-del" aria-label="Delete notification" onClick={() => remove(n)}>×</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
