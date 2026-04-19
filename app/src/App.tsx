import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import PlaygroundPage from './pages/PlaygroundPage';
import LearnPage from './pages/LearnPage';
import HistoryPage from './pages/HistoryPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<PlaygroundPage />} />
        <Route path="learn" element={<LearnPage />} />
        <Route path="history" element={<HistoryPage />} />
      </Route>
    </Routes>
  );
}
