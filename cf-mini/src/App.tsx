import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useEffect } from "react";
import HomePage from "@/pages/HomePage";
import ArticlePage from "@/pages/ArticlePage";
import NotFoundPage from "@/pages/NotFoundPage";
import LoginPage from "@/pages/admin/LoginPage";
import AdminLayout from "@/pages/admin/AdminLayout";
import MomentsPage from "@/pages/admin/MomentsPage";
import ArticlesPage from "@/pages/admin/ArticlesPage";
import ArticleEditorPage from "@/pages/admin/ArticleEditorPage";
import SettingsPage from "@/pages/admin/SettingsPage";
import { refreshGithubUser } from "@/lib/github-session";

export default function App() {
  useEffect(() => {
    void refreshGithubUser();
  }, []);
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
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage compact />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
