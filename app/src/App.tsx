import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import PlaygroundPage from './pages/PlaygroundPage';
import MisspellingsPage from './pages/MisspellingsPage';
import LearnPage from './pages/LearnPage';
import OriginsPage from './pages/OriginsPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<PlaygroundPage />} />
        <Route path="confusables" element={<MisspellingsPage />} />
        <Route path="learn" element={<LearnPage />} />
        <Route path="origins" element={<OriginsPage />} />
      </Route>
    </Routes>
  );
}
