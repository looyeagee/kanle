import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import HomePage from "@/pages/HomePage";
import ArticlePage from "@/pages/ArticlePage";
import LoginPage from "@/pages/admin/LoginPage";
import AdminLayout from "@/pages/admin/AdminLayout";
import MomentsPage from "@/pages/admin/MomentsPage";
import ArticlesPage from "@/pages/admin/ArticlesPage";
import ArticleEditorPage from "@/pages/admin/ArticleEditorPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/articles/:id" element={<ArticlePage />} />
        <Route path="/admin/login" element={<LoginPage />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="moments" replace />} />
          <Route path="moments" element={<MomentsPage />} />
          <Route path="articles" element={<ArticlesPage />} />
          <Route path="articles/new" element={<ArticleEditorPage />} />
          <Route path="articles/:id" element={<ArticleEditorPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
