import { Link, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ReportItem from './pages/ReportItem';
import Browse from './pages/Browse';
import ItemDetail from './pages/ItemDetail';
import Matches from './pages/Matches';
import Claims from './pages/Claims';
import ClaimDetail from './pages/ClaimDetail';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import AdminDashboard from './pages/admin/AdminDashboard';

const P = ProtectedRoute;

function NotFound() {
  return (
    <div className="page narrow empty">
      <h1>This page is missing</h1>
      <p>The link may be old, or the report was removed.</p>
      <Link to="/" className="btn btn-primary">Go to the start page</Link>
    </div>
  );
}

export default function App() {
  return (
    <>
      <Navbar />
      <main className="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<P><Dashboard /></P>} />
          <Route path="/report/:type" element={<P><ReportItem /></P>} />
          <Route path="/edit/:type/:id" element={<P><ReportItem /></P>} />
          <Route path="/browse" element={<P><Browse /></P>} />
          <Route path="/items/:type/:id" element={<P><ItemDetail /></P>} />
          <Route path="/lost/:id/matches" element={<P><Matches /></P>} />
          <Route path="/claims" element={<P><Claims /></P>} />
          <Route path="/claims/:id" element={<P><ClaimDetail /></P>} />
          <Route path="/notifications" element={<P><Notifications /></P>} />
          <Route path="/profile" element={<P><Profile /></P>} />
          <Route path="/admin" element={<P admin><AdminDashboard /></P>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </>
  );
}
